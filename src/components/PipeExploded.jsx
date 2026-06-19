import { useRef, useEffect } from 'react'
import { motion, useInView } from 'framer-motion'
import * as THREE from 'three'

const PARTS_DATA = [
  { label: 'Type L Copper Pipe', color: '#b87333', desc: '20-year lifespan, 250 PSI rated' },
  { label: 'Brass Compression Fittings', color: '#d4a853', desc: 'Lead-free, NSF/ANSI 61 certified' },
  { label: 'Full-Bore Ball Valve', color: '#9aacbd', desc: 'Stainless steel, 600 PSI WOG' },
  { label: 'PEX Extension Lines', color: '#c87941', desc: 'Flexible, freeze-resistant polymer' },
]

function buildEnvMap(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer)
  pmrem.compileEquirectangularShader()
  const scene = new THREE.Scene()
  // Sky gradient sphere
  const geo = new THREE.SphereGeometry(10, 32, 32)
  const mat = new THREE.MeshBasicMaterial({
    side: THREE.BackSide,
    vertexColors: true,
  })
  const colors = []
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i)
    const t = (y + 10) / 20
    colors.push(
      0.04 + t * 0.06,
      0.06 + t * 0.10,
      0.12 + t * 0.18,
    )
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  scene.add(new THREE.Mesh(geo, mat))
  const env = pmrem.fromScene(scene).texture
  pmrem.dispose()
  return env
}

export default function PipeExploded() {
  const mountRef = useRef(null)
  const animRef = useRef(null)
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.3 })

  useEffect(() => {
    const el = mountRef.current
    if (!el) return

    // ─── Renderer ────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(el.clientWidth, el.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.1
    renderer.outputColorSpace = THREE.SRGBColorSpace
    el.appendChild(renderer.domElement)

    // ─── Scene / Camera ──────────────────────────────────────────
    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x04080e, 0.045)

    const camera = new THREE.PerspectiveCamera(38, el.clientWidth / el.clientHeight, 0.1, 100)
    camera.position.set(0, 1.8, 10)
    camera.lookAt(0, 0.2, 0)

    // ─── Environment map ─────────────────────────────────────────
    const envMap = buildEnvMap(renderer)
    scene.environment = envMap

    // ─── Lighting ────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.25))

    const key = new THREE.DirectionalLight(0xfff5e0, 2.8)
    key.position.set(5, 9, 6)
    key.castShadow = true
    key.shadow.mapSize.set(2048, 2048)
    key.shadow.camera.near = 0.5
    key.shadow.camera.far = 30
    key.shadow.camera.left = -8
    key.shadow.camera.right = 8
    key.shadow.camera.top = 8
    key.shadow.camera.bottom = -8
    key.shadow.bias = -0.0005
    scene.add(key)

    const fill = new THREE.DirectionalLight(0xc8e0ff, 0.9)
    fill.position.set(-6, 3, 4)
    scene.add(fill)

    const rim = new THREE.DirectionalLight(0x4060ff, 0.6)
    rim.position.set(0, -3, -6)
    scene.add(rim)

    const orange = new THREE.PointLight(0xff6820, 1.4, 18)
    orange.position.set(4, -1, 3)
    scene.add(orange)

    const blue = new THREE.PointLight(0x2050ff, 1.2, 16)
    blue.position.set(-5, 4, 2)
    scene.add(blue)

    // ─── Materials ───────────────────────────────────────────────
    const copper = new THREE.MeshPhysicalMaterial({
      color: 0xc87941,
      metalness: 1.0,
      roughness: 0.28,
      clearcoat: 0.5,
      clearcoatRoughness: 0.15,
      envMapIntensity: 1.4,
    })

    const brass = new THREE.MeshPhysicalMaterial({
      color: 0xd4a030,
      metalness: 1.0,
      roughness: 0.22,
      clearcoat: 0.6,
      clearcoatRoughness: 0.1,
      envMapIntensity: 1.6,
    })

    const steel = new THREE.MeshPhysicalMaterial({
      color: 0xa8bcc8,
      metalness: 1.0,
      roughness: 0.12,
      clearcoat: 0.8,
      clearcoatRoughness: 0.05,
      envMapIntensity: 2.0,
    })

    const redHandle = new THREE.MeshPhysicalMaterial({
      color: 0xcc1800,
      metalness: 0.0,
      roughness: 0.45,
      clearcoat: 0.9,
      clearcoatRoughness: 0.1,
    })

    const darkMetal = new THREE.MeshPhysicalMaterial({
      color: 0x2a3340,
      metalness: 1.0,
      roughness: 0.35,
      envMapIntensity: 1.0,
    })

    const rubbGasket = new THREE.MeshStandardMaterial({
      color: 0x111111,
      metalness: 0.0,
      roughness: 0.95,
    })

    // ─── Geometry helpers ────────────────────────────────────────
    function tube(points, radius, segs = 40, radSegs = 24) {
      const curve = new THREE.CatmullRomCurve3(points)
      return new THREE.TubeGeometry(curve, segs, radius, radSegs, false)
    }

    function lathe(profile, segs = 48) {
      return new THREE.LatheGeometry(profile, segs)
    }

    function addMesh(geo, mat, pos, rot, castShadow = true) {
      const m = new THREE.Mesh(geo, mat)
      m.position.set(...pos)
      if (rot) m.rotation.set(...rot)
      m.castShadow = castShadow
      m.receiveShadow = true
      scene.add(m)
      return m
    }

    function threadRings(x, count, mat, dir = 1) {
      const group = new THREE.Group()
      for (let i = 0; i < count; i++) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.215, 0.018, 10, 32),
          mat
        )
        ring.rotation.y = Math.PI / 2
        ring.position.x = x + dir * i * 0.045
        group.add(ring)
      }
      return group
    }

    // ─── Parts list (mesh, home, explodeTo, homeRot) ─────────────
    const parts = []

    function addPart(mesh, home, explodeTo, homeRot = [0, 0, 0]) {
      mesh.position.set(...home)
      mesh.rotation.set(...homeRot)
      mesh.castShadow = true
      mesh.receiveShadow = true
      scene.add(mesh)
      parts.push({ mesh, home: [...home], explodeTo: [...explodeTo], homeRot: [...homeRot] })
    }

    function addGroupPart(group, home, explodeTo, homeRot = [0, 0, 0]) {
      group.position.set(...home)
      group.rotation.set(...homeRot)
      scene.add(group)
      parts.push({ mesh: group, home: [...home], explodeTo: [...explodeTo], homeRot: [...homeRot] })
    }

    // ── Main horizontal pipe (TubeGeometry along X axis)
    const mainPipeGeo = tube(
      [new THREE.Vector3(-2.1, 0, 0), new THREE.Vector3(2.1, 0, 0)],
      0.19, 48, 32
    )
    const mainPipe = new THREE.Mesh(mainPipeGeo, copper)
    addPart(mainPipe, [0, 0, 0], [0, 0, 0])

    // ── Inner bore (darker inner wall for realism)
    const boreGeo = tube(
      [new THREE.Vector3(-2.15, 0, 0), new THREE.Vector3(2.15, 0, 0)],
      0.135, 48, 20
    )
    const bore = new THREE.Mesh(boreGeo, darkMetal)
    addPart(bore, [0, 0, 0], [0, 0, 0])

    // ── Thread rings on left end of main pipe
    const leftThreads = threadRings(0, 6, brass, 1)
    leftThreads.position.set(-2.0, 0, 0)
    scene.add(leftThreads)
    parts.push({ mesh: leftThreads, home: [-2.0, 0, 0], explodeTo: [-3.8, 0.6, 0.3], homeRot: [0, 0, 0] })

    // ── Thread rings on right end
    const rightThreads = threadRings(0, 6, brass, -1)
    rightThreads.position.set(2.0, 0, 0)
    scene.add(rightThreads)
    parts.push({ mesh: rightThreads, home: [2.0, 0, 0], explodeTo: [3.8, 0.6, 0.3], homeRot: [0, 0, 0] })

    // ── Left hex nut (LatheGeometry hex cross-section approximation)
    const nutProfile = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.32, 0),
      new THREE.Vector2(0.32, 0.04),
      new THREE.Vector2(0.30, 0.06),
      new THREE.Vector2(0.30, 0.20),
      new THREE.Vector2(0.32, 0.22),
      new THREE.Vector2(0.32, 0.26),
      new THREE.Vector2(0, 0.26),
    ]
    const leftNut = new THREE.Mesh(lathe(nutProfile, 6), brass)
    addPart(leftNut, [-1.72, 0, 0], [-3.5, -1.5, 0.4], [0, 0, Math.PI / 2])

    const rightNut = new THREE.Mesh(lathe(nutProfile, 6), brass)
    addPart(rightNut, [1.72, 0, 0], [3.5, -1.5, 0.4], [0, Math.PI / 6, Math.PI / 2])

    // ── Rubber gasket rings
    const gasketGeo = new THREE.TorusGeometry(0.17, 0.03, 12, 32)
    const leftGasket = new THREE.Mesh(gasketGeo, rubbGasket)
    addPart(leftGasket, [-1.58, 0, 0], [-3.2, -2.2, 0.2], [0, Math.PI / 2, 0])
    const rightGasket = new THREE.Mesh(gasketGeo, rubbGasket)
    addPart(rightGasket, [1.58, 0, 0], [3.2, -2.2, 0.2], [0, Math.PI / 2, 0])

    // ── Ball valve body (lathe for realistic silhouette)
    const valveProfile = [
      new THREE.Vector2(0, -0.32),
      new THREE.Vector2(0.19, -0.32),
      new THREE.Vector2(0.22, -0.28),
      new THREE.Vector2(0.30, -0.10),
      new THREE.Vector2(0.32, 0),
      new THREE.Vector2(0.30, 0.10),
      new THREE.Vector2(0.22, 0.28),
      new THREE.Vector2(0.19, 0.32),
      new THREE.Vector2(0, 0.32),
    ]
    const valveBody = new THREE.Mesh(lathe(valveProfile, 40), steel)
    addPart(valveBody, [0, 0.35, 0], [0, 2.4, 0.8])

    // ── Valve bonnet (top dome)
    const bonnetProfile = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.18, 0),
      new THREE.Vector2(0.20, 0.04),
      new THREE.Vector2(0.20, 0.22),
      new THREE.Vector2(0.14, 0.32),
      new THREE.Vector2(0.08, 0.36),
      new THREE.Vector2(0, 0.36),
    ]
    const bonnet = new THREE.Mesh(lathe(bonnetProfile, 32), steel)
    addPart(bonnet, [0, 0.67, 0], [0, 3.1, 0.9])

    // ── Valve stem
    const stemGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.42, 16)
    const stem = new THREE.Mesh(stemGeo, steel)
    addPart(stem, [0, 1.09, 0], [0, 3.7, 1.0])

    // ── Valve handle group
    const handleGroup = new THREE.Group()
    const barGeo = new THREE.BoxGeometry(1.0, 0.085, 0.13)
    const bar = new THREE.Mesh(barGeo, redHandle)
    bar.castShadow = true
    handleGroup.add(bar)
    // Raised rib on handle center
    const ribGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.14, 16)
    const rib = new THREE.Mesh(ribGeo, darkMetal)
    rib.position.set(0, 0.11, 0)
    rib.castShadow = true
    handleGroup.add(rib)
    // Handle grip knurling (small boxes along bar)
    for (let i = -3; i <= 3; i++) {
      const knurl = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.11, 0.17),
        darkMetal
      )
      knurl.position.set(i * 0.13, 0, 0)
      handleGroup.add(knurl)
    }
    addGroupPart(handleGroup, [0, 1.32, 0], [0.6, 4.6, 1.1])

    // ── Left elbow using TubeGeometry curve
    const elbowCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(-0.2, 0.1, 0),
      new THREE.Vector3(-0.4, 0.25, 0),
      new THREE.Vector3(-0.48, 0.45, 0),
      new THREE.Vector3(-0.42, 0.65, 0),
      new THREE.Vector3(-0.25, 0.78, 0),
      new THREE.Vector3(0, 0.82, 0),
    ])
    const elbowGeo = new THREE.TubeGeometry(elbowCurve, 24, 0.19, 24, false)
    const elbow = new THREE.Mesh(elbowGeo, copper)
    addPart(elbow, [-2.28, -0.41, 0], [-5.5, 1.6, 0.4])

    // ── Vertical pipe (tube)
    const vertGeo = tube(
      [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1.9, 0)],
      0.19, 32, 24
    )
    const vertPipe = new THREE.Mesh(vertGeo, copper)
    addPart(vertPipe, [-2.72, 0.4, 0], [-5.8, 2.6, 0.5])

    // ── Thread rings on vertical pipe top
    const topThreads = new THREE.Group()
    for (let i = 0; i < 5; i++) {
      const r = new THREE.Mesh(new THREE.TorusGeometry(0.215, 0.016, 10, 32), brass)
      r.position.y = 2.22 + i * 0.042
      topThreads.add(r)
    }
    topThreads.position.set(-2.72, 0.4, 0)
    scene.add(topThreads)
    parts.push({ mesh: topThreads, home: [-2.72, 0.4, 0], explodeTo: [-6.2, 4.2, 0.7], homeRot: [0, 0, 0] })

    // ── End cap (lathe)
    const capProfile = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.22, 0),
      new THREE.Vector2(0.24, 0.04),
      new THREE.Vector2(0.24, 0.14),
      new THREE.Vector2(0.20, 0.22),
      new THREE.Vector2(0.10, 0.26),
      new THREE.Vector2(0, 0.26),
    ]
    const cap = new THREE.Mesh(lathe(capProfile, 32), brass)
    addPart(cap, [-2.72, 2.35, 0], [-6.5, 5.2, 0.8])

    // ── Right extension pipe
    const rightPipeGeo = tube(
      [new THREE.Vector3(0, 0, 0), new THREE.Vector3(1.6, 0, 0)],
      0.19, 32, 24
    )
    const rightPipe = new THREE.Mesh(rightPipeGeo, copper)
    addPart(rightPipe, [2.2, 0, 0], [5.0, 0.5, 0])

    // ── Right end fitting (lathe)
    const fittingProfile = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.24, 0),
      new THREE.Vector2(0.26, 0.03),
      new THREE.Vector2(0.26, 0.18),
      new THREE.Vector2(0.24, 0.20),
      new THREE.Vector2(0.22, 0.20),
      new THREE.Vector2(0.22, 0.22),
      new THREE.Vector2(0, 0.22),
    ]
    const fitting = new THREE.Mesh(lathe(fittingProfile, 6), brass)
    addPart(fitting, [3.84, 0, 0], [6.8, -1.2, 0.5], [0, Math.PI / 6, -Math.PI / 2])

    // ── Ground plane (shadow receiver only)
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(28, 28),
      new THREE.ShadowMaterial({ opacity: 0.35, color: 0x000022 })
    )
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -2.2
    ground.receiveShadow = true
    scene.add(ground)

    // ─── Animation ───────────────────────────────────────────────
    let t = 0
    let explodeT = 0
    let phase = 'assembled'
    let phaseTimer = 0
    let lastNow = performance.now()
    const EXPLODE_DUR = 2.0

    function ease(x) {
      return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
    }
    function lerp(a, b, t) { return a + (b - a) * t }

    function animate(now) {
      animRef.current = requestAnimationFrame(animate)
      const dt = Math.min((now - lastNow) / 1000, 0.05)
      lastNow = now
      t += dt
      phaseTimer += dt

      if (phase === 'assembled' && phaseTimer > 3.2) { phase = 'exploding'; phaseTimer = 0 }
      else if (phase === 'exploding') {
        explodeT = Math.min(explodeT + dt / EXPLODE_DUR, 1)
        if (explodeT >= 1) { phase = 'exploded'; phaseTimer = 0 }
      } else if (phase === 'exploded' && phaseTimer > 3.0) { phase = 'assembling'; phaseTimer = 0 }
      else if (phase === 'assembling') {
        explodeT = Math.max(explodeT - dt / EXPLODE_DUR, 0)
        if (explodeT <= 0) { phase = 'assembled'; phaseTimer = 0 }
      }

      const e = ease(explodeT)
      parts.forEach(p => {
        p.mesh.position.x = lerp(p.home[0], p.explodeTo[0], e)
        p.mesh.position.y = lerp(p.home[1], p.explodeTo[1], e)
        p.mesh.position.z = lerp(p.home[2], p.explodeTo[2], e)
      })

      // Gentle slow orbit
      scene.rotation.y = Math.sin(t * 0.14) * 0.28
      scene.rotation.x = Math.sin(t * 0.09) * 0.07

      // Light animation
      orange.intensity = 1.2 + Math.sin(t * 1.6) * 0.3
      blue.intensity = 1.0 + Math.cos(t * 1.3) * 0.25

      renderer.render(scene, camera)
    }

    animRef.current = requestAnimationFrame(animate)

    function onResize() {
      const w = el.clientWidth, h = el.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      cancelAnimationFrame(animRef.current)
      renderer.dispose()
      envMap.dispose()
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <section
      id="pipe-exploded"
      style={{ background: 'linear-gradient(180deg, #06090F 0%, #040810 60%, #06090F 100%)', padding: '100px 24px', overflow: 'hidden' }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          style={{ textAlign: 'center', marginBottom: 48 }}
        >
          <span style={{
            display: 'inline-block',
            background: 'rgba(184,115,51,0.15)',
            border: '1px solid rgba(184,115,51,0.4)',
            color: '#d4a853',
            fontFamily: 'Open Sans, sans-serif',
            fontWeight: 700,
            fontSize: 12,
            padding: '5px 16px',
            borderRadius: 100,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: 16,
          }}>
            3D Breakdown
          </span>
          <h2 style={{
            fontFamily: 'Poppins, sans-serif',
            fontWeight: 800,
            fontSize: 'clamp(30px, 4.5vw, 50px)',
            color: 'white',
            letterSpacing: '-1px',
            lineHeight: 1.1,
            marginBottom: 14,
          }}>
            Inside Every <span style={{ color: '#EA580C' }}>FlowMaster Repair</span>
          </h2>
          <p style={{
            fontFamily: 'Open Sans, sans-serif',
            fontSize: 16,
            color: 'rgba(255,255,255,0.5)',
            maxWidth: 500,
            margin: '0 auto',
            lineHeight: 1.7,
          }}>
            Photorealistic 3D exploded view — copper, brass, and steel components with accurate material rendering.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          style={{ position: 'relative' }}
        >
          <div
            ref={mountRef}
            style={{
              width: '100%',
              height: 480,
              borderRadius: 20,
              border: '1px solid rgba(184,115,51,0.15)',
              overflow: 'hidden',
              background: 'radial-gradient(ellipse at 40% 35%, #081428 0%, #020508 100%)',
              boxShadow: '0 0 100px rgba(30,64,175,0.1), 0 0 40px rgba(184,115,51,0.05), inset 0 1px 0 rgba(255,255,255,0.04)',
            }}
          />
          <div style={{
            position: 'absolute', bottom: 18, right: 18,
            background: 'rgba(4,8,16,0.88)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8, padding: '7px 14px',
            fontFamily: 'Open Sans, sans-serif', fontSize: 11,
            color: 'rgba(255,255,255,0.4)',
            backdropFilter: 'blur(8px)',
            letterSpacing: '0.04em',
          }}>
            WebGL · MeshPhysicalMaterial · Live render
          </div>
        </motion.div>

        <div ref={ref} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginTop: 24 }}>
          {PARTS_DATA.map((p, i) => (
            <motion.div
              key={p.label}
              initial={{ opacity: 0, y: 18 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.09 }}
              style={{
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 12,
                padding: '16px 18px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
              }}
            >
              <div style={{
                width: 10, height: 10, borderRadius: '50%',
                background: p.color, flexShrink: 0, marginTop: 5,
                boxShadow: `0 0 8px ${p.color}99`,
              }} />
              <div>
                <div style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 13, color: 'white', marginBottom: 3 }}>{p.label}</div>
                <div style={{ fontFamily: 'Open Sans, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>{p.desc}</div>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  )
}
