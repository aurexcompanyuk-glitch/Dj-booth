import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'

// ─── SCENES ──────────────────────────────────────────────────────────────────
const SCENES = [
  {
    cam: { x: 7,    y: 2.6, z: 5   },
    look: { x: 0, y: 0.7, z: 0 },
    label: null,
    heading: 'THE ART\nOF THE\nPERFECT\nFINISH.',
    sub: 'Scroll to explore',
    keyColor: 0xfff5e0, keyIntensity: 4.5,
    fillColor: 0x2244aa, fillIntensity: 1.5,
  },
  {
    cam: { x: 0.5,  y: 2.0, z: 8.5 },
    look: { x: 0, y: 0.7, z: 0 },
    label: '01 — PAINT CORRECTION',
    heading: 'SWIRL\nFREE.',
    sub: 'Machine polishing under 4000K studio lighting',
    keyColor: 0xfff5e0, keyIntensity: 5,
    fillColor: 0x0011aa, fillIntensity: 2,
  },
  {
    cam: { x: -8,   y: 2.2, z: 3   },
    look: { x: 0, y: 0.7, z: 0 },
    label: '02 — CERAMIC COATING',
    heading: '9H\nHARD\nNESS.',
    sub: '5-year hydrophobic protection',
    keyColor: 0xd0e8ff, keyIntensity: 4,
    fillColor: 0x0044ff, fillIntensity: 3,
  },
  {
    cam: { x: -7,   y: 1.5, z: -4  },
    look: { x: 0, y: 0.6, z: 0 },
    label: '03 — PAINT PROTECTION FILM',
    heading: 'INVIS\nIBLE\nSHIELD.',
    sub: 'Self-healing TPU film',
    keyColor: 0xffe0c0, keyIntensity: 4,
    fillColor: 0xaa3300, fillIntensity: 2,
  },
  {
    cam: { x: 3,    y: 1.2, z: -8  },
    look: { x: 0, y: 0.7, z: 0 },
    label: '04 — INTERIOR DETAIL',
    heading: 'PURE\nINSIDE.',
    sub: 'Leather · deep clean · odour treatment',
    keyColor: 0xfff0d0, keyIntensity: 4.5,
    fillColor: 0x331100, fillIntensity: 1.5,
  },
  {
    cam: { x: 7,    y: 2.6, z: 5   },
    look: { x: 0, y: 0.7, z: 0 },
    label: null,
    heading: 'BOOK\nNOW.',
    sub: null,
    keyColor: 0xfff5e0, keyIntensity: 4.5,
    fillColor: 0x2244aa, fillIntensity: 1.5,
  },
]

// ─── CAR ─────────────────────────────────────────────────────────────────────
function buildCar(envMap) {
  const g = new THREE.Group()

  const BODY = new THREE.MeshPhysicalMaterial({
    color: 0x111111, metalness: 0.95, roughness: 0.08,
    clearcoat: 1.0, clearcoatRoughness: 0.02,
    envMap, envMapIntensity: 2.8
  })
  const CHROME = new THREE.MeshPhysicalMaterial({
    color: 0xb8c8d0, metalness: 1, roughness: 0.04, envMap, envMapIntensity: 3
  })
  const GLASS = new THREE.MeshPhysicalMaterial({
    color: 0x0a1825, transmission: 0.55, transparent: true, opacity: 0.6,
    roughness: 0, metalness: 0, envMap, envMapIntensity: 1.8
  })
  const RUBBER = new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.95 })
  const RIM = new THREE.MeshPhysicalMaterial({
    color: 0x9aaab8, metalness: 1, roughness: 0.06, envMap, envMapIntensity: 2.5
  })
  const HEADLIGHT = new THREE.MeshStandardMaterial({
    color: 0xfff8f0, emissive: 0xff9020, emissiveIntensity: 4, roughness: 0
  })
  const TAILLIGHT = new THREE.MeshStandardMaterial({
    color: 0xff1010, emissive: 0xff0000, emissiveIntensity: 6, roughness: 0
  })

  const mesh = (geo, mat, x=0,y=0,z=0,rx=0,ry=0,rz=0) => {
    const m = new THREE.Mesh(geo, mat)
    m.position.set(x,y,z); m.rotation.set(rx,ry,rz)
    m.castShadow = true; m.receiveShadow = true; g.add(m); return m
  }

  // ── BODY ────────────────────────────────────────────────────────────────
  // Main lower slab
  mesh(new THREE.BoxGeometry(4.9, 0.48, 2.05), BODY, 0, 0.44)

  // Cabin — extruded side profile
  const s = new THREE.Shape()
  s.moveTo(-2.0, 0)
  s.bezierCurveTo(-2.3, 0, -2.4, 0.65, -2.05, 1.08)
  s.lineTo(-1.05, 1.48); s.lineTo(0.78, 1.48)
  s.bezierCurveTo(1.35, 1.48, 1.92, 1.05, 2.1, 0)
  s.closePath()
  const cabin = new THREE.Mesh(
    new THREE.ExtrudeGeometry(s, { depth: 1.88, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.025, bevelSegments: 3 }),
    BODY
  )
  cabin.position.set(-0.08, 0.68, -0.94); cabin.castShadow = true; g.add(cabin)

  // Bumper front
  mesh(new THREE.BoxGeometry(0.1, 0.28, 1.85), BODY, 2.51, 0.38)
  mesh(new THREE.BoxGeometry(0.1, 0.12, 1.85), CHROME, 2.51, 0.24)

  // Bumper rear
  mesh(new THREE.BoxGeometry(0.1, 0.28, 1.85), BODY, -2.51, 0.38)
  mesh(new THREE.BoxGeometry(0.1, 0.08, 1.85), CHROME, -2.51, 0.22)

  // Side sills
  ;[-1.04, 1.04].forEach(z => mesh(new THREE.BoxGeometry(4.6, 0.08, 0.14), CHROME, 0, 0.14, z))

  // ── GLASS ───────────────────────────────────────────────────────────────
  const ws = new THREE.Mesh(new THREE.PlaneGeometry(1.52, 1.06), GLASS)
  ws.position.set(1.76, 1.28, 0); ws.rotation.set(0, Math.PI/2, -0.4); g.add(ws)

  const rw = new THREE.Mesh(new THREE.PlaneGeometry(1.32, 0.96), GLASS)
  rw.position.set(-1.96, 1.24, 0); rw.rotation.set(0, Math.PI/2, 0.36); g.add(rw)

  ;[0.26, -0.62].forEach(x => {
    ;[0.935, -0.935].forEach(z => {
      const sw = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.62), GLASS)
      sw.position.set(x, 1.3, z > 0 ? 0.94 : -0.94); g.add(sw)
    })
  })

  // ── WHEELS ──────────────────────────────────────────────────────────────
  const wheelPositions = [[1.62,0,1.04],[1.62,0,-1.04],[-1.54,0,1.04],[-1.54,0,-1.04]]
  wheelPositions.forEach(([x,y,z]) => {
    const wg = new THREE.Group(); wg.position.set(x,y,z); g.add(wg)
    // Tyre
    wg.add(Object.assign(new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.155, 20, 56), RUBBER), { castShadow: true }))
    // Outer rim face
    const rimFace = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.05, 24), RIM)
    rimFace.rotation.z = Math.PI/2; wg.add(rimFace)
    // Spokes ×5
    for (let s=0; s<5; s++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.68, 0.032), RIM)
      spoke.rotation.x = Math.PI/2; spoke.rotation.z = (s/5)*Math.PI*2; wg.add(spoke)
    }
    // Centre cap
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.12, 14), CHROME)
    cap.rotation.z = Math.PI/2; wg.add(cap)
    // Brake disc
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.038, 20), new THREE.MeshStandardMaterial({color:0x2a2a2a,roughness:0.7}))
    disc.rotation.z = Math.PI/2; wg.add(disc)
  })

  // ── LIGHTS ──────────────────────────────────────────────────────────────
  ;[-0.5, 0.5].forEach(z => {
    mesh(new THREE.BoxGeometry(0.06, 0.16, 0.28), HEADLIGHT, 2.53, 0.74, z)
    mesh(new THREE.CylinderGeometry(0.065, 0.085, 0.055, 12), CHROME, 2.53, 0.74, z, 0, 0, Math.PI/2)
  })
  mesh(new THREE.BoxGeometry(0.04, 0.04, 1.04), HEADLIGHT, 2.54, 0.58)
  mesh(new THREE.BoxGeometry(0.04, 0.04, 1.04), HEADLIGHT, 2.54, 0.88)

  ;[-0.46, 0.46].forEach(z => mesh(new THREE.BoxGeometry(0.05, 0.2, 0.28), TAILLIGHT, -2.53, 0.8, z))
  mesh(new THREE.BoxGeometry(0.04, 0.04, 1.0), TAILLIGHT, -2.54, 0.72)

  // Grille
  mesh(new THREE.BoxGeometry(0.055, 0.2, 0.84), new THREE.MeshStandardMaterial({color:0x0d0d0d,roughness:0.9}), 2.53, 0.5)
  // Grille bars
  for (let i=-1; i<=1; i++) {
    mesh(new THREE.BoxGeometry(0.06, 0.02, 0.82), CHROME, 2.54, 0.5+i*0.07)
  }

  // Side mirrors
  ;[1.12, -1.12].forEach(z => mesh(new THREE.BoxGeometry(0.2, 0.1, 0.05), BODY, 1.52, 1.08, z))

  // Exhaust
  ;[-0.26, 0.26].forEach(z => mesh(new THREE.CylinderGeometry(0.052,0.052,0.12,12), CHROME, -2.53,0.22,z, 0,0,Math.PI/2))

  // Roof rail
  ;[-0.92, 0.92].forEach(z => {
    const pts = [
      new THREE.Vector3(-1.02,1.5,0), new THREE.Vector3(0,1.52,0), new THREE.Vector3(0.76,1.52,0),
      new THREE.Vector3(1.96,1.04,0)
    ]
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),16,0.012,8), CHROME)
    tube.position.z = z; g.add(tube)
  })

  g.position.y = 0.44
  return g
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
export default function AppCar3() {
  const mountRef = useRef(null)
  const scrollRef = useRef(null)
  const [scene, setScene] = useState(0)
  const [sent, setSent] = useState(false)
  const totalScenes = SCENES.length

  useEffect(() => {
    const el = mountRef.current
    if (!el) return
    let W = el.clientWidth, H = el.clientHeight

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.3
    renderer.outputColorSpace = THREE.SRGBColorSpace
    el.appendChild(renderer.domElement)

    const threeScene = new THREE.Scene()
    threeScene.background = new THREE.Color(0x000000)
    threeScene.fog = new THREE.FogExp2(0x000000, 0.022)

    const camera = new THREE.PerspectiveCamera(38, W/H, 0.1, 120)

    // Post processing — SUBTLE bloom, not overwhelming
    const composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(threeScene, camera))
    const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.45, 0.6, 0.82)
    composer.addPass(bloom)

    // Env map
    const pmrem = new THREE.PMREMGenerator(renderer)
    const eScene = new THREE.Scene()
    eScene.add(Object.assign(new THREE.Mesh(
      new THREE.SphereGeometry(50,32,16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        uniforms: { top:{value:new THREE.Color(0x0d1f3a)}, bot:{value:new THREE.Color(0x000000)} },
        vertexShader:`varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
        fragmentShader:`varying vec3 v;uniform vec3 top,bot;void main(){gl_FragColor=vec4(mix(bot,top,clamp((v.y+50.)/100.,0.,1.)),1.);}`
      })
    )))
    const envMap = pmrem.fromScene(eScene).texture

    // Car
    const car = buildCar(envMap)
    threeScene.add(car)

    // Floor — reflective studio floor
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.08, metalness: 0.9, envMap, envMapIntensity: 1.2 })
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), floorMat)
    floor.rotation.x = -Math.PI/2; floor.receiveShadow = true; threeScene.add(floor)

    // Studio reflection oval under car
    const oval = new THREE.Mesh(
      new THREE.CircleGeometry(4, 80),
      new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 0.02, metalness: 1, envMap, envMapIntensity: 2 })
    )
    oval.rotation.x = -Math.PI/2; oval.position.y = 0.001; oval.scale.set(1, 0.5, 1); threeScene.add(oval)

    // ── LIGHTS ────────────────────────────────────────────────────────────
    threeScene.add(new THREE.AmbientLight(0x111822, 0.8))

    // Key light — main studio light from front-right-top
    const keyLight = new THREE.DirectionalLight(0xfff5e0, 4.5)
    keyLight.position.set(6, 10, 5); keyLight.castShadow = true
    keyLight.shadow.mapSize.set(2048, 2048); keyLight.shadow.bias = -0.002
    keyLight.shadow.camera.left = -10; keyLight.shadow.camera.right = 10
    keyLight.shadow.camera.top = 7; keyLight.shadow.camera.bottom = -4
    threeScene.add(keyLight)

    // Fill light — from left
    const fillLight = new THREE.DirectionalLight(0x2244aa, 1.5)
    fillLight.position.set(-8, 4, -3); threeScene.add(fillLight)

    // Rim light — from behind
    const rimLight = new THREE.DirectionalLight(0x88aaff, 2.2)
    rimLight.position.set(0, 5, -12); threeScene.add(rimLight)

    // Undercar
    const underLight = new THREE.PointLight(0xc9a84c, 1.5, 5)
    underLight.position.set(0, 0.2, 0); threeScene.add(underLight)

    // Particles
    const pPos = new Float32Array(400*3)
    for (let i=0;i<400;i++){pPos[i*3]=(Math.random()-.5)*24;pPos[i*3+1]=Math.random()*8;pPos[i*3+2]=(Math.random()-.5)*16}
    const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute('position', new THREE.BufferAttribute(pPos,3))
    threeScene.add(new THREE.Points(pGeo, new THREE.PointsMaterial({color:0xc9a84c,size:0.018,transparent:true,opacity:0.35})))

    // Camera lerp state
    const camPos = new THREE.Vector3(SCENES[0].cam.x, SCENES[0].cam.y, SCENES[0].cam.z)
    const camTgt = new THREE.Vector3(0, 0.7, 0)
    const tPos = new THREE.Vector3()
    const tTgt = new THREE.Vector3()

    const clock = new THREE.Clock()
    let curScene = 0
    let raf

    const getScroll = () => {
      const max = (totalScenes - 1) * window.innerHeight
      return Math.max(0, Math.min(1, window.scrollY / max))
    }

    function animate() {
      raf = requestAnimationFrame(animate)
      const t = clock.getElapsedTime()
      const scroll = getScroll()

      // Which scene
      const raw = scroll * (SCENES.length - 1)
      const iA = Math.floor(raw), iB = Math.min(iA+1, SCENES.length-1)
      const frac = raw - iA
      const ease = frac<0.5 ? 2*frac*frac : -1+(4-2*frac)*frac

      if (iA !== curScene) { curScene = iA; setScene(iA) }

      const sA = SCENES[iA], sB = SCENES[iB]

      tPos.set(
        sA.cam.x+(sB.cam.x-sA.cam.x)*ease,
        sA.cam.y+(sB.cam.y-sA.cam.y)*ease,
        sA.cam.z+(sB.cam.z-sA.cam.z)*ease,
      )
      tTgt.set(
        sA.look.x+(sB.look.x-sA.look.x)*ease,
        sA.look.y+(sB.look.y-sA.look.y)*ease,
        sA.look.z+(sB.look.z-sA.look.z)*ease,
      )

      // Breathing
      tPos.x += Math.sin(t*0.35)*0.08
      tPos.y += Math.sin(t*0.28)*0.05

      camPos.lerp(tPos, 0.05)
      camTgt.lerp(tTgt, 0.05)
      camera.position.copy(camPos)
      camera.lookAt(camTgt)

      // Lerp lights
      keyLight.color.setHex(sA.keyColor); keyLight.intensity += (sA.keyIntensity - keyLight.intensity)*0.05
      fillLight.color.setHex(sA.fillColor); fillLight.intensity += (sA.fillIntensity - fillLight.intensity)*0.05

      // Undercar pulse
      underLight.intensity = 1.2 + Math.sin(t*2.2)*0.5

      // Wheels
      car.children.forEach((c,i)=>{ if(i>=2&&i<=5) c.rotation.x = t*0.5 })

      composer.render()
    }
    animate()

    const onScroll = () => {
      const s = getScroll()
      const idx = Math.min(Math.floor(s*(SCENES.length-0.001)), SCENES.length-1)
      setScene(idx)
    }
    window.addEventListener('scroll', onScroll)

    const onResize = () => {
      W = el.clientWidth; H = el.clientHeight
      renderer.setSize(W,H); composer.setSize(W,H)
      camera.aspect = W/H; camera.updateProjectionMatrix()
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      if(el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
    }
  }, [])

  const s = SCENES[scene]
  const isBook = scene === SCENES.length - 1
  const progress = scene / (SCENES.length - 1)

  return (
    <>
      {/* Scroll container — one screen per scene */}
      <div ref={scrollRef} style={{ height: `${SCENES.length * 100}vh` }}>

        {/* Sticky full-screen canvas */}
        <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden', background: '#000' }}>

          {/* 3D canvas */}
          <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} />

          {/* Subtle vignette — NOT blocking the car */}
          <div style={{
            position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
            background: 'radial-gradient(ellipse 100% 100% at 50% 50%, transparent 50%, rgba(0,0,0,0.55) 100%)'
          }} />

          {/* Film grain — very subtle */}
          <div style={{
            position: 'absolute', inset: 0, zIndex: 2, opacity: 0.02, pointerEvents: 'none',
            backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize:'256px'
          }} />

          {/* Letterbox — thin bars top/bottom */}
          <div style={{position:'absolute',top:0,left:0,right:0,height:'5.5vh',background:'#000',zIndex:10,pointerEvents:'none'}} />
          <div style={{position:'absolute',bottom:0,left:0,right:0,height:'5.5vh',background:'#000',zIndex:10,pointerEvents:'none'}} />

          {/* NAV */}
          <div style={{position:'absolute',top:0,left:0,right:0,zIndex:20,padding:'1.4rem 2.5rem',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{fontFamily:'Inter,sans-serif',fontWeight:900,fontSize:15,color:'#fff',letterSpacing:'-0.02em'}}>
              VELVET<span style={{color:'rgba(201,168,76,0.9)'}}>.</span>
            </div>
            <a href="tel:08001234567" style={{fontFamily:'Inter,sans-serif',fontSize:9,fontWeight:700,letterSpacing:'0.25em',textTransform:'uppercase',color:'rgba(201,168,76,0.85)',textDecoration:'none',border:'1px solid rgba(201,168,76,0.35)',padding:'0.55rem 1.2rem'}}>
              Call Now
            </a>
          </div>

          {/* ── SCENE TEXT — bottom left, never centre-screen ── */}
          <AnimatePresence mode="wait">
            <motion.div
              key={scene}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.7, ease: [0.16,1,0.3,1] }}
              style={{
                position: 'absolute',
                bottom: '9vh', left: '4vw',
                zIndex: 12,
                maxWidth: '55vw',
                pointerEvents: isBook ? 'all' : 'none'
              }}
            >
              {!isBook ? (
                <>
                  {s.label && (
                    <div style={{fontFamily:'monospace',fontSize:10,color:'rgba(201,168,76,0.65)',letterSpacing:'0.35em',textTransform:'uppercase',marginBottom:'1.2rem'}}>
                      {s.label}
                    </div>
                  )}

                  {s.heading.split('\n').map((line, i) => (
                    <div key={i} style={{ overflow: 'hidden' }}>
                      <motion.div
                        initial={{ y: '105%' }}
                        animate={{ y: '0%' }}
                        transition={{ duration: 0.85, delay: 0.05 + i * 0.07, ease: [0.16,1,0.3,1] }}
                        style={{
                          fontFamily: 'Inter,sans-serif',
                          fontSize: 'clamp(48px, 8.5vw, 120px)',
                          fontWeight: 900, lineHeight: 0.88,
                          letterSpacing: '-0.04em',
                          color: i % 2 === 0 ? '#fff' : 'transparent',
                          WebkitTextStroke: i % 2 !== 0 ? '1.5px rgba(255,255,255,0.28)' : 'none',
                        }}
                      >{line}</motion.div>
                    </div>
                  ))}

                  {s.sub && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 1, delay: 0.5 }}
                      style={{ marginTop: '1.5rem' }}
                    >
                      <div style={{ width: 36, height: 1, background: 'rgba(201,168,76,0.6)', marginBottom: '0.8rem' }} />
                      <p style={{ fontFamily:'Inter,sans-serif', fontSize:'clamp(11px,1vw,13px)', color:'rgba(180,200,220,0.5)', letterSpacing:'0.2em', textTransform:'uppercase', fontWeight:300 }}>
                        {s.sub}
                      </p>
                    </motion.div>
                  )}
                </>
              ) : (
                /* ── BOOKING ── */
                <BookPanel sent={sent} onSend={() => setSent(true)} />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Scene counter — top right */}
          <div style={{position:'absolute',top:'7.5vh',right:'2.5vw',zIndex:12,fontFamily:'monospace',fontSize:10,color:'rgba(255,255,255,0.22)',letterSpacing:'0.18em'}}>
            {String(scene+1).padStart(2,'0')} / {String(SCENES.length).padStart(2,'0')}
          </div>

          {/* HUD bottom right */}
          <div style={{position:'absolute',bottom:'7vh',right:'2.5vw',zIndex:12,fontFamily:'monospace',fontSize:9,color:'rgba(201,168,76,0.3)',letterSpacing:'0.15em'}}>
            LIVE 3D · SCROLL
          </div>

          {/* Progress dots — right edge */}
          <div style={{position:'absolute',right:'1.8vw',top:'50%',transform:'translateY(-50%)',zIndex:12,display:'flex',flexDirection:'column',gap:'0.6rem'}}>
            {SCENES.map((_,i) => (
              <div key={i} style={{
                width: i===scene ? 6 : 4,
                height: i===scene ? 6 : 4,
                borderRadius: '50%',
                background: i===scene ? 'rgba(201,168,76,0.9)' : 'rgba(255,255,255,0.2)',
                transition: 'all 0.3s'
              }} />
            ))}
          </div>

        </div>
      </div>
    </>
  )
}

// ─── BOOKING PANEL ────────────────────────────────────────────────────────────
function BookPanel({ sent, onSend }) {
  const s = {
    background:'rgba(0,0,0,0.75)', border:'1px solid rgba(255,255,255,0.1)',
    padding:'0.8rem 1rem', color:'#fff', fontFamily:'Inter,sans-serif', fontSize:13,
    outline:'none', width:'100%', boxSizing:'border-box', backdropFilter:'blur(12px)',
    transition:'border-color 0.3s'
  }
  const focus = e => e.target.style.borderColor='rgba(201,168,76,0.7)'
  const blur  = e => e.target.style.borderColor='rgba(255,255,255,0.1)'

  if (sent) return (
    <div style={{padding:'2rem',background:'rgba(0,0,0,0.75)',border:'1px solid rgba(201,168,76,0.4)',backdropFilter:'blur(12px)'}}>
      <div style={{fontFamily:'Inter,sans-serif',fontSize:32,fontWeight:900,color:'#c9a84c'}}>Received.</div>
      <p style={{fontFamily:'Inter,sans-serif',fontSize:13,color:'rgba(180,200,220,0.55)',fontWeight:300,marginTop:8}}>We will contact you within 2 hours.</p>
    </div>
  )

  return (
    <div>
      <div style={{fontFamily:'Inter,sans-serif',fontSize:'clamp(42px,7vw,90px)',fontWeight:900,lineHeight:0.88,letterSpacing:'-0.04em',color:'#fff',marginBottom:'2rem'}}>
        BOOK<br/><span style={{WebkitTextStroke:'1.5px rgba(201,168,76,0.65)',color:'transparent'}}>NOW.</span>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:'0.55rem',maxWidth:420}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.55rem'}}>
          <input placeholder="Your name" style={s} onFocus={focus} onBlur={blur}/>
          <input placeholder="Phone" style={s} onFocus={focus} onBlur={blur}/>
        </div>
        <input placeholder="Vehicle — make · model · year" style={s} onFocus={focus} onBlur={blur}/>
        <select defaultValue="" style={{...s,color:'rgba(255,255,255,0.45)'}}>
          <option value="" disabled>Service</option>
          <option>Paint Correction</option><option>Ceramic Coating</option>
          <option>PPF Wrap</option><option>Interior Detail</option><option>Full Package</option>
        </select>
        <motion.button
          whileHover={{background:'rgba(201,168,76,0.28)',borderColor:'rgba(201,168,76,1)'}}
          whileTap={{scale:0.98}}
          onClick={onSend}
          style={{padding:'0.95rem',border:'1px solid rgba(201,168,76,0.6)',background:'rgba(201,168,76,0.1)',color:'#fff',fontFamily:'Inter,sans-serif',fontSize:10,fontWeight:700,letterSpacing:'0.3em',textTransform:'uppercase',cursor:'pointer',transition:'all 0.3s',backdropFilter:'blur(12px)'}}>
          Submit Enquiry
        </motion.button>
      </div>
    </div>
  )
}
