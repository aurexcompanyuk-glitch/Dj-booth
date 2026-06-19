import { useEffect, useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import * as THREE from 'three'

export default function CinematicPipes() {
  const mountRef = useRef(null)
  const rendererRef = useRef(null)
  const frameRef = useRef(null)

  const { scrollY } = useScroll()
  const overlayOpacity = useTransform(scrollY, [0, 400], [1, 0])
  const overlayY = useTransform(scrollY, [0, 400], [0, -80])

  useEffect(() => {
    const el = mountRef.current
    if (!el) return
    const W = el.clientWidth
    const H = el.clientHeight

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.1
    renderer.outputColorSpace = THREE.SRGBColorSpace
    el.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x02050a)
    scene.fog = new THREE.FogExp2(0x02050a, 0.028)

    // Camera
    const camera = new THREE.PerspectiveCamera(65, W / H, 0.05, 80)

    // ─── ENV MAP ───────────────────────────────────────────────────────────────
    const pmrem = new THREE.PMREMGenerator(renderer)
    pmrem.compileEquirectangularShader()
    const envScene = new THREE.Scene()
    const envGeo = new THREE.SphereGeometry(50, 32, 16)
    const envMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: { topColor: { value: new THREE.Color(0x1a3a6e) }, botColor: { value: new THREE.Color(0x000510) } },
      vertexShader: `varying vec3 vPos; void main(){ vPos=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: `varying vec3 vPos; uniform vec3 topColor,botColor; void main(){ float t=clamp((vPos.y+50.)/100.,0.,1.); gl_FragColor=vec4(mix(botColor,topColor,t),1.); }`
    })
    envScene.add(new THREE.Mesh(envGeo, envMat))
    const envMap = pmrem.fromScene(envScene).texture

    // ─── MATERIALS ─────────────────────────────────────────────────────────────
    const mkCopper = () => new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0xb55a28), metalness: 1, roughness: 0.30,
      clearcoat: 0.6, clearcoatRoughness: 0.12, envMap, envMapIntensity: 1.6
    })
    const mkBrass = () => new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0xc8960a), metalness: 1, roughness: 0.20,
      clearcoat: 0.7, clearcoatRoughness: 0.08, envMap, envMapIntensity: 1.8
    })
    const mkSteel = () => new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0x9aabb5), metalness: 1, roughness: 0.10,
      clearcoat: 0.9, clearcoatRoughness: 0.05, envMap, envMapIntensity: 2.2
    })
    const mkGasket = () => new THREE.MeshStandardMaterial({
      color: 0x111111, roughness: 0.95, metalness: 0
    })
    const mkValveRed = () => new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0xcc1a1a), metalness: 0.1, roughness: 0.55,
      clearcoat: 0.4
    })

    // ─── HELPERS ────────────────────────────────────────────────────────────────
    function addTube(points, radius, mat, segs = 64) {
      const curve = new THREE.CatmullRomCurve3(points)
      const geo = new THREE.TubeGeometry(curve, segs, radius, 14, false)
      const m = new THREE.Mesh(geo, mat)
      m.castShadow = true; m.receiveShadow = true
      scene.add(m)
      return m
    }
    function addThreads(x, y, z, radius, axis = 'x') {
      for (let i = -4; i <= 4; i++) {
        const tGeo = new THREE.TorusGeometry(radius + 0.015, 0.013, 8, 24)
        const t = new THREE.Mesh(tGeo, mkBrass())
        t.position.set(x, y, z)
        if (axis === 'x') { t.rotation.y = Math.PI / 2; t.position.x += i * 0.055 }
        else if (axis === 'z') { t.rotation.x = Math.PI / 2; t.position.z += i * 0.055 }
        else { t.position.y += i * 0.055 }
        t.castShadow = true
        scene.add(t)
      }
    }
    function addValve(x, y, z, rotY = 0) {
      const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rotY; scene.add(g)
      // body
      const pts = [
        new THREE.Vector2(0, -0.28), new THREE.Vector2(0.22, -0.18),
        new THREE.Vector2(0.28, 0), new THREE.Vector2(0.22, 0.18), new THREE.Vector2(0, 0.28)
      ]
      const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 24), mkBrass())
      body.rotation.z = Math.PI / 2; body.castShadow = true; g.add(body)
      // bonnet
      const bpts = [
        new THREE.Vector2(0, 0), new THREE.Vector2(0.14, 0.06),
        new THREE.Vector2(0.14, 0.22), new THREE.Vector2(0.10, 0.26),
        new THREE.Vector2(0.10, 0.38), new THREE.Vector2(0, 0.38)
      ]
      const bonnet = new THREE.Mesh(new THREE.LatheGeometry(bpts, 18), mkSteel())
      bonnet.position.y = 0.26; bonnet.castShadow = true; g.add(bonnet)
      // handle
      const hBar = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.06, 0.06), mkValveRed())
      hBar.position.y = 0.72; hBar.castShadow = true; g.add(hBar)
      const hCenter = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 12), mkSteel())
      hCenter.position.y = 0.72; hCenter.castShadow = true; g.add(hCenter)
      // gasket ring
      const gasket = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.025, 8, 24), mkGasket())
      gasket.rotation.z = Math.PI / 2; g.add(gasket)
    }
    function addElbow(cx, cy, cz, r = 0.22, mat) {
      const pts = []
      for (let i = 0; i <= 12; i++) {
        const a = (i / 12) * Math.PI * 0.5
        pts.push(new THREE.Vector3(cx + Math.cos(a) * r - r, cy + Math.sin(a) * r, cz))
      }
      addTube(pts, 0.14, mat, 20)
    }
    function addTee(x, y, z, mat) {
      addTube([new THREE.Vector3(x - 0.5, y, z), new THREE.Vector3(x + 0.5, y, z)], 0.14, mat, 16)
      addTube([new THREE.Vector3(x, y, z), new THREE.Vector3(x, y + 0.5, z)], 0.14, mat, 12)
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.175, 0.175, 0.12, 18), mkBrass())
      collar.position.set(x, y, z); collar.castShadow = true; scene.add(collar)
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // BUILD THE PIPE CITY — sprawling network the camera flies through
    // ═══════════════════════════════════════════════════════════════════════════

    // Main horizontal spine — camera flies along this
    addTube([
      new THREE.Vector3(-30, 0, 0), new THREE.Vector3(-20, 0.5, -1),
      new THREE.Vector3(-10, 0, 1), new THREE.Vector3(0, 0.3, 0),
      new THREE.Vector3(10, -0.2, -1), new THREE.Vector3(20, 0, 0.5),
      new THREE.Vector3(30, 0, 0)
    ], 0.22, mkCopper(), 120)

    // Upper parallel pipe
    addTube([
      new THREE.Vector3(-28, 2.2, 0.5), new THREE.Vector3(-15, 2.4, -0.5),
      new THREE.Vector3(0, 2.0, 0.8), new THREE.Vector3(15, 2.3, -0.3),
      new THREE.Vector3(28, 2.1, 0)
    ], 0.16, mkSteel(), 100)

    // Lower pipe
    addTube([
      new THREE.Vector3(-28, -2.0, -0.5), new THREE.Vector3(-10, -1.8, 0.5),
      new THREE.Vector3(5, -2.2, -0.3), new THREE.Vector3(28, -1.9, 0)
    ], 0.18, mkBrass(), 90)

    // Cross pipes (vertical drops/rises)
    const vDropsX = [-20, -12, -4, 4, 12, 20]
    vDropsX.forEach((x, i) => {
      const y0 = -2.2, y1 = 2.4
      addTube([
        new THREE.Vector3(x, y0, i % 2 === 0 ? -0.3 : 0.3),
        new THREE.Vector3(x, y1, i % 2 === 0 ? -0.3 : 0.3)
      ], 0.12, i % 3 === 0 ? mkCopper() : i % 3 === 1 ? mkBrass() : mkSteel(), 20)
      addThreads(x, y0 + 0.3, i % 2 === 0 ? -0.3 : 0.3, 0.12, 'y')
      addThreads(x, y1 - 0.3, i % 2 === 0 ? -0.3 : 0.3, 0.12, 'y')
    })

    // Deep background pipes (z = 3-6, for depth parallax)
    addTube([
      new THREE.Vector3(-28, 1.0, 4), new THREE.Vector3(-10, 0.6, 4.5),
      new THREE.Vector3(10, 1.2, 3.8), new THREE.Vector3(28, 0.8, 4)
    ], 0.14, mkSteel(), 80)
    addTube([
      new THREE.Vector3(-28, -0.8, 5), new THREE.Vector3(0, -0.5, 5.5),
      new THREE.Vector3(28, -0.9, 4.8)
    ], 0.10, mkCopper(), 70)
    addTube([
      new THREE.Vector3(-28, -0.8, -4), new THREE.Vector3(0, -0.5, -5),
      new THREE.Vector3(28, -0.9, -4.5)
    ], 0.12, mkBrass(), 70)

    // Near foreground pipes (z = -2 to -4)
    addTube([
      new THREE.Vector3(-28, 1.5, -3), new THREE.Vector3(-8, 1.2, -3.5),
      new THREE.Vector3(10, 1.7, -3), new THREE.Vector3(28, 1.4, -3.2)
    ], 0.18, mkCopper(), 80)

    // Diagonal branch pipes
    addTube([
      new THREE.Vector3(-18, 0, 0), new THREE.Vector3(-16, 1.5, 2),
      new THREE.Vector3(-14, 2.2, 3)
    ], 0.10, mkBrass(), 24)
    addTube([
      new THREE.Vector3(8, 0.3, 0), new THREE.Vector3(10, -1.0, -2),
      new THREE.Vector3(12, -2.0, -3)
    ], 0.10, mkCopper(), 24)
    addTube([
      new THREE.Vector3(-6, 0, 0), new THREE.Vector3(-5, 1.8, -2),
      new THREE.Vector3(-4, 2.3, -4)
    ], 0.09, mkSteel(), 20)

    // Valves along main spine
    addValve(-16, 0.4, -0.5, 0.2)
    addValve(-4, 0.1, 0.3, -0.1)
    addValve(8, -0.1, -0.5, 0.3)
    addValve(18, 0.2, 0.4, -0.2)

    // T-junctions
    addTee(-20, 0.5, -1, mkCopper())
    addTee(0, 0.3, 0, mkBrass())
    addTee(20, 0, 0.5, mkCopper())

    // Thread details on main pipe
    ;[-22, -14, -6, 2, 10, 18].forEach(x => addThreads(x, 0, 0, 0.22))

    // Pressure gauges (sphere + stem)
    ;[-10, 6, 16].forEach(x => {
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.22, 8), mkSteel())
      stem.position.set(x, 0.38, 0.05); stem.castShadow = true; scene.add(stem)
      const gauge = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), mkSteel())
      gauge.position.set(x, 0.52, 0.05); gauge.castShadow = true; scene.add(gauge)
      const face = new THREE.Mesh(new THREE.CircleGeometry(0.10, 16), new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.9 }))
      face.position.set(x, 0.52, 0.18); scene.add(face)
    })

    // Flanges (flat discs at pipe ends/joints)
    ;[-24, -8, 4, 14, 24].forEach(x => {
      const f = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.30, 0.06, 18), mkSteel())
      f.rotation.z = Math.PI / 2; f.position.set(x, 0, 0); f.castShadow = true; scene.add(f)
    })

    // Ground plane (receives shadows)
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 40),
      new THREE.MeshStandardMaterial({ color: 0x05080f, roughness: 0.9, metalness: 0.1 })
    )
    ground.rotation.x = -Math.PI / 2; ground.position.y = -3.5
    ground.receiveShadow = true; scene.add(ground)

    // Grid lines on ground
    const grid = new THREE.GridHelper(80, 40, 0x0a1a2a, 0x0a1a2a)
    grid.position.y = -3.48; scene.add(grid)

    // ─── LIGHTING ──────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x112233, 0.35))

    const key = new THREE.DirectionalLight(0xfff8e8, 2.8)
    key.position.set(8, 12, 5); key.castShadow = true
    key.shadow.mapSize.set(2048, 2048)
    key.shadow.camera.near = 0.5; key.shadow.camera.far = 60
    key.shadow.camera.left = -30; key.shadow.camera.right = 30
    key.shadow.camera.top = 15; key.shadow.camera.bottom = -10
    key.shadow.bias = -0.002; scene.add(key)

    const fill = new THREE.DirectionalLight(0x3a6aaa, 0.8)
    fill.position.set(-10, 4, -5); scene.add(fill)

    const rim = new THREE.DirectionalLight(0xaad4ff, 1.2)
    rim.position.set(0, 8, -20); scene.add(rim)

    // Volumetric-feeling point lights along the path
    const pointColors = [
      [0xff7020, -20, 0.5, 1], [0x2060ff, -10, 0, -1],
      [0xff4010, 0, 0.3, 0.5], [0x10aaff, 10, -0.2, -0.5],
      [0xff6030, 20, 0, 1],
    ]
    pointColors.forEach(([c, x, y, z]) => {
      const p = new THREE.PointLight(c, 4, 8); p.position.set(x, y + 1, z); scene.add(p)
    })

    // Subtle top accent
    const top = new THREE.PointLight(0xffeedd, 1.5, 20)
    top.position.set(0, 10, 0); scene.add(top)

    // ─── CAMERA PATH ───────────────────────────────────────────────────────────
    // Camera flies through the pipe network slowly like a cinematic dolly
    const camCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-28, 1.8, -2),
      new THREE.Vector3(-20, 0.4, 0.8),
      new THREE.Vector3(-12, 1.2, -1.5),
      new THREE.Vector3(-4, 0.6, 0.5),
      new THREE.Vector3(4, 1.4, -1),
      new THREE.Vector3(12, 0.3, 0.8),
      new THREE.Vector3(20, 1.0, -1.2),
      new THREE.Vector3(28, 0.6, 0.5),
    ], true) // closed loop

    const lookCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-20, 0.3, -0.5),
      new THREE.Vector3(-12, 0.5, 1),
      new THREE.Vector3(-4, 0.2, -0.8),
      new THREE.Vector3(4, 0.8, 0.5),
      new THREE.Vector3(12, 0, -0.5),
      new THREE.Vector3(20, 0.5, 0.8),
      new THREE.Vector3(28, 0.2, -0.8),
      new THREE.Vector3(36, 0.3, 0),
    ], true)

    // ─── ANIMATE ───────────────────────────────────────────────────────────────
    let t = 0
    const speed = 0.000035 // very slow cinematic pace

    const camPos = new THREE.Vector3()
    const lookAt = new THREE.Vector3()

    function animate() {
      frameRef.current = requestAnimationFrame(animate)
      t = (t + speed) % 1

      camCurve.getPoint(t, camPos)
      lookCurve.getPoint((t + 0.02) % 1, lookAt)
      camera.position.copy(camPos)
      camera.lookAt(lookAt)

      // Subtle camera breathing
      camera.position.y += Math.sin(Date.now() * 0.0008) * 0.04
      camera.position.z += Math.sin(Date.now() * 0.0005) * 0.03

      renderer.render(scene, camera)
    }
    animate()

    // Resize
    const onResize = () => {
      const w = el.clientWidth, h = el.clientHeight
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      cancelAnimationFrame(frameRef.current)
      renderer.dispose()
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <section style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden', background: '#02050a' }}>
      {/* Three.js mount */}
      <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} />

      {/* Cinematic letterbox bars */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '6vh', background: '#000', zIndex: 2 }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '6vh', background: '#000', zIndex: 2 }} />

      {/* Vignette */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.75) 100%)',
        pointerEvents: 'none'
      }} />

      {/* Film grain overlay */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1, opacity: 0.04,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize: '200px',
        pointerEvents: 'none'
      }} />

      {/* Text overlay */}
      <motion.div
        style={{ opacity: overlayOpacity, y: overlayY }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2.5, delay: 0.5 }}
        className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none"
      >
        {/* Top label */}
        <motion.div
          initial={{ opacity: 0, letterSpacing: '0.6em' }}
          animate={{ opacity: 1, letterSpacing: '0.35em' }}
          transition={{ duration: 2, delay: 1.2 }}
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 'clamp(10px, 1.2vw, 13px)',
            fontWeight: 700,
            color: 'rgba(255,180,80,0.85)',
            letterSpacing: '0.35em',
            textTransform: 'uppercase',
            marginBottom: '2.5rem',
            textShadow: '0 0 30px rgba(255,120,20,0.6)'
          }}
        >
          Master Plumbers Since 1987
        </motion.div>

        {/* Main headline */}
        <div style={{ overflow: 'hidden', textAlign: 'center' }}>
          {['FLOW.', 'PRESSURE.', 'PRECISION.'].map((word, i) => (
            <div key={word} style={{ overflow: 'hidden' }}>
              <motion.div
                initial={{ y: '110%' }}
                animate={{ y: '0%' }}
                transition={{ duration: 1.1, delay: 1.5 + i * 0.18, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 'clamp(52px, 10vw, 140px)',
                  fontWeight: 900,
                  lineHeight: 0.92,
                  letterSpacing: '-0.02em',
                  color: i === 2 ? 'transparent' : '#ffffff',
                  WebkitTextStroke: i === 2 ? '1.5px rgba(255,255,255,0.5)' : 'none',
                  textShadow: i === 2 ? 'none' : '0 0 80px rgba(0,80,255,0.2)',
                }}
              >
                {word}
              </motion.div>
            </div>
          ))}
        </div>

        {/* Divider line */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.4, delay: 2.2 }}
          style={{
            width: 'clamp(200px, 30vw, 420px)', height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(255,120,30,0.8), transparent)',
            margin: '2.5rem auto'
          }}
        />

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5, delay: 2.6 }}
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 'clamp(13px, 1.4vw, 17px)',
            color: 'rgba(180,200,220,0.7)',
            letterSpacing: '0.15em',
            fontWeight: 300,
            textTransform: 'uppercase',
            maxWidth: '40ch',
            textAlign: 'center',
            lineHeight: 1.7
          }}
        >
          Industrial plumbing engineered for performance.<br />
          Residential solutions crafted for life.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 3.2 }}
          style={{ marginTop: '3rem', pointerEvents: 'all' }}
        >
          <a
            href="#contact"
            style={{
              display: 'inline-block',
              padding: '1rem 3rem',
              border: '1px solid rgba(255,120,30,0.7)',
              color: '#fff',
              fontFamily: "'Inter', sans-serif",
              fontSize: '13px',
              fontWeight: 600,
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              textDecoration: 'none',
              background: 'rgba(255,80,10,0.08)',
              backdropFilter: 'blur(6px)',
              transition: 'all 0.3s',
              cursor: 'pointer'
            }}
            onMouseEnter={e => { e.target.style.background = 'rgba(255,80,10,0.3)'; e.target.style.borderColor = 'rgba(255,120,30,1)' }}
            onMouseLeave={e => { e.target.style.background = 'rgba(255,80,10,0.08)'; e.target.style.borderColor = 'rgba(255,120,30,0.7)' }}
          >
            Get a Free Quote
          </a>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 4, duration: 1 }}
        style={{
          position: 'absolute', bottom: '8vh', left: '50%', transform: 'translateX(-50%)',
          zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
          fontFamily: "'Inter', sans-serif", fontSize: '10px', letterSpacing: '0.25em',
          color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase'
        }}
      >
        <span>Scroll</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
          style={{ width: 1, height: 28, background: 'rgba(255,120,30,0.5)' }}
        />
      </motion.div>

      {/* Corner timestamp (cinematic detail) */}
      <div style={{
        position: 'absolute', bottom: '7.5vh', right: '2.5vw', zIndex: 10,
        fontFamily: 'monospace', fontSize: '11px', color: 'rgba(255,120,30,0.45)',
        letterSpacing: '0.1em'
      }}>
        CAM_01 · REC ●
      </div>
      <div style={{
        position: 'absolute', bottom: '7.5vh', left: '2.5vw', zIndex: 10,
        fontFamily: 'monospace', fontSize: '11px', color: 'rgba(255,255,255,0.25)',
        letterSpacing: '0.1em'
      }}>
        24MM · f/1.8 · ISO 800
      </div>
    </section>
  )
}
