import { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'

// ─── CAR BUILDER ─────────────────────────────────────────────────────────────
function buildCar(envMap) {
  const g = new THREE.Group()

  const body = new THREE.MeshPhysicalMaterial({
    color: 0x080808, metalness: 0.95, roughness: 0.06,
    clearcoat: 1, clearcoatRoughness: 0.02,
    envMap, envMapIntensity: 3
  })
  const chrome = new THREE.MeshPhysicalMaterial({
    color: 0xb0bec5, metalness: 1, roughness: 0.04,
    envMap, envMapIntensity: 3
  })
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x0d1a2a, transmission: 0.6, transparent: true,
    opacity: 0.5, roughness: 0, metalness: 0,
    envMap, envMapIntensity: 1.5
  })
  const rubber = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.95 })
  const rim = new THREE.MeshPhysicalMaterial({
    color: 0x9aabb5, metalness: 1, roughness: 0.08,
    envMap, envMapIntensity: 2.5
  })
  const headlight = new THREE.MeshStandardMaterial({
    color: 0xfff8e8, emissive: 0xffa030, emissiveIntensity: 3, roughness: 0
  })
  const taillight = new THREE.MeshStandardMaterial({
    color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 4, roughness: 0
  })

  const add = (geo, mat, x=0, y=0, z=0, rx=0, ry=0, rz=0, sx=1, sy=1, sz=1) => {
    const m = new THREE.Mesh(geo, mat)
    m.position.set(x, y, z)
    m.rotation.set(rx, ry, rz)
    m.scale.set(sx, sy, sz)
    m.castShadow = true
    m.receiveShadow = true
    g.add(m)
    return m
  }

  // ── BODY ──────────────────────────────────────────────────────────────────
  // Lower body slab
  add(new THREE.BoxGeometry(4.8, 0.5, 2.0), body, 0, 0.42)
  // Upper cabin — tapered with ExtrudeGeometry side profile
  const profile = new THREE.Shape()
  profile.moveTo(-1.8, 0)
  profile.bezierCurveTo(-2.1, 0, -2.3, 0.7, -1.9, 1.1)
  profile.lineTo(-1.0, 1.45)
  profile.lineTo(0.75, 1.45)
  profile.bezierCurveTo(1.3, 1.45, 1.8, 1.0, 2.0, 0)
  profile.lineTo(-1.8, 0)
  const cabin = new THREE.Mesh(
    new THREE.ExtrudeGeometry(profile, { depth: 1.82, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2 }),
    body
  )
  cabin.position.set(-0.1, 0.67, -0.91)
  cabin.castShadow = true
  g.add(cabin)

  // Hood taper
  const hoodPts = [new THREE.Vector3(2.0,0.67,0), new THREE.Vector3(2.5,0.74,0), new THREE.Vector3(2.52,0.7,0), new THREE.Vector3(2.1,0.66,0)]
  const hoodCurve = new THREE.CatmullRomCurve3(hoodPts)
  ;[-0.92, 0.92].forEach(z => {
    const h = new THREE.Mesh(new THREE.TubeGeometry(hoodCurve, 8, 0.03, 6), chrome)
    h.position.z = z; g.add(h)
  })

  // Roofline chrome strip
  const roofPts = [new THREE.Vector3(-1.85,1.46,0), new THREE.Vector3(-0.5,1.5,0), new THREE.Vector3(0.7,1.5,0), new THREE.Vector3(1.95,1.0,0)]
  ;[-0.88, 0.88].forEach(z => {
    const r = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(roofPts), 16, 0.012, 6), chrome)
    r.position.z = z; g.add(r)
  })

  // Side skirts
  ;[-1.02, 1.02].forEach(z => add(new THREE.BoxGeometry(4.5, 0.09, 0.16), chrome, 0, 0.15, z))

  // ── WINDOWS ───────────────────────────────────────────────────────────────
  // Windshield
  const ws = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 1.08), glass)
  ws.position.set(1.7, 1.28, 0); ws.rotation.set(0, Math.PI/2, -0.38); g.add(ws)
  // Rear window
  const rw = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 0.95), glass)
  rw.position.set(-1.85, 1.24, 0); rw.rotation.set(0, Math.PI/2, 0.34); g.add(rw)
  // Side windows
  ;[-1, 0].forEach(i => {
    const sw = new THREE.Mesh(new THREE.PlaneGeometry(0.88, 0.65), glass)
    sw.position.set(0.28 + i * 0.88, 1.3, 0.92); g.add(sw)
  })

  // ── WHEELS ────────────────────────────────────────────────────────────────
  const wheelPos = [[1.58, 0, 1.06], [1.58, 0, -1.06], [-1.5, 0, 1.06], [-1.5, 0, -1.06]]
  wheelPos.forEach(([x, y, z]) => {
    const wg = new THREE.Group()
    wg.add(Object.assign(new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.15, 16, 48), rubber), { castShadow: true }))
    const disk = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.05, 24), rim)
    disk.rotation.z = Math.PI/2; wg.add(disk)
    for (let s = 0; s < 5; s++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.66, 0.038), rim)
      spoke.rotation.x = Math.PI/2; spoke.rotation.z = (s/5)*Math.PI*2; wg.add(spoke)
    }
    wg.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.14, 12), chrome), { rotation: { x: 0, y: 0, z: Math.PI/2 } }))
    // Brake disc
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.04, 20), new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.7 }))
    disc.rotation.z = Math.PI/2; wg.add(disc)
    wg.position.set(x, y, z); wg.castShadow = true
    g.add(wg)
  })

  // ── LIGHTS ────────────────────────────────────────────────────────────────
  ;[-0.52, 0.52].forEach(z => {
    // Headlight housing
    add(new THREE.BoxGeometry(0.08, 0.18, 0.3), headlight, 2.46, 0.72, z)
    add(new THREE.CylinderGeometry(0.07, 0.09, 0.06, 10), chrome, 2.47, 0.72, z, 0, 0, Math.PI/2)
  })
  // LED daytime running strip
  add(new THREE.BoxGeometry(0.04, 0.04, 1.05), headlight, 2.48, 0.58)
  // Tail lights
  ;[-0.48, 0.48].forEach(z => add(new THREE.BoxGeometry(0.05, 0.2, 0.3), taillight, -2.42, 0.78, z))
  add(new THREE.BoxGeometry(0.04, 0.04, 1.0), taillight, -2.43, 0.7)

  // Grille
  add(new THREE.BoxGeometry(0.06, 0.24, 0.88), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 }), 2.46, 0.5)
  add(new THREE.BoxGeometry(0.04, 0.28, 0.95), chrome, 2.45, 0.5)

  // Exhaust pipes
  ;[-0.28, 0.28].forEach(z => {
    add(new THREE.CylinderGeometry(0.055, 0.055, 0.14, 12), chrome, -2.44, 0.22, z, 0, 0, Math.PI/2)
  })

  // Side mirrors
  ;[1.1, -1.1].forEach(z => add(new THREE.BoxGeometry(0.2, 0.11, 0.055), body, 1.5, 1.08, z))

  // Undercarriage
  add(new THREE.BoxGeometry(4.4, 0.08, 1.82), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 }), 0, 0.06)

  g.position.y = 0.43
  return g
}

// ─── CAMERA WAYPOINTS ─────────────────────────────────────────────────────────
// Each waypoint: [pos, target, lightColor, bloomStr]
const WAYPOINTS = [
  { pos: [6.5, 2.2, 3.8],   target: [0, 0.8, 0], light: 0xfff0d0, bloom: 0.9, label: null },
  { pos: [0,   2.8, 6.5],   target: [0, 0.6, 0], light: 0xfff0d0, bloom: 1.1, label: 'PAINT CORRECTION' },
  { pos: [-6,  1.8, 3.2],   target: [0, 0.8, 0], light: 0x4488ff, bloom: 1.3, label: 'CERAMIC COATING' },
  { pos: [-6.5, 1.2, -2.5], target: [0, 0.5, 0], light: 0xc9a84c, bloom: 1.0, label: 'PAINT PROTECTION FILM' },
  { pos: [0,   5.5, 0.1],   target: [0, 0.4, 0], light: 0xffffff, bloom: 0.8, label: 'INTERIOR DETAIL' },
  { pos: [4.5, 1.4, -4.5],  target: [0, 0.8, 0], light: 0xff4422, bloom: 1.5, label: null },
]

const SCENES = [
  { heading: 'THE ART\nOF THE\nPERFECT\nFINISH.', sub: 'Scroll to explore' },
  { heading: 'ZERO\nDEFECTS.', sub: 'Single & multi-stage paint correction' },
  { heading: '9H\nHARDNESS.', sub: '5-year ceramic coating protection' },
  { heading: 'INVISIBLE\nSHIELD.', sub: 'Self-healing paint protection film' },
  { heading: 'PURE\nINTERIOR.', sub: 'Deep clean · Leather · Odour treatment' },
  { heading: 'BOOK\nNOW.', sub: 'Transform your vehicle today' },
]

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function AppCar3() {
  const scrollRef = useRef(null)
  const mountRef = useRef(null)
  const sceneIndex = useRef(0)
  const [currentScene, setCurrentScene] = useState(0)
  const [showBook, setShowBook] = useState(false)

  const { scrollYProgress } = useScroll({ target: scrollRef })

  useEffect(() => {
    const unsub = scrollYProgress.on('change', v => {
      const idx = Math.min(Math.floor(v * WAYPOINTS.length), WAYPOINTS.length - 1)
      if (idx !== sceneIndex.current) {
        sceneIndex.current = idx
        setCurrentScene(idx)
        if (idx === WAYPOINTS.length - 1) setShowBook(true)
        else setShowBook(false)
      }
    })
    return unsub
  }, [scrollYProgress])

  useEffect(() => {
    const el = mountRef.current
    if (!el) return
    const W = el.clientWidth, H = el.clientHeight

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15
    renderer.outputColorSpace = THREE.SRGBColorSpace
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x000000)
    scene.fog = new THREE.FogExp2(0x000000, 0.032)

    const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100)
    camera.position.set(...WAYPOINTS[0].pos)
    camera.lookAt(...WAYPOINTS[0].target)

    // Post-processing
    const composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))
    const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.9, 0.5, 0.72)
    composer.addPass(bloom)

    // Env map
    const pmrem = new THREE.PMREMGenerator(renderer)
    const envScene = new THREE.Scene()
    envScene.add(Object.assign(new THREE.Mesh(
      new THREE.SphereGeometry(50, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        uniforms: { top: { value: new THREE.Color(0x0a1830) }, bot: { value: new THREE.Color(0x000000) } },
        vertexShader: `varying vec3 v; void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
        fragmentShader: `varying vec3 v;uniform vec3 top,bot;void main(){gl_FragColor=vec4(mix(bot,top,clamp((v.y+50.)/100.,0.,1.)),1.);}`
      })
    )))
    const envMap = pmrem.fromScene(envScene).texture

    // Car
    const car = buildCar(envMap)
    scene.add(car)

    // Floor
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x030303, roughness: 0.1, metalness: 0.9 })
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), floorMat)
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor)
    // Reflection circle under car
    const reflCircle = new THREE.Mesh(
      new THREE.CircleGeometry(3.5, 64),
      new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.05, metalness: 0.95, envMap, envMapIntensity: 1.5 })
    )
    reflCircle.rotation.x = -Math.PI / 2; reflCircle.position.y = 0.001; scene.add(reflCircle)

    // Lights
    scene.add(new THREE.AmbientLight(0x0a1020, 0.5))
    const key = new THREE.DirectionalLight(0xfff0d0, 3.0)
    key.position.set(5, 10, 4); key.castShadow = true
    key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.002
    key.shadow.camera.left = -8; key.shadow.camera.right = 8
    key.shadow.camera.top = 6; key.shadow.camera.bottom = -4
    scene.add(key)
    const fill = new THREE.DirectionalLight(0x2244cc, 1.0)
    fill.position.set(-6, 3, -4); scene.add(fill)
    const rim = new THREE.DirectionalLight(0x88aaff, 1.8)
    rim.position.set(0, 5, -10); scene.add(rim)
    const accent = new THREE.PointLight(0xc9a84c, 3, 8)
    accent.position.set(0, 0.3, 0); scene.add(accent)

    // Particles
    const pCount = 500
    const pPos = new Float32Array(pCount * 3)
    for (let i = 0; i < pCount; i++) {
      pPos[i*3] = (Math.random()-0.5)*22
      pPos[i*3+1] = Math.random()*7
      pPos[i*3+2] = (Math.random()-0.5)*14
    }
    const pGeo = new THREE.BufferGeometry()
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3))
    scene.add(new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0xc9a84c, size: 0.02, transparent: true, opacity: 0.4 })))

    // Camera lerp targets
    const camPos = new THREE.Vector3(...WAYPOINTS[0].pos)
    const camTarget = new THREE.Vector3(...WAYPOINTS[0].target)
    const tPos = new THREE.Vector3()
    const tTarget = new THREE.Vector3()

    const clock = new THREE.Clock()
    let raf

    const getScrollProgress = () => {
      const el = scrollRef.current
      if (!el) return 0
      const max = el.scrollHeight - window.innerHeight
      return Math.max(0, Math.min(1, window.scrollY / max))
    }

    function animate() {
      raf = requestAnimationFrame(animate)
      const t = clock.getElapsedTime()
      const scroll = getScrollProgress()

      // Determine which two waypoints we're between
      const raw = scroll * (WAYPOINTS.length - 1)
      const idxA = Math.floor(raw)
      const idxB = Math.min(idxA + 1, WAYPOINTS.length - 1)
      const frac = raw - idxA
      const ease = frac < 0.5 ? 2*frac*frac : -1+(4-2*frac)*frac // smooth step

      const wA = WAYPOINTS[idxA], wB = WAYPOINTS[idxB]
      tPos.set(
        wA.pos[0] + (wB.pos[0] - wA.pos[0]) * ease,
        wA.pos[1] + (wB.pos[1] - wA.pos[1]) * ease,
        wA.pos[2] + (wB.pos[2] - wA.pos[2]) * ease,
      )
      tTarget.set(
        wA.target[0] + (wB.target[0] - wA.target[0]) * ease,
        wA.target[1] + (wB.target[1] - wA.target[1]) * ease,
        wA.target[2] + (wB.target[2] - wA.target[2]) * ease,
      )

      // Gentle breathing motion on top of scripted path
      tPos.x += Math.sin(t * 0.4) * 0.06
      tPos.y += Math.sin(t * 0.3) * 0.04

      camPos.lerp(tPos, 0.04)
      camTarget.lerp(tTarget, 0.04)
      camera.position.copy(camPos)
      camera.lookAt(camTarget)

      // Lerp bloom
      const targetBloom = wA.bloom + (wB.bloom - wA.bloom) * ease
      bloom.strength += (targetBloom - bloom.strength) * 0.05

      // Wheels slow spin
      car.children.forEach((c, i) => { if (i >= 4 && i <= 7) c.rotation.x = t * 0.6 })

      // Undercar accent pulse
      accent.intensity = 2.5 + Math.sin(t * 2.5) * 1.0
      accent.color.setHSL(0.1 + Math.sin(t * 0.15) * 0.05, 0.8, 0.5)

      composer.render()
    }
    animate()

    const onResize = () => {
      const w = el.clientWidth, h = el.clientHeight
      renderer.setSize(w, h); composer.setSize(w, h)
      camera.aspect = w/h; camera.updateProjectionMatrix()
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
    }
  }, [])

  const scene = SCENES[currentScene] || SCENES[0]

  return (
    <div ref={scrollRef} style={{ height: `${WAYPOINTS.length * 120}vh`, position: 'relative' }}>

      {/* ── STICKY 3D CANVAS ── */}
      <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden' }}>
        <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} />

        {/* Letterbox */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '6.5vh', background: '#000', zIndex: 10, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '6.5vh', background: '#000', zIndex: 10, pointerEvents: 'none' }} />

        {/* Vignette */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 4, pointerEvents: 'none', background: 'radial-gradient(ellipse 85% 85% at 50% 50%, transparent 30%, rgba(0,0,0,0.65) 100%)' }} />

        {/* Film grain */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 4, opacity: 0.025, pointerEvents: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`, backgroundSize: '256px' }} />

        {/* NAV */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20, padding: '1.5rem 2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: 'Inter,sans-serif', fontWeight: 900, fontSize: 16, color: '#fff', letterSpacing: '-0.02em' }}>
            VELVET<span style={{ color: 'rgba(201,168,76,0.9)' }}>.</span>
          </div>
          <a href="tel:08001234567" style={{ fontFamily: 'Inter,sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.85)', textDecoration: 'none', border: '1px solid rgba(201,168,76,0.35)', padding: '0.55rem 1.3rem' }}>
            Call Us
          </a>
        </div>

        {/* ── SCENE TEXT — switches per scroll phase ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentScene}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            style={{ position: 'absolute', inset: 0, zIndex: 8, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '0 5vw 14vh', pointerEvents: showBook ? 'all' : 'none' }}
          >
            {!showBook ? (
              <>
                {/* Service label */}
                {WAYPOINTS[currentScene].label && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(201,168,76,0.65)', letterSpacing: '0.35em', textTransform: 'uppercase', marginBottom: '1rem' }}
                  >
                    {WAYPOINTS[currentScene].label}
                  </motion.div>
                )}

                {/* Main heading */}
                <div style={{ overflow: 'hidden' }}>
                  {scene.heading.split('\n').map((line, i) => (
                    <div key={i} style={{ overflow: 'hidden' }}>
                      <motion.div
                        initial={{ y: '105%' }}
                        animate={{ y: '0%' }}
                        transition={{ duration: 0.9, delay: 0.05 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                        style={{
                          fontFamily: 'Inter,sans-serif',
                          fontSize: 'clamp(60px, 11vw, 160px)',
                          fontWeight: 900, lineHeight: 0.88, letterSpacing: '-0.04em',
                          color: i % 2 === 0 ? '#fff' : 'transparent',
                          WebkitTextStroke: i % 2 !== 0 ? '1.5px rgba(255,255,255,0.3)' : 'none',
                        }}
                      >{line}</motion.div>
                    </div>
                  ))}
                </div>

                {/* Divider + sub */}
                <motion.div initial={{ opacity: 0, scaleX: 0 }} animate={{ opacity: 1, scaleX: 1 }} transition={{ duration: 1, delay: 0.5 }}
                  style={{ width: 'clamp(100px, 15vw, 200px)', height: 1, background: 'linear-gradient(90deg, rgba(201,168,76,0.8), transparent)', margin: '2rem 0 1rem', transformOrigin: 'left' }} />
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.7 }}
                  style={{ fontFamily: 'Inter,sans-serif', fontSize: 'clamp(11px,1vw,13px)', color: 'rgba(180,200,220,0.5)', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 300 }}>
                  {scene.sub}
                </motion.p>
              </>
            ) : (
              /* ── FINAL SCENE: BOOK ── */
              <div style={{ maxWidth: 520 }}>
                <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.9, ease: [0.16,1,0.3,1] }}>
                  <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 'clamp(52px,9vw,120px)', fontWeight: 900, lineHeight: 0.88, letterSpacing: '-0.04em', color: '#fff', marginBottom: '2rem' }}>
                    BOOK<br /><span style={{ WebkitTextStroke: '1.5px rgba(201,168,76,0.6)', color: 'transparent' }}>NOW.</span>
                  </div>
                  <BookForm />
                </motion.div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Scroll progress bar */}
        <motion.div
          style={{
            position: 'absolute', bottom: '6.5vh', left: 0, right: 0, height: 1, zIndex: 15,
            background: 'rgba(255,255,255,0.05)',
            scaleX: scrollYProgress, transformOrigin: 'left'
          }}
        />
        <motion.div
          style={{
            position: 'absolute', bottom: '6.5vh', left: 0, height: 1, zIndex: 16,
            background: 'rgba(201,168,76,0.7)',
            width: '100%', scaleX: scrollYProgress, transformOrigin: 'left'
          }}
        />

        {/* HUD */}
        <div style={{ position: 'absolute', bottom: '8.5vh', right: '2.5vw', zIndex: 15, fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.15em' }}>
          {currentScene + 1} / {WAYPOINTS.length} · LIVE 3D
        </div>
      </div>
    </div>
  )
}

// ─── INLINE BOOKING FORM ──────────────────────────────────────────────────────
function BookForm() {
  const [sent, setSent] = useState(false)
  const s = { background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.85rem 1.1rem', color: '#fff', fontFamily: 'Inter,sans-serif', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box', backdropFilter: 'blur(8px)', transition: 'border-color 0.3s' }
  if (sent) return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      style={{ padding: '2rem', border: '1px solid rgba(201,168,76,0.4)', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
      <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 28, fontWeight: 900, color: '#c9a84c' }}>Received.</div>
      <p style={{ fontFamily: 'Inter,sans-serif', fontSize: 13, color: 'rgba(180,200,220,0.55)', fontWeight: 300, marginTop: 8 }}>We will contact you within 2 hours.</p>
    </motion.div>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
        <input placeholder="Name" style={s} onFocus={e=>e.target.style.borderColor='rgba(201,168,76,0.6)'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.1)'} />
        <input placeholder="Phone" style={s} onFocus={e=>e.target.style.borderColor='rgba(201,168,76,0.6)'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.1)'} />
      </div>
      <input placeholder="Vehicle (make · model · year)" style={s} onFocus={e=>e.target.style.borderColor='rgba(201,168,76,0.6)'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.1)'} />
      <select defaultValue="" style={{...s, color: 'rgba(255,255,255,0.45)'}}>
        <option value="" disabled>Service</option>
        <option>Paint Correction</option><option>Ceramic Coating</option>
        <option>PPF Wrap</option><option>Interior Detail</option><option>Full Package</option>
      </select>
      <motion.button whileHover={{ background: 'rgba(201,168,76,0.3)', borderColor: 'rgba(201,168,76,1)' }} whileTap={{ scale: 0.98 }}
        onClick={() => setSent(true)}
        style={{ padding: '1rem', border: '1px solid rgba(201,168,76,0.6)', background: 'rgba(201,168,76,0.1)', color: '#fff', fontFamily: 'Inter,sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.3s', backdropFilter: 'blur(8px)' }}>
        Submit Enquiry
      </motion.button>
    </div>
  )
}
