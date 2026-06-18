import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useScroll, useTransform, useInView } from 'framer-motion'
import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

// ─── FLAVOURS ────────────────────────────────────────────────────────────────
const FLAVOURS = [
  { name: 'Ratchet Raspberry', tagline: 'The OG. The icon. The one that started it all.', color: '#3b82f6', bg: 'linear-gradient(135deg,#1e1b4b 0%,#3730a3 40%,#7c3aed 100%)', particle: 0x818cf8, accent: '#a78bfa', price: '£4.99', badge: 'BESTSELLER' },
  { name: 'Mango Madness', tagline: 'Let that Man-go and go for mango.', color: '#f97316', bg: 'linear-gradient(135deg,#431407 0%,#c2410c 40%,#f97316 100%)', particle: 0xfb923c, accent: '#fed7aa', price: '£4.99', badge: 'FAN FAV' },
  { name: 'Cocky Cola', tagline: 'We reached astronomical heights. Down to earth now.', color: '#dc2626', bg: 'linear-gradient(135deg,#1c0505 0%,#7f1d1d 40%,#dc2626 100%)', particle: 0xf87171, accent: '#fca5a5', price: '£4.99', badge: 'CLASSIC' },
  { name: 'Minty Mint', tagline: 'Fresh enough to change the room.', color: '#10b981', bg: 'linear-gradient(135deg,#022c22 0%,#065f46 40%,#10b981 100%)', particle: 0x34d399, accent: '#a7f3d0', price: '£4.99', badge: 'FRESH' },
  { name: 'Lightning Lemon', tagline: 'Amplifying Apple. Lightning Lemon. Vitamin B1+B6.', color: '#eab308', bg: 'linear-gradient(135deg,#1a1200 0%,#713f12 40%,#eab308 100%)', particle: 0xfde047, accent: '#fef08a', price: '£4.99', badge: 'POWER' },
]

const BUNDLES = [
  { name: 'Starter', desc: '7 flavours to kick things off', price: '£24.99', was: '£49.99', items: ['7 × flavour packs', 'Carry case', 'Free shipping'], color: '#6366f1' },
  { name: 'Pro', desc: 'The full pick\'em experience', price: '£59.99', was: '£95.99', items: ['14 × flavour packs', 'Pro carry case', 'Vitamin Powerline', 'Priority shipping'], color: '#f97316', badge: 'MOST POPULAR' },
  { name: 'Build Your Own', desc: 'You know what you like', price: 'from £3.50', was: null, items: ['Choose any 8 flavours', 'Mix + match freely', 'Save 25%'], color: '#10b981' },
]

const CELEBS = ['KSI', 'Macklemore', 'Harry Pinero', 'Vikkstar', 'KSI', 'Macklemore', 'Harry Pinero', 'Vikkstar', 'KSI', 'Macklemore', 'Harry Pinero', 'Vikkstar']

const REVIEWS = [
  { name: 'Blake L.', stars: 5, text: 'Great toothpicks, better than all the others. My whole office is hooked.' },
  { name: 'Joseph M.', stars: 5, text: 'Ordered 3 times already. The Ratchet Raspberry is unreal.' },
  { name: 'Sokratis A.', stars: 5, text: 'Never thought I would say this but these toothpicks changed my life.' },
  { name: 'Mr R.', stars: 5, text: 'Awesome! So much better than any other toothpick. My friends all want them.' },
  { name: 'Emma T.', stars: 5, text: 'The Mango Madness is insane. I carry these everywhere now.' },
  { name: 'James K.', stars: 5, text: 'KSI was not lying. These are actually elite. Cocky Cola is my pick.' },
]

// ─── 3D HERO ─────────────────────────────────────────────────────────────────
function ThreeHero({ activeFlavour }) {
  const mountRef = useRef(null)
  const flavourRef = useRef(activeFlavour)

  useEffect(() => { flavourRef.current = activeFlavour }, [activeFlavour])

  useEffect(() => {
    const el = mountRef.current
    if (!el) return
    let disposed = false
    let W = el.clientWidth, H = el.clientHeight

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.0
    renderer.outputColorSpace = THREE.SRGBColorSpace
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100)
    camera.position.set(0, 0, 8)

    // Environment
    const pmrem = new THREE.PMREMGenerator(renderer)
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    pmrem.dispose()

    // Bloom
    const composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))
    const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.8, 0.4, 0.1)
    composer.addPass(bloom)

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 1.5))
    const key = new THREE.DirectionalLight(0xffffff, 3)
    key.position.set(5, 8, 5)
    scene.add(key)
    scene.add(Object.assign(new THREE.DirectionalLight(0x8888ff, 1.5), { position: new THREE.Vector3(-5, -3, -5) }))

    // ── TOOTHPICK ────────────────────────────────────────────────────────────
    const pickGroup = new THREE.Group()

    // Shaft
    const shaftMat = new THREE.MeshPhysicalMaterial({
      color: 0xd4a574, metalness: 0.1, roughness: 0.4, clearcoat: 0.5,
    })
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 4.2, 24), shaftMat)
    pickGroup.add(shaft)

    // Tapered tip (front)
    const tipMat = new THREE.MeshPhysicalMaterial({ color: 0xc49060, metalness: 0.1, roughness: 0.5 })
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.7, 24), tipMat)
    tip.position.y = 2.45
    pickGroup.add(tip)

    // Blunt back end
    const back = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 8), shaftMat)
    back.position.y = -2.1
    pickGroup.add(back)

    // Colour band (flavour indicator)
    const bandMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(FLAVOURS[0].particle),
      emissive: new THREE.Color(FLAVOURS[0].particle),
      emissiveIntensity: 0.6,
      metalness: 0.3, roughness: 0.2,
    })
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.22, 24), bandMat)
    band.position.y = -1.5
    pickGroup.add(band)

    pickGroup.rotation.z = 0.35
    scene.add(pickGroup)

    // ── PARTICLES ────────────────────────────────────────────────────────────
    const PARTICLE_COUNT = 280
    const positions = new Float32Array(PARTICLE_COUNT * 3)
    const velocities = []
    const lifetimes = new Float32Array(PARTICLE_COUNT)
    const sizes = new Float32Array(PARTICLE_COUNT)

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 10
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10
      positions[i * 3 + 2] = (Math.random() - 0.5) * 4
      velocities.push({
        x: (Math.random() - 0.5) * 0.012,
        y: (Math.random() - 0.5) * 0.012 + 0.003,
        z: (Math.random() - 0.5) * 0.006,
      })
      lifetimes[i] = Math.random()
      sizes[i] = Math.random() * 4 + 1.5
    }

    const pGeo = new THREE.BufferGeometry()
    pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    pGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

    const pMat = new THREE.PointsMaterial({
      color: new THREE.Color(FLAVOURS[0].particle),
      size: 0.06,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const particles = new THREE.Points(pGeo, pMat)
    scene.add(particles)

    // ── RING ────────────────────────────────────────────────────────────────
    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(FLAVOURS[0].particle),
      transparent: true, opacity: 0.15, side: THREE.DoubleSide,
    })
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.008, 8, 80), ringMat)
    ring.rotation.x = Math.PI / 2
    scene.add(ring)

    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.005, 8, 80), ringMat.clone())
    ring2.material.opacity = 0.08
    ring2.rotation.x = Math.PI / 3
    scene.add(ring2)

    // ── ANIMATE ──────────────────────────────────────────────────────────────
    let raf
    const clock = new THREE.Clock()
    let currentColor = new THREE.Color(FLAVOURS[0].particle)
    let targetColor = new THREE.Color(FLAVOURS[0].particle)

    function animate() {
      if (disposed) return
      raf = requestAnimationFrame(animate)
      const t = clock.getElapsedTime()
      const fi = flavourRef.current
      targetColor.set(FLAVOURS[fi].particle)
      currentColor.lerp(targetColor, 0.04)

      // Update colours
      pMat.color.copy(currentColor)
      bandMat.color.copy(currentColor)
      bandMat.emissive.copy(currentColor)
      ring.material.color.copy(currentColor)
      ring2.material.color.copy(currentColor)

      // Rotate toothpick
      pickGroup.rotation.y = t * 0.4
      pickGroup.rotation.z = 0.35 + Math.sin(t * 0.6) * 0.08
      pickGroup.position.y = Math.sin(t * 0.5) * 0.15

      // Rings rotate
      ring.rotation.y = t * 0.2
      ring2.rotation.y = -t * 0.15
      ring.rotation.z = t * 0.1

      // Update particles
      const pos = pGeo.attributes.position.array
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        lifetimes[i] += 0.004
        if (lifetimes[i] > 1) {
          lifetimes[i] = 0
          pos[i * 3]     = (Math.random() - 0.5) * 1.5
          pos[i * 3 + 1] = (Math.random() - 0.5) * 5
          pos[i * 3 + 2] = (Math.random() - 0.5) * 1.5
        }
        pos[i * 3]     += velocities[i].x
        pos[i * 3 + 1] += velocities[i].y
        pos[i * 3 + 2] += velocities[i].z
      }
      pGeo.attributes.position.needsUpdate = true

      composer.render()
    }
    animate()

    const onResize = () => {
      W = el.clientWidth; H = el.clientHeight
      renderer.setSize(W, H)
      composer.setSize(W, H)
      camera.aspect = W / H
      camera.updateProjectionMatrix()
    }
    window.addEventListener('resize', onResize)

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} />
}

// ─── REVEAL WRAPPER ──────────────────────────────────────────────────────────
function Reveal({ children, delay = 0, y = 40 }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
    >{children}</motion.div>
  )
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
export default function AppPickem() {
  const [activeFlavour, setActiveFlavour] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const flavour = FLAVOURS[activeFlavour]

  const heroRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 120])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0])

  const serif = "'Fraunces', Georgia, serif"
  const sans = "'Inter', sans-serif"

  return (
    <div style={{ background: '#050505', color: '#fff', fontFamily: sans, overflowX: 'hidden' }}>

      {/* ── NAV ─────────────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(5,5,5,0.85)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '0 2rem', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ fontFamily: serif, fontWeight: 900, fontSize: 26, letterSpacing: '-0.03em' }}>
          pick<span style={{ color: flavour.color }}>'em</span>
        </div>

        <div style={{ display: 'flex', gap: '2rem', fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.65)' }}>
          {['Flavours', 'Bundles', 'Reviews'].map(l => (
            <a key={l} href={`#${l.toLowerCase()}`} style={{ textDecoration: 'none', color: 'inherit', transition: 'color .2s' }}
              onMouseEnter={e => e.target.style.color = '#fff'}
              onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.65)'}
            >{l}</a>
          ))}
        </div>

        <motion.a
          href="#bundles"
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
          style={{
            background: flavour.color, color: '#000', fontWeight: 700, fontSize: 12,
            letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none',
            padding: '0.55rem 1.4rem', borderRadius: 99, transition: 'background 0.4s',
          }}
        >Shop Now</motion.a>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section ref={heroRef} style={{
        position: 'relative', height: '100vh', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#050505',
      }}>
        {/* Animated gradient bg */}
        <motion.div style={{
          position: 'absolute', inset: 0, zIndex: 0,
          background: flavour.bg,
          opacity: 0.35,
          transition: 'background 1s ease',
        }} />

        {/* 3D canvas */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
          <ThreeHero activeFlavour={activeFlavour} />
        </div>

        {/* Hero text */}
        <motion.div style={{ position: 'relative', zIndex: 10, textAlign: 'center', y: heroY, opacity: heroOpacity }}>
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            style={{
              display: 'inline-block', background: 'rgba(255,255,255,0.08)',
              border: `1px solid ${flavour.color}44`,
              borderRadius: 99, padding: '0.35rem 1.1rem',
              fontSize: 11, fontWeight: 700, letterSpacing: '0.25em',
              textTransform: 'uppercase', color: flavour.accent,
              marginBottom: '1.5rem', backdropFilter: 'blur(8px)',
              transition: 'all 0.5s',
            }}
          >The toothpick that got flavour</motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.8, ease: [0.16,1,0.3,1] }}
            style={{
              fontFamily: serif, fontSize: 'clamp(52px, 9vw, 128px)',
              fontWeight: 900, lineHeight: 0.92, letterSpacing: '-0.04em',
              margin: '0 0 1.2rem',
            }}
          >
            Pick.<br />
            <span style={{ color: flavour.color, fontStyle: 'italic', transition: 'color 0.5s' }}>Flavour.</span><br />
            Repeat.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            style={{ fontSize: 'clamp(14px,1.4vw,18px)', color: 'rgba(255,255,255,0.55)', marginBottom: '2.5rem', fontWeight: 300 }}
          >
            20+ insane flavours. Vitamin-infused. 100k+ obsessed.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75 }}
            style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}
          >
            <motion.a href="#bundles" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
              style={{
                background: flavour.color, color: '#000', fontWeight: 700, fontSize: 14,
                letterSpacing: '0.06em', textDecoration: 'none',
                padding: '0.85rem 2.2rem', borderRadius: 99, transition: 'background 0.5s',
              }}
            >Get the deal</motion.a>
            <motion.a href="#flavours" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
              style={{
                background: 'rgba(255,255,255,0.08)', color: '#fff', fontWeight: 600, fontSize: 14,
                border: '1px solid rgba(255,255,255,0.2)', textDecoration: 'none',
                padding: '0.85rem 2.2rem', borderRadius: 99, backdropFilter: 'blur(8px)',
              }}
            >Try now</motion.a>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}
          style={{ position: 'absolute', bottom: '3vh', left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}
        >
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 1.8 }}
            style={{ width: 1, height: 40, background: `linear-gradient(to bottom, ${flavour.color}, transparent)`, margin: '0 auto' }}
          />
        </motion.div>
      </section>

      {/* ── TICKER ──────────────────────────────────────────────────────────── */}
      <div style={{ overflow: 'hidden', background: flavour.color, padding: '0.75rem 0', transition: 'background 0.5s' }}>
        <motion.div
          animate={{ x: [0, -50 * CELEBS.length / 2] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
          style={{ display: 'flex', gap: '3rem', whiteSpace: 'nowrap', width: 'max-content' }}
        >
          {CELEBS.concat(CELEBS).map((c, i) => (
            <span key={i} style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.25em', textTransform: 'uppercase', color: '#000' }}>
              ✦ {c}
            </span>
          ))}
        </motion.div>
      </div>

      {/* ── STATS ───────────────────────────────────────────────────────────── */}
      <section style={{ padding: '6rem 2rem', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', textAlign: 'center' }}>
          {[
            { num: '100k+', label: 'Customers worldwide' },
            { num: '20+', label: 'Insane flavours' },
            { num: '4.9★', label: 'Average rating' },
          ].map((s, i) => (
            <Reveal key={i} delay={i * 0.12}>
              <div style={{
                padding: '2.5rem 1rem',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 16,
                background: 'rgba(255,255,255,0.03)',
              }}>
                <div style={{ fontFamily: serif, fontSize: 'clamp(40px,5vw,64px)', fontWeight: 900, color: flavour.color, letterSpacing: '-0.04em', transition: 'color 0.5s' }}>{s.num}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: '0.5rem', letterSpacing: '0.05em' }}>{s.label}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── FLAVOURS ────────────────────────────────────────────────────────── */}
      <section id="flavours" style={{ padding: '4rem 0 8rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 2rem' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: '1rem' }}>The Lineup</div>
              <h2 style={{ fontFamily: serif, fontSize: 'clamp(36px,5vw,64px)', fontWeight: 900, letterSpacing: '-0.03em', margin: 0 }}>The Good Stuff.</h2>
            </div>
          </Reveal>

          {/* Flavour selector tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '3rem' }}>
            {FLAVOURS.map((f, i) => (
              <motion.button
                key={i}
                onClick={() => setActiveFlavour(i)}
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
                style={{
                  background: activeFlavour === i ? f.color : 'rgba(255,255,255,0.06)',
                  color: activeFlavour === i ? '#000' : 'rgba(255,255,255,0.6)',
                  border: 'none', borderRadius: 99, padding: '0.5rem 1.2rem',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  letterSpacing: '0.03em', transition: 'all 0.3s',
                }}
              >{f.name}</motion.button>
            ))}
          </div>

          {/* Active flavour card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeFlavour}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              style={{
                borderRadius: 24, overflow: 'hidden',
                background: flavour.bg,
                padding: '4rem 3rem',
                display: 'grid', gridTemplateColumns: '1fr 1fr',
                gap: '3rem', alignItems: 'center',
                minHeight: 340,
              }}
            >
              <div>
                <div style={{
                  display: 'inline-block', background: 'rgba(0,0,0,0.25)',
                  borderRadius: 99, padding: '0.3rem 0.9rem',
                  fontSize: 10, fontWeight: 800, letterSpacing: '0.3em',
                  textTransform: 'uppercase', marginBottom: '1.5rem',
                  color: flavour.accent,
                }}>{flavour.badge}</div>
                <h3 style={{ fontFamily: serif, fontSize: 'clamp(32px,4vw,56px)', fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 1rem', lineHeight: 1 }}>{flavour.name}</h3>
                <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, marginBottom: '2rem', fontWeight: 300 }}>{flavour.tagline}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <div style={{ fontFamily: serif, fontSize: 36, fontWeight: 900 }}>{flavour.price}</div>
                  <motion.button
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
                    style={{
                      background: '#fff', color: '#000', border: 'none',
                      borderRadius: 99, padding: '0.7rem 1.8rem',
                      fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    }}
                  >Add to bag</motion.button>
                </div>
              </div>
              {/* Visual placeholder — animated toothpick shape */}
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0], y: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  style={{
                    width: 12, height: 240,
                    background: `linear-gradient(to bottom, ${flavour.accent}, ${flavour.color}, #c49060)`,
                    borderRadius: '50px 50px 4px 4px',
                    boxShadow: `0 0 40px ${flavour.color}88`,
                    position: 'relative',
                  }}
                >
                  <div style={{
                    position: 'absolute', bottom: -20, left: '50%', transform: 'translateX(-50%)',
                    width: 0, height: 0,
                    borderLeft: '6px solid transparent',
                    borderRight: '6px solid transparent',
                    borderTop: `20px solid #c49060`,
                  }} />
                  <div style={{
                    position: 'absolute', top: 30, left: '50%', transform: 'translateX(-50%)',
                    width: 20, height: 8, borderRadius: 99,
                    background: flavour.color, boxShadow: `0 0 12px ${flavour.color}`,
                  }} />
                </motion.div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* ── WHY PICKEM ──────────────────────────────────────────────────────── */}
      <section style={{ background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '7rem 2rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
              <h2 style={{ fontFamily: serif, fontSize: 'clamp(36px,5vw,64px)', fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 1rem' }}>
                Not just a toothpick.
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 16, fontWeight: 300 }}>We are turning toothpicks into a movement. Are you in?</p>
            </div>
          </Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1.5rem' }}>
            {[
              { icon: '⚡', title: 'Vitamin Infused', body: 'Powerline packs carry B1, B6, and D3. Taste good and feel good.' },
              { icon: '🎨', title: '20+ Flavours', body: 'Raspberry, Mango, Cola, Mint, Lemon — new drops every season.' },
              { icon: '♻️', title: 'Better for You', body: 'No sugar, no calories, no nicotine. Just flavour and vitamins.' },
            ].map((f, i) => (
              <Reveal key={i} delay={i * 0.1}>
                <div style={{
                  padding: '2.5rem 2rem', borderRadius: 16,
                  border: '1px solid rgba(255,255,255,0.07)',
                  background: 'rgba(255,255,255,0.03)',
                }}>
                  <div style={{ fontSize: 32, marginBottom: '1rem' }}>{f.icon}</div>
                  <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 700, marginBottom: '0.75rem' }}>{f.title}</div>
                  <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, fontWeight: 300 }}>{f.body}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── BUNDLES ─────────────────────────────────────────────────────────── */}
      <section id="bundles" style={{ padding: '8rem 2rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: '1rem' }}>Bundles</div>
              <h2 style={{ fontFamily: serif, fontSize: 'clamp(36px,5vw,64px)', fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 0.5rem' }}>Our goated bundles.</h2>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15, fontWeight: 300 }}>The greatest flavour combos.</p>
            </div>
          </Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1.5rem' }}>
            {BUNDLES.map((b, i) => (
              <Reveal key={i} delay={i * 0.1}>
                <motion.div
                  whileHover={{ y: -6, scale: 1.02 }}
                  transition={{ duration: 0.3 }}
                  style={{
                    padding: '2.5rem 2rem', borderRadius: 20,
                    border: `1px solid ${b.badge ? b.color + '55' : 'rgba(255,255,255,0.08)'}`,
                    background: b.badge ? `${b.color}11` : 'rgba(255,255,255,0.03)',
                    position: 'relative', cursor: 'pointer',
                  }}
                >
                  {b.badge && (
                    <div style={{
                      position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                      background: b.color, color: '#000', fontSize: 10, fontWeight: 800,
                      letterSpacing: '0.2em', textTransform: 'uppercase',
                      padding: '0.3rem 1rem', borderRadius: 99,
                    }}>{b.badge}</div>
                  )}
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: b.color, marginBottom: '0.75rem' }}>{b.name}</div>
                  <div style={{ fontFamily: serif, fontSize: 40, fontWeight: 900, letterSpacing: '-0.03em', marginBottom: '0.25rem' }}>{b.price}</div>
                  {b.was && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', textDecoration: 'line-through', marginBottom: '1.5rem' }}>{b.was}</div>}
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: '2rem', fontWeight: 300 }}>{b.desc}</div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {b.items.map((item, j) => (
                      <li key={j} style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ color: b.color }}>✓</span> {item}
                      </li>
                    ))}
                  </ul>
                  <motion.button
                    whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                    style={{
                      width: '100%', background: b.badge ? b.color : 'rgba(255,255,255,0.08)',
                      color: b.badge ? '#000' : '#fff', border: 'none',
                      borderRadius: 99, padding: '0.85rem', fontSize: 13, fontWeight: 700,
                      cursor: 'pointer', letterSpacing: '0.04em',
                    }}
                  >{b.name === 'Build Your Own' ? 'Customise' : 'Get this deal'}</motion.button>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── REVIEWS ─────────────────────────────────────────────────────────── */}
      <section id="reviews" style={{ padding: '4rem 2rem 8rem', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
              <h2 style={{ fontFamily: serif, fontSize: 'clamp(36px,5vw,64px)', fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 0.5rem' }}>100k+ customers already.</h2>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15, fontWeight: 300 }}>We are turning toothpicks into a movement. Are you in?</p>
            </div>
          </Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1.25rem' }}>
            {REVIEWS.map((r, i) => (
              <Reveal key={i} delay={i * 0.08}>
                <motion.div
                  whileHover={{ y: -4 }}
                  style={{
                    padding: '1.75rem', borderRadius: 16,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <div style={{ display: 'flex', gap: '2px', marginBottom: '1rem' }}>
                    {Array(r.stars).fill(0).map((_, j) => (
                      <span key={j} style={{ color: '#eab308', fontSize: 14 }}>★</span>
                    ))}
                  </div>
                  <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, marginBottom: '1.25rem', fontWeight: 300 }}>"{r.text}"</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: flavour.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700, color: '#000', transition: 'background 0.5s',
                    }}>{r.name[0]}</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{r.name} <span style={{ color: flavour.color }}>✓</span></div>
                  </div>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ──────────────────────────────────────────────────────── */}
      <section style={{ padding: '0 2rem 8rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <Reveal>
            <motion.div
              style={{
                borderRadius: 24, padding: '5rem 3rem', textAlign: 'center',
                background: flavour.bg, transition: 'background 0.8s',
                position: 'relative', overflow: 'hidden',
              }}
            >
              <motion.div
                animate={{ rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
                style={{
                  position: 'absolute', inset: -100,
                  background: `radial-gradient(ellipse at 60% 40%, ${flavour.color}22 0%, transparent 70%)`,
                  pointerEvents: 'none',
                }}
              />
              <div style={{ position: 'relative', zIndex: 2 }}>
                <h2 style={{ fontFamily: serif, fontSize: 'clamp(32px,5vw,64px)', fontWeight: 900, letterSpacing: '-0.04em', margin: '0 0 1rem', lineHeight: 1 }}>
                  Ready to pick<span style={{ fontStyle: 'italic' }}>'em</span>?
                </h2>
                <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.65)', marginBottom: '2.5rem', fontWeight: 300 }}>
                  Free shipping from £35. 30-day satisfaction guarantee.
                </p>
                <motion.a
                  href="#bundles"
                  whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.97 }}
                  style={{
                    display: 'inline-block', background: '#fff', color: '#000',
                    fontWeight: 800, fontSize: 15, letterSpacing: '0.04em',
                    textDecoration: 'none', padding: '1rem 2.8rem', borderRadius: 99,
                  }}
                >Shop Bundles</motion.a>
              </div>
            </motion.div>
          </Reveal>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.07)', padding: '3rem 2rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem',
      }}>
        <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 900 }}>pick<span style={{ color: flavour.color }}>'em</span></div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.05em' }}>© 2025 pick'em. The toothpick that got flavour.</div>
        <div style={{ display: 'flex', gap: '1.5rem', fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
          <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Privacy</a>
          <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Terms</a>
          <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Contact</a>
        </div>
      </footer>

    </div>
  )
}
