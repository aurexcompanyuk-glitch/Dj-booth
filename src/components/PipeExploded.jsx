import { useRef, useEffect } from 'react'
import { motion, useInView } from 'framer-motion'
import * as THREE from 'three'

const PARTS_DATA = [
  { label: 'Copper Main Pipe', color: '#b87333', desc: 'Type L copper tubing — 20-year lifespan' },
  { label: 'Brass Compression Fittings', color: '#d4a853', desc: 'Lead-free brass, rated to 250 PSI' },
  { label: 'Ball Valve Assembly', color: '#8a9ab0', desc: 'Full-bore stainless steel shut-off' },
  { label: 'Extension Lines', color: '#b87333', desc: 'Flexible PEX cross-linked polymer' },
]

export default function PipeExploded() {
  const mountRef = useRef(null)
  const animRef = useRef(null)
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.3 })

  useEffect(() => {
    const el = mountRef.current
    if (!el) return

    // --- Scene ---
    const scene = new THREE.Scene()
    const w = el.clientWidth
    const h = el.clientHeight
    const camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 100)
    camera.position.set(0, 1.5, 9)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    el.appendChild(renderer.domElement)

    // --- Lighting ---
    scene.add(new THREE.AmbientLight(0xffffff, 0.35))

    const sun = new THREE.DirectionalLight(0xfff4e0, 2)
    sun.position.set(6, 10, 6)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    scene.add(sun)

    const bluePoint = new THREE.PointLight(0x1e40af, 3, 18)
    bluePoint.position.set(-6, 4, 3)
    scene.add(bluePoint)

    const orangePoint = new THREE.PointLight(0xea580c, 2, 14)
    orangePoint.position.set(6, -3, 4)
    scene.add(orangePoint)

    const rimLight = new THREE.DirectionalLight(0x60a5fa, 0.8)
    rimLight.position.set(-4, -2, -5)
    scene.add(rimLight)

    // --- Materials ---
    const copper = new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: 0.9, roughness: 0.18 })
    const steel = new THREE.MeshStandardMaterial({ color: 0x9aacbd, metalness: 0.95, roughness: 0.08 })
    const brass = new THREE.MeshStandardMaterial({ color: 0xd4a853, metalness: 0.88, roughness: 0.22 })
    const red = new THREE.MeshStandardMaterial({ color: 0xcc2200, metalness: 0.25, roughness: 0.55 })
    const darkSteel = new THREE.MeshStandardMaterial({ color: 0x4a5568, metalness: 0.9, roughness: 0.15 })

    // --- Parts ---
    const parts = []

    function addPart(geo, mat, homePos, explodePos, homeRot = [0, 0, 0]) {
      const mesh = new THREE.Mesh(geo, mat)
      mesh.castShadow = true
      mesh.receiveShadow = true
      mesh.position.set(...homePos)
      mesh.rotation.set(...homeRot)
      scene.add(mesh)
      parts.push({ mesh, home: homePos, explodeTo: explodePos, homeRot })
      return mesh
    }

    // Main horizontal pipe (copper)
    addPart(new THREE.CylinderGeometry(0.2, 0.2, 4, 40), copper, [0, 0, 0], [0, 0, 0], [0, 0, Math.PI / 2])

    // Inner bore (dark hole visual)
    const bore = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 4.1, 32), darkSteel)
    bore.rotation.z = Math.PI / 2
    scene.add(bore)
    parts.push({ mesh: bore, home: [0, 0, 0], explodeTo: [0, 0, 0], homeRot: [0, 0, Math.PI / 2] })

    // Left compression ring
    addPart(new THREE.TorusGeometry(0.24, 0.065, 20, 48), brass, [-1.85, 0, 0], [-4, 1.2, 0.5], [0, Math.PI / 2, 0])

    // Right compression ring
    addPart(new THREE.TorusGeometry(0.24, 0.065, 20, 48), brass, [1.85, 0, 0], [4, 1.2, 0.5], [0, Math.PI / 2, 0])

    // Left nut
    addPart(new THREE.CylinderGeometry(0.28, 0.28, 0.22, 6), brass, [-1.6, 0, 0], [-3.5, -1.4, 0.3], [0, 0, Math.PI / 2])

    // Right nut
    addPart(new THREE.CylinderGeometry(0.28, 0.28, 0.22, 6), brass, [1.6, 0, 0], [3.5, -1.4, 0.3], [0, 0, Math.PI / 2])

    // Valve body
    addPart(new THREE.CylinderGeometry(0.3, 0.3, 0.55, 32), steel, [0, 0.38, 0], [0, 2.5, 0.8])

    // Valve body collar (wider ring at base)
    addPart(new THREE.CylinderGeometry(0.38, 0.38, 0.1, 32), steel, [0, 0.13, 0], [0.3, 1.8, 0.6])

    // Valve stem
    addPart(new THREE.CylinderGeometry(0.07, 0.07, 0.5, 16), steel, [0, 0.75, 0], [0, 3.5, 0.9])

    // Valve handle
    const handleGroup = new THREE.Group()
    const handleBar = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.1, 0.14), red)
    const handleNub = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.12, 16), darkSteel)
    handleNub.position.set(0, 0.11, 0)
    handleGroup.add(handleBar, handleNub)
    handleGroup.position.set(0, 1.05, 0)
    scene.add(handleGroup)
    parts.push({ mesh: handleGroup, home: [0, 1.05, 0], explodeTo: [0.8, 4.5, 1], homeRot: [0, 0, 0] })

    // Left elbow going up-back
    addPart(new THREE.TorusGeometry(0.45, 0.2, 20, 32, Math.PI / 2), copper, [-2.35, 0.45, 0], [-5.5, 1.8, 0.3], [0, 0, Math.PI])

    // Vertical pipe from elbow
    addPart(new THREE.CylinderGeometry(0.2, 0.2, 1.8, 32), copper, [-2.8, 1.35, 0], [-5.8, 3, 0.5])

    // End cap top
    addPart(new THREE.CylinderGeometry(0.24, 0.2, 0.18, 32), brass, [-2.8, 2.28, 0], [-6.2, 5, 0.6])

    // Right extension pipe
    addPart(new THREE.CylinderGeometry(0.2, 0.2, 1.4, 32), copper, [2.9, 0, 0], [5.8, 0.6, 0], [0, 0, Math.PI / 2])

    // Right end fitting
    addPart(new THREE.CylinderGeometry(0.26, 0.26, 0.2, 32), brass, [3.65, 0, 0], [6.5, -1.2, 0.4], [0, 0, Math.PI / 2])

    // Ground plane (invisible, for shadows)
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 30),
      new THREE.ShadowMaterial({ opacity: 0.3 })
    )
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -2.5
    ground.receiveShadow = true
    scene.add(ground)

    // --- Animation state ---
    let t = 0
    let explodeT = 0
    let phase = 'assembled'
    let phaseTimer = 0
    let lastTime = performance.now()
    const EXPLODE_DUR = 1.8

    function easeInOutCubic(x) {
      return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
    }

    function lerp(a, b, t) { return a + (b - a) * t }

    function animate(now) {
      animRef.current = requestAnimationFrame(animate)
      const dt = Math.min((now - lastTime) / 1000, 0.05)
      lastTime = now
      t += dt
      phaseTimer += dt

      // Phase cycling
      if (phase === 'assembled' && phaseTimer > 3) { phase = 'exploding'; phaseTimer = 0 }
      else if (phase === 'exploding') {
        explodeT = Math.min(explodeT + dt / EXPLODE_DUR, 1)
        if (explodeT >= 1) { phase = 'exploded'; phaseTimer = 0 }
      } else if (phase === 'exploded' && phaseTimer > 3) { phase = 'assembling'; phaseTimer = 0 }
      else if (phase === 'assembling') {
        explodeT = Math.max(explodeT - dt / EXPLODE_DUR, 0)
        if (explodeT <= 0) { phase = 'assembled'; phaseTimer = 0 }
      }

      const e = easeInOutCubic(explodeT)

      // Update part positions
      parts.forEach(p => {
        p.mesh.position.x = lerp(p.home[0], p.explodeTo[0], e)
        p.mesh.position.y = lerp(p.home[1], p.explodeTo[1], e)
        p.mesh.position.z = lerp(p.home[2], p.explodeTo[2], e)
      })

      // Gentle scene orbit
      scene.rotation.y = Math.sin(t * 0.18) * 0.35
      scene.rotation.x = Math.sin(t * 0.13) * 0.08

      // Pulsing lights
      bluePoint.intensity = 2.5 + Math.sin(t * 1.8) * 0.7
      orangePoint.intensity = 1.8 + Math.cos(t * 1.4) * 0.5

      renderer.render(scene, camera)
    }

    animRef.current = requestAnimationFrame(animate)

    function onResize() {
      const w = el.clientWidth
      const h = el.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      cancelAnimationFrame(animRef.current)
      renderer.dispose()
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <section
      id="pipe-exploded"
      style={{ background: 'linear-gradient(180deg, #06090F 0%, #040810 50%, #06090F 100%)', padding: '100px 24px', overflow: 'hidden' }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* Header */}
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
            Live 3D exploded view of the pipe assembly we install. Watch it cycle between assembled and disassembled.
          </p>
        </motion.div>

        {/* 3D Canvas */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          style={{ position: 'relative' }}
        >
          <div
            ref={mountRef}
            style={{
              width: '100%',
              height: 440,
              borderRadius: 20,
              border: '1px solid rgba(184,115,51,0.2)',
              overflow: 'hidden',
              background: 'radial-gradient(ellipse at 50% 40%, #0a1628 0%, #03060e 100%)',
              boxShadow: '0 0 80px rgba(30,64,175,0.12), 0 0 40px rgba(184,115,51,0.06)',
            }}
          />
          {/* Overlay label */}
          <div style={{
            position: 'absolute',
            bottom: 20,
            right: 20,
            background: 'rgba(6,9,15,0.85)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10,
            padding: '8px 14px',
            fontFamily: 'Open Sans, sans-serif',
            fontSize: 12,
            color: 'rgba(255,255,255,0.5)',
            backdropFilter: 'blur(8px)',
          }}>
            Live WebGL render
          </div>
        </motion.div>

        {/* Part labels */}
        <div ref={ref} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginTop: 28 }}>
          {PARTS_DATA.map((p, i) => (
            <motion.div
              key={p.label}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 12,
                padding: '18px 20px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
              }}
            >
              <div style={{
                width: 12, height: 12,
                borderRadius: '50%',
                background: p.color,
                flexShrink: 0,
                marginTop: 4,
                boxShadow: `0 0 8px ${p.color}88`,
              }} />
              <div>
                <div style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 13, color: 'white', marginBottom: 4 }}>{p.label}</div>
                <div style={{ fontFamily: 'Open Sans, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>{p.desc}</div>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  )
}
