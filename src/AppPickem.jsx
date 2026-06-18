import { useEffect, useRef, useState, useCallback } from 'react'
import {
  motion, AnimatePresence, useScroll, useTransform,
  useMotionValue, useSpring, useInView, useVelocity
} from 'framer-motion'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

// ─── DESIGN READ ─────────────────────────────────────────────────────────────
// Premium consumer / playful hype-drop brand. Gen Z audience.
// DESIGN_VARIANCE: 9 / MOTION_INTENSITY: 9 / VISUAL_DENSITY: 3
// Asymmetric layouts, cinematic scroll, custom GLSL particles, physics springs.
// Font: Fraunces (display serif, italic for drama) + Inter (clean utility sans)

const serif = "'Fraunces', Georgia, serif"
const sans  = "'Inter', sans-serif"

const FLAVOURS = [
  { id:'raspberry', name:'Ratchet Raspberry', slug:'RATCHET\nRASPBERRY', tag:'The toothpick that started it all.',   price:'£4.99', badge:'#1 BESTSELLER', color:'#8b5cf6', glow:'#7c3aed', bg:'#0c0618', accent:'#c4b5fd', fruit:['🫐','🍇','✨'], rot:-12 },
  { id:'mango',     name:'Mango Madness',     slug:'MANGO\nMADNESS',     tag:'Let that Man-go and go for mango.',     price:'£4.99', badge:'FAN FAV',       color:'#f97316', glow:'#ea580c', bg:'#0f0600', accent:'#fed7aa', fruit:['🥭','🍊','💦'], rot:8 },
  { id:'cola',      name:'Cocky Cola',        slug:'COCKY\nCOLA',        tag:'Down to earth. Up in flavour.',          price:'£4.99', badge:'CLASSIC',       color:'#ef4444', glow:'#dc2626', bg:'#0a0000', accent:'#fca5a5', fruit:['🍒','🥤','💥'], rot:-6 },
  { id:'mint',      name:'Minty Mint',        slug:'MINTY\nMINT',        tag:'Fresh enough to change the room.',      price:'£4.99', badge:'FRESH AF',       color:'#10b981', glow:'#059669', bg:'#001008', accent:'#a7f3d0', fruit:['🌿','❄️','✨'], rot:10 },
  { id:'lemon',     name:'Lightning Lemon',   slug:'LIGHTNING\nLEMON',   tag:'Vitamin B1+B6. Amplifying everything.', price:'£4.99', badge:'POWER',         color:'#eab308', glow:'#ca8a04', bg:'#080600', accent:'#fef08a', fruit:['🍋','⚡','🌟'], rot:-8 },
]

// ─── GLSL PARTICLE SYSTEM ────────────────────────────────────────────────────
const VERT = `
  attribute float aSize;
  attribute float aLife;
  uniform float uTime;
  uniform vec3 uColor;
  varying float vLife;
  void main() {
    vLife = aLife;
    vec3 pos = position;
    pos.y += sin(uTime * 0.8 + position.x * 2.0) * 0.15;
    pos.x += cos(uTime * 0.6 + position.z * 1.5) * 0.08;
    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = aSize * (280.0 / -mvPos.z) * (0.5 + 0.5 * sin(uTime + aLife * 6.28));
    gl_Position = projectionMatrix * mvPos;
  }
`
const FRAG = `
  uniform vec3 uColor;
  varying float vLife;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float alpha = (1.0 - d * 2.0) * vLife * 0.75;
    gl_FragColor = vec4(uColor, alpha);
  }
`

// ─── THREE.JS CANVAS ─────────────────────────────────────────────────────────
function ParticleCanvas({ flavourIdx }) {
  const mountRef = useRef(null)
  const fidxRef  = useRef(flavourIdx)
  useEffect(() => { fidxRef.current = flavourIdx }, [flavourIdx])

  useEffect(() => {
    const el = mountRef.current
    if (!el) return
    let disposed = false, raf

    const W = el.clientWidth, H = el.clientHeight
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    el.appendChild(renderer.domElement)

    const scene  = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 80)
    camera.position.set(0, 0, 9)

    // Env map (no external load)
    try {
      const pmrem = new THREE.PMREMGenerator(renderer)
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
      pmrem.dispose()
    } catch (_) {}

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 2))
    const key = new THREE.DirectionalLight(0xffffff, 4)
    key.position.set(6, 10, 6)
    scene.add(key)
    const back = new THREE.DirectionalLight(0x8888ff, 2)
    back.position.set(-6, -4, -6)
    scene.add(back)

    // ── Toothpick geometry ────────────────────────────────────────────────────
    const pickGroup = new THREE.Group()
    const woodMat = new THREE.MeshPhysicalMaterial({ color:0xd4a574, metalness:0.05, roughness:0.45, clearcoat:0.6 })
    const tipMat  = new THREE.MeshPhysicalMaterial({ color:0xb8864e, metalness:0.05, roughness:0.55 })

    // Shaft
    pickGroup.add(Object.assign(new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 4.5, 24), woodMat), { castShadow:true }))
    // Point
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.9, 24), tipMat)
    cone.position.y = 2.7; pickGroup.add(cone)
    // Butt
    const butt = new THREE.Mesh(new THREE.SphereGeometry(0.048, 12, 8), woodMat)
    butt.position.y = -2.25; pickGroup.add(butt)

    // Colour ring (flavour band)
    const bandMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(FLAVOURS[0].color),
      emissive: new THREE.Color(FLAVOURS[0].color),
      emissiveIntensity: 0.8, metalness:0.4, roughness:0.1,
    })
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.28, 24), bandMat)
    band.position.y = -1.6; pickGroup.add(band)

    // Second band
    const band2 = bandMat.clone()
    const bandB = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.056, 0.14, 24), band2)
    bandB.position.y = 1.8; pickGroup.add(bandB)

    pickGroup.rotation.z = 0.28
    scene.add(pickGroup)

    // ── Orbiting rings ────────────────────────────────────────────────────────
    const ringMat1 = new THREE.MeshBasicMaterial({ color: new THREE.Color(FLAVOURS[0].color), transparent:true, opacity:0.12, side:THREE.DoubleSide })
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.007, 8, 90), ringMat1)
    ring1.rotation.x = Math.PI * 0.5; scene.add(ring1)
    const ringMat2 = ringMat1.clone(); ringMat2.opacity = 0.07
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(3.6, 0.004, 8, 90), ringMat2)
    ring2.rotation.x = Math.PI * 0.38; scene.add(ring2)

    // ── Custom GLSL particle system ───────────────────────────────────────────
    const N = 340
    const positions = new Float32Array(N * 3)
    const sizes     = new Float32Array(N)
    const lives     = new Float32Array(N)
    const vels      = Array.from({ length: N }, () => ({
      x: (Math.random() - 0.5) * 0.014,
      y: (Math.random() - 0.5) * 0.014 + 0.005,
      z: (Math.random() - 0.5) * 0.007,
    }))
    for (let i = 0; i < N; i++) {
      positions[i*3]   = (Math.random()-0.5)*12
      positions[i*3+1] = (Math.random()-0.5)*12
      positions[i*3+2] = (Math.random()-0.5)*5
      sizes[i] = Math.random()*3+1.2
      lives[i] = Math.random()
    }
    const pGeo = new THREE.BufferGeometry()
    pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    pGeo.setAttribute('aSize',    new THREE.BufferAttribute(sizes, 1))
    pGeo.setAttribute('aLife',    new THREE.BufferAttribute(lives, 1))
    const pMat = new THREE.ShaderMaterial({
      uniforms: { uTime:{ value:0 }, uColor:{ value: new THREE.Color(FLAVOURS[0].color) } },
      vertexShader: VERT, fragmentShader: FRAG,
      transparent:true, blending: THREE.AdditiveBlending, depthWrite:false,
    })
    scene.add(new THREE.Points(pGeo, pMat))

    // ── Animate ───────────────────────────────────────────────────────────────
    const clock = new THREE.Clock()
    const curColor  = new THREE.Color(FLAVOURS[0].color)
    const targColor = new THREE.Color(FLAVOURS[0].color)

    function tick() {
      if (disposed) return
      raf = requestAnimationFrame(tick)
      const t = clock.getElapsedTime()
      const fi = fidxRef.current

      // Colour lerp
      targColor.set(FLAVOURS[fi].color)
      curColor.lerp(targColor, 0.03)
      pMat.uniforms.uColor.value.copy(curColor)
      pMat.uniforms.uTime.value = t
      bandMat.color.copy(curColor);  bandMat.emissive.copy(curColor)
      band2.color?.copy(curColor);   bandB.material.color?.copy(curColor)
      ringMat1.color.copy(curColor); ringMat2.color.copy(curColor)

      // Toothpick idle
      pickGroup.rotation.y = t * 0.38
      pickGroup.rotation.z = 0.28 + Math.sin(t * 0.55) * 0.09
      pickGroup.position.y = Math.sin(t * 0.42) * 0.18

      // Rings
      ring1.rotation.y = t * 0.18;  ring1.rotation.z = t * 0.07
      ring2.rotation.y = -t * 0.12; ring2.rotation.x = Math.PI*0.38 + t * 0.05

      // Particle update
      const pos = pGeo.attributes.position.array
      for (let i = 0; i < N; i++) {
        lives[i] += 0.005
        if (lives[i] > 1) {
          lives[i] = 0
          pos[i*3]   = (Math.random()-0.5)*2
          pos[i*3+1] = (Math.random()-0.5)*6
          pos[i*3+2] = (Math.random()-0.5)*2
        }
        pos[i*3]   += vels[i].x
        pos[i*3+1] += vels[i].y
        pos[i*3+2] += vels[i].z
      }
      pGeo.attributes.position.needsUpdate = true

      renderer.render(scene, camera)
    }
    tick()

    const onResize = () => {
      const nW = el.clientWidth, nH = el.clientHeight
      renderer.setSize(nW, nH)
      camera.aspect = nW / nH
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

  return <div ref={mountRef} style={{ position:'absolute', inset:0 }} />
}

// ─── PRODUCT PACK ────────────────────────────────────────────────────────────
function Pack({ f, scale=1, shadow=true }) {
  return (
    <div style={{
      width:136, height:196,
      background:'#ffffff', borderRadius:20,
      border:`2px solid ${f.accent}33`,
      padding:'12px 12px 10px',
      boxShadow: shadow ? `0 32px 90px rgba(0,0,0,0.6), 0 0 0 1px ${f.color}18` : 'none',
      transform:`scale(${scale})`, transformOrigin:'center',
      userSelect:'none', flexShrink:0,
    }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
        <span style={{ fontFamily:serif, fontWeight:900, fontSize:9, color:'#111' }}>pick'em</span>
        <span style={{ fontFamily:sans, fontSize:6.5, color:'#aaa', letterSpacing:'0.03em' }}>Rip me open →</span>
      </div>
      <div style={{ fontFamily:serif, fontWeight:900, fontSize:17, lineHeight:1.0, color:f.color, letterSpacing:'-0.03em', whiteSpace:'pre-line', marginBottom:3 }}>{f.slug}</div>
      <div style={{ fontFamily:sans, fontSize:7, color:'#888', fontStyle:'italic', marginBottom:8 }}>The toothpick that got flavor.</div>
      <div style={{
        height:70, background:`linear-gradient(135deg,${f.color}14,${f.glow}08)`,
        borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:40, position:'relative', overflow:'hidden',
      }}>
        👄
        <div style={{ position:'absolute', width:2.5, height:52, background:`linear-gradient(to bottom,${f.accent},#c49060)`, borderRadius:99, transform:'rotate(-28deg)', boxShadow:`0 0 10px ${f.color}88`, left:'58%', top:'8%' }} />
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:7 }}>
        <span style={{ fontFamily:sans, fontSize:6.5, color:'#bbb' }}>No sugar coating ;)</span>
        <span style={{ fontFamily:serif, fontWeight:900, fontSize:12, color:f.color }}>20x</span>
      </div>
    </div>
  )
}

// ─── 3D TILT CARD ────────────────────────────────────────────────────────────
function TiltCard({ children, strength=15 }) {
  const ref = useRef(null)
  const rx = useSpring(useMotionValue(0), { stiffness:280, damping:22 })
  const ry = useSpring(useMotionValue(0), { stiffness:280, damping:22 })
  const scale = useSpring(1, { stiffness:280, damping:22 })

  const move = e => {
    const b = ref.current?.getBoundingClientRect()
    if (!b) return
    ry.set(((e.clientX - b.left - b.width/2) / b.width)  *  strength)
    rx.set(((e.clientY - b.top  - b.height/2) / b.height) * -strength)
  }
  const leave = () => { rx.set(0); ry.set(0); scale.set(1) }
  const enter = () => scale.set(1.07)

  return (
    <motion.div ref={ref} onMouseMove={move} onMouseLeave={leave} onMouseEnter={enter}
      style={{ rotateX:rx, rotateY:ry, scale, perspective:700, cursor:'pointer' }}
    >{children}</motion.div>
  )
}

// ─── MAGNETIC BUTTON ─────────────────────────────────────────────────────────
function MagBtn({ children, href, bg='#fff', fg='#000', style={} }) {
  const ref = useRef(null)
  const x = useSpring(0, { stiffness:250, damping:18 })
  const y = useSpring(0, { stiffness:250, damping:18 })
  const sc = useSpring(1, { stiffness:250, damping:18 })

  const move = e => {
    const b = ref.current?.getBoundingClientRect()
    if (!b) return
    x.set((e.clientX - b.left - b.width/2)  * 0.28)
    y.set((e.clientY - b.top  - b.height/2) * 0.28)
    sc.set(1.06)
  }
  const leave = () => { x.set(0); y.set(0); sc.set(1) }

  return (
    <motion.a ref={ref} href={href} onMouseMove={move} onMouseLeave={leave}
      style={{ x, y, scale:sc, display:'inline-block', background:bg, color:fg,
        fontFamily:sans, fontWeight:800, fontSize:13, letterSpacing:'0.07em',
        textTransform:'uppercase', textDecoration:'none',
        padding:'0.9rem 2.8rem', borderRadius:99, ...style }}
    >{children}</motion.a>
  )
}

// ─── SCROLL TEXT REVEAL ──────────────────────────────────────────────────────
function SplitReveal({ text, delay=0, color='#fff' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once:true, margin:'-60px' })
  const words = text.split(' ')
  return (
    <span ref={ref} style={{ display:'block', overflow:'hidden' }}>
      {words.map((w, i) => (
        <motion.span key={i}
          initial={{ y:'110%', opacity:0 }}
          animate={inView ? { y:0, opacity:1 } : {}}
          transition={{ duration:0.75, delay: delay + i*0.06, ease:[0.16,1,0.3,1] }}
          style={{ display:'inline-block', marginRight:'0.28em', color }}
        >{w}</motion.span>
      ))}
    </span>
  )
}

// ─── FLOATING FRUIT ──────────────────────────────────────────────────────────
function Fruit({ emoji, x, y, delay=0, size=28 }) {
  return (
    <motion.div
      initial={{ opacity:0, scale:0, rotate:-20 }}
      animate={{ opacity:1, scale:1, rotate:0 }}
      transition={{ duration:0.6, delay, type:'spring', bounce:0.5 }}
      style={{ position:'absolute', left:x, top:y, fontSize:size, zIndex:4, pointerEvents:'none', userSelect:'none', filter:'drop-shadow(0 8px 20px rgba(0,0,0,0.5))' }}
    >
      <motion.div animate={{ y:[0,-16,0], rotate:[0,8,-4,0] }} transition={{ duration:3.5+delay, repeat:Infinity, ease:'easeInOut' }}>
        {emoji}
      </motion.div>
    </motion.div>
  )
}

// ─── SECTION REVEAL ──────────────────────────────────────────────────────────
function FadeUp({ children, delay=0 }) {
  const ref = useRef(null)
  const v = useInView(ref, { once:true, margin:'-80px' })
  return (
    <motion.div ref={ref} initial={{ opacity:0, y:50 }} animate={v?{ opacity:1, y:0 }:{}}
      transition={{ duration:0.8, delay, ease:[0.16,1,0.3,1] }}>{children}</motion.div>
  )
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
export default function AppPickem() {
  const [fi, setFi] = useState(0)
  const f = FLAVOURS[fi]
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const handleMouse = e => {
    mouseX.set(e.clientX / window.innerWidth  - 0.5)
    mouseY.set(e.clientY / window.innerHeight - 0.5)
  }

  const cursorX = useSpring(mouseX, { stiffness:80, damping:16 })
  const cursorY = useSpring(mouseY, { stiffness:80, damping:16 })
  const parallaxX = useTransform(cursorX, [-0.5,0.5], [-18,18])
  const parallaxY = useTransform(cursorY, [-0.5,0.5], [-10,10])

  return (
    <div onMouseMove={handleMouse} style={{ background:'#050505', color:'#fff', fontFamily:sans, overflowX:'hidden' }}>

      {/* ── CUSTOM CURSOR ───────────────────────────────────────────────────── */}
      <motion.div
        style={{
          position:'fixed', top:0, left:0, zIndex:9999, pointerEvents:'none',
          x: useSpring(useTransform(mouseX,[-0.5,0.5],[-100,window?.innerWidth||1400]), {stiffness:120,damping:18}),
          y: useSpring(useTransform(mouseY,[-0.5,0.5],[-100,window?.innerHeight||900]), {stiffness:120,damping:18}),
          translateX:'-50%', translateY:'-50%',
        }}
      >
        <motion.div
          animate={{ scale:[1,1.15,1] }} transition={{ duration:2, repeat:Infinity }}
          style={{ width:18, height:18, borderRadius:'50%', background:f.color, opacity:0.7, transition:'background 0.5s', mixBlendMode:'screen' }}
        />
      </motion.div>

      {/* ── NAV ─────────────────────────────────────────────────────────────── */}
      <motion.nav initial={{ y:-70 }} animate={{ y:0 }} transition={{ duration:0.8, delay:1.2, ease:[0.16,1,0.3,1] }}
        style={{
          position:'fixed', top:0, left:0, right:0, zIndex:100,
          padding:'0 2.5rem', height:58,
          display:'flex', alignItems:'center', justifyContent:'space-between',
          background:'rgba(5,5,5,0.75)', backdropFilter:'blur(24px)',
          borderBottom:'1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div style={{ fontFamily:serif, fontWeight:900, fontSize:23, letterSpacing:'-0.03em' }}>
          pick<motion.span style={{ color:f.color }} transition={{ duration:0.4 }}>'em</motion.span>
        </div>
        <div style={{ display:'flex', gap:'2rem', fontSize:11, fontWeight:500, letterSpacing:'0.06em', textTransform:'uppercase', color:'rgba(255,255,255,0.5)' }}>
          {['flavours','bundles','reviews'].map(l=>(
            <a key={l} href={`#${l}`} style={{ textDecoration:'none', color:'inherit' }}
               onMouseEnter={e=>e.target.style.color='#fff'} onMouseLeave={e=>e.target.style.color='rgba(255,255,255,0.5)'}
            >{l}</a>
          ))}
        </div>
        <MagBtn href="#bundles" bg={f.color} fg="#000" style={{ fontSize:10, padding:'0.45rem 1.3rem', transition:'background 0.4s' }}>Shop Now</MagBtn>
      </motion.nav>

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section style={{ position:'relative', height:'100vh', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center' }}>

        {/* GLSL particle + 3D toothpick canvas */}
        <div style={{ position:'absolute', inset:0, zIndex:1 }}>
          <ParticleCanvas flavourIdx={fi} />
        </div>

        {/* Colour gradient bg */}
        <motion.div animate={{ opacity:[0.25,0.4,0.25] }} transition={{ duration:5, repeat:Infinity }}
          style={{ position:'absolute', inset:0, zIndex:0, background:`radial-gradient(ellipse at 50% 55%, ${f.color}25, transparent 70%)`, transition:'background 1s' }}
        />

        {/* Hero text — bottom-left, asymmetric */}
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.3 }}
          style={{ position:'absolute', bottom:'9vh', left:'5vw', zIndex:10, maxWidth:'52vw' }}
        >
          <motion.div initial={{ opacity:0, x:-30 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.4, duration:0.7 }}
            style={{ display:'inline-block', fontFamily:sans, fontSize:9, fontWeight:800, letterSpacing:'0.35em', textTransform:'uppercase', color:f.accent, background:`${f.color}18`, border:`1px solid ${f.color}33`, borderRadius:99, padding:'0.3rem 1rem', marginBottom:'1.4rem' }}
          >The toothpick that got flavour</motion.div>

          <div style={{ fontFamily:serif, fontSize:'clamp(58px,9.5vw,134px)', fontWeight:900, letterSpacing:'-0.05em', lineHeight:0.88, marginBottom:'1.6rem' }}>
            <SplitReveal text="Pick." delay={0.5} />
            <SplitReveal text="Flavour." delay={0.65} color={f.color} />
            <SplitReveal text="Repeat." delay={0.8} color="rgba(255,255,255,0.18)" />
          </div>

          <motion.p initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:1.1 }}
            style={{ fontSize:'clamp(14px,1.3vw,17px)', color:'rgba(255,255,255,0.45)', marginBottom:'2.4rem', fontWeight:300, maxWidth:'36ch', lineHeight:1.65 }}
          >20+ insane flavours. Vitamin-infused. 100k+ obsessed customers worldwide.</motion.p>

          <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:1.3 }}
            style={{ display:'flex', gap:'1rem', alignItems:'center', flexWrap:'wrap' }}
          >
            <MagBtn href="#bundles" bg="#ffffff" fg="#000">Get the deal</MagBtn>
            <MagBtn href="#flavours" bg="transparent" fg="#fff" style={{ border:'1px solid rgba(255,255,255,0.18)', backdropFilter:'blur(8px)' }}>Try now</MagBtn>
          </motion.div>
        </motion.div>

        {/* Floating packs — right side, parallax */}
        <motion.div style={{ position:'absolute', right:'4vw', top:'10vh', zIndex:8, x:parallaxX, y:parallaxY }}>
          {[
            { fi:2, rot:-18, dx:0,   dy:0,   sc:1.05, delay:0.3, z:5 },
            { fi:0, rot: -4, dx:-55, dy:80,  sc:1.12, delay:0.5, z:7 },
            { fi:1, rot: 14, dx:70,  dy:140, sc:0.98, delay:0.7, z:4 },
          ].map((p,i)=>(
            <motion.div key={i}
              initial={{ opacity:0, y:-60, rotate:p.rot - 15 }}
              animate={{ opacity:1, y:0,   rotate:p.rot }}
              transition={{ duration:1, delay:p.delay, ease:[0.16,1,0.3,1] }}
              style={{ position:'absolute', top:p.dy, left:p.dx, zIndex:p.z }}
            >
              <motion.div animate={{ y:[0,-12,0], rotate:[p.rot, p.rot+2, p.rot-1, p.rot] }} transition={{ duration:4+i*0.5, repeat:Infinity, delay:i*0.4, ease:'easeInOut' }}>
                <TiltCard><Pack f={FLAVOURS[p.fi]} scale={p.sc} /></TiltCard>
              </motion.div>
            </motion.div>
          ))}
          {/* Fruit around packs */}
          <Fruit emoji="🍒" x="160px" y="-20px" delay={1.0} size={30} />
          <Fruit emoji="🥭" x="-30px" y="220px" delay={1.3} size={26} />
          <Fruit emoji="💦" x="200px" y="180px" delay={1.6} size={22} />
        </motion.div>

        {/* Scroll hint */}
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:2 }}
          style={{ position:'absolute', bottom:'3.5vh', left:'50%', transform:'translateX(-50%)', zIndex:10, display:'flex', flexDirection:'column', alignItems:'center', gap:'0.5rem' }}
        >
          <motion.div animate={{ y:[0,8,0] }} transition={{ duration:1.8, repeat:Infinity }}
            style={{ width:1, height:44, background:`linear-gradient(to bottom,${f.color},transparent)` }}
          />
          <span style={{ fontFamily:sans, fontSize:8, letterSpacing:'0.3em', textTransform:'uppercase', color:'rgba(255,255,255,0.3)' }}>Scroll</span>
        </motion.div>
      </section>

      {/* ── HYPE TICKER ─────────────────────────────────────────────────────── */}
      <div style={{ overflow:'hidden', background:f.color, padding:'0.65rem 0', transition:'background 0.6s' }}>
        <motion.div animate={{ x:[0,-1600] }} transition={{ duration:14, repeat:Infinity, ease:'linear' }}
          style={{ display:'flex', gap:'2rem', whiteSpace:'nowrap', width:'max-content' }}
        >
          {Array(10).fill(['✦ KSI','✦ Macklemore','✦ Harry Pinero','✦ Vikkstar','✦ 100k+ CUSTOMERS','✦ THE TOOTHPICK THAT GOT FLAVOUR','✦ NO SUGAR COATING']).flat().map((t,i)=>(
            <span key={i} style={{ fontSize:10, fontWeight:900, letterSpacing:'0.25em', textTransform:'uppercase', color:'#000' }}>{t}</span>
          ))}
        </motion.div>
      </div>

      {/* ── STATS ───────────────────────────────────────────────────────────── */}
      <section style={{ padding:'8rem 5vw', maxWidth:1200, margin:'0 auto' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'1.5rem' }}>
          {[['100k+','Customers worldwide','🌍'],['20+','Insane flavours','🎨'],['4.9★','Average rating','⭐']].map(([n,l,icon],i)=>(
            <FadeUp key={i} delay={i*0.1}>
              <div style={{ padding:'3rem 2rem', borderRadius:24, textAlign:'center', border:'1px solid rgba(255,255,255,0.06)', background:'rgba(255,255,255,0.025)' }}>
                <div style={{ fontSize:38, marginBottom:'1rem' }}>{icon}</div>
                <div style={{ fontFamily:serif, fontSize:'clamp(40px,4vw,60px)', fontWeight:900, letterSpacing:'-0.04em' }}>{n}</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', marginTop:'0.5rem', letterSpacing:'0.05em' }}>{l}</div>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ── FLAVOUR PANELS ──────────────────────────────────────────────────── */}
      <section id="flavours">
        {FLAVOURS.map((flav, idx) => {
          const ref = useRef(null)
          const inView = useInView(ref, { once:true, margin:'-100px' })
          const even = idx % 2 === 0

          return (
            <div key={flav.id} ref={ref} style={{
              position:'relative', minHeight:'92vh', overflow:'hidden',
              display:'flex', alignItems:'center', background:flav.bg,
              borderTop:`1px solid ${flav.color}18`,
            }}>
              {/* Radial colour wash */}
              <motion.div animate={inView ? { scale:[0.8,1.25,1], opacity:[0,0.55,0.3] } : {}}
                transition={{ duration:1.6 }}
                style={{ position:'absolute', inset:'-30%', zIndex:0, borderRadius:'50%',
                  background:`radial-gradient(ellipse at 55% 45%, ${flav.color}28, transparent 70%)` }}
              />

              <div style={{ maxWidth:1200, margin:'0 auto', padding:'5rem 5vw', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'5rem', alignItems:'center', width:'100%', position:'relative', zIndex:2 }}>

                {/* Pack column */}
                <motion.div
                  initial={{ opacity:0, x: even ? -140 : 140, rotate: flav.rot-6 }}
                  animate={inView ? { opacity:1, x:0, rotate:flav.rot } : {}}
                  transition={{ duration:0.95, ease:[0.16,1,0.3,1] }}
                  style={{ display:'flex', justifyContent:'center', alignItems:'center', order: even ? 0 : 1 }}
                >
                  <div style={{ position:'relative' }}>
                    {/* Depth shadow packs */}
                    {[{ rot:flav.rot+10, sc:1.1, op:0.3, dx:18, dy:16 }, { rot:flav.rot+5, sc:1.05, op:0.5, dx:9, dy:8 }].map((s,si)=>(
                      <div key={si} style={{ position:'absolute', top:s.dy, left:s.dx, transform:`rotate(${s.rot}deg) scale(${s.sc})`, opacity:s.op, pointerEvents:'none' }}>
                        <Pack f={flav} shadow={false} />
                      </div>
                    ))}
                    {/* Main tilt card */}
                    <TiltCard strength={18}>
                      <Pack f={flav} scale={1.32} />
                    </TiltCard>
                    {/* Fruit */}
                    {flav.fruit.map((em,i)=>(
                      <motion.div key={i}
                        animate={{ y:[0,-18,0], rotate:[0,12,-6,0], scale:[1,1.08,1] }}
                        transition={{ duration:3.2+i, repeat:Infinity, delay:i*0.9 }}
                        style={{ position:'absolute', top:['-18%','80%','38%'][i], left:['88%','-18%','95%'][i], fontSize:34, filter:'drop-shadow(0 6px 16px rgba(0,0,0,0.55))', pointerEvents:'none' }}
                      >{em}</motion.div>
                    ))}
                    {/* Glow orb */}
                    <div style={{ position:'absolute', inset:-60, borderRadius:'50%', background:`radial-gradient(ellipse, ${flav.color}16, transparent 70%)`, pointerEvents:'none', zIndex:-1 }} />
                  </div>
                </motion.div>

                {/* Text column */}
                <motion.div initial={{ opacity:0, y:50 }} animate={inView?{ opacity:1, y:0 }:{}}
                  transition={{ duration:0.85, delay:0.2, ease:[0.16,1,0.3,1] }}
                  style={{ order: even ? 1 : 0 }}
                >
                  <div style={{ display:'inline-block', fontFamily:sans, fontSize:8.5, fontWeight:900, letterSpacing:'0.35em', textTransform:'uppercase', color:flav.accent, background:`${flav.color}18`, border:`1px solid ${flav.color}33`, borderRadius:99, padding:'0.28rem 0.9rem', marginBottom:'1.8rem' }}>{flav.badge}</div>

                  <h2 style={{ fontFamily:serif, fontSize:'clamp(46px,6.5vw,88px)', fontWeight:900, letterSpacing:'-0.045em', lineHeight:0.9, margin:'0 0 1.6rem', whiteSpace:'pre-line' }}>{flav.slug}</h2>

                  <div style={{ width:48, height:2, background:`${flav.color}66`, marginBottom:'1.8rem', borderRadius:99 }} />

                  <p style={{ fontSize:'clamp(15px,1.4vw,18px)', color:'rgba(255,255,255,0.55)', lineHeight:1.75, fontWeight:300, marginBottom:'2.8rem', maxWidth:'36ch' }}>{flav.tag}</p>

                  <div style={{ display:'flex', alignItems:'center', gap:'1.5rem', flexWrap:'wrap' }}>
                    <div style={{ fontFamily:serif, fontSize:46, fontWeight:900, letterSpacing:'-0.04em' }}>{flav.price}</div>
                    <MagBtn href="#bundles" bg={flav.color} fg="#000">Add to bag</MagBtn>
                    <span style={{ fontSize:11, color:'rgba(255,255,255,0.3)', letterSpacing:'0.04em' }}>20 picks / pack</span>
                  </div>
                </motion.div>
              </div>
            </div>
          )
        })}
      </section>

      {/* ── WHY SECTION ─────────────────────────────────────────────────────── */}
      <section style={{ padding:'8rem 5vw', background:'#060606', borderTop:'1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          <FadeUp>
            <div style={{ marginBottom:'4.5rem' }}>
              <div style={{ fontFamily:sans, fontSize:9, fontWeight:800, letterSpacing:'0.35em', textTransform:'uppercase', color:'rgba(255,255,255,0.3)', marginBottom:'1.2rem' }}>Why pick'em</div>
              <h2 style={{ fontFamily:serif, fontSize:'clamp(38px,5.5vw,72px)', fontWeight:900, letterSpacing:'-0.04em', margin:0, lineHeight:1 }}>Not just a toothpick.</h2>
            </div>
          </FadeUp>
          {/* Asymmetric feature grid — DESIGN_VARIANCE:9 */}
          <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr 1fr', gridTemplateRows:'auto auto', gap:'1.25rem' }}>
            {[
              { icon:'⚡', title:'Vitamin Infused', body:'Powerline packs carry B1, B6, and D3. Taste good and feel good at the same time.', span:true },
              { icon:'🎨', title:'20+ Flavours', body:'Raspberry, Mango, Cola, Mint, Lemon — new drops every season.' },
              { icon:'♻️', title:'Better For You', body:'No sugar, no calories, no nicotine. Just pure flavour.' },
              { icon:'🚀', title:'Free Shipping', body:'All orders over £35 ship free. Fast tracked delivery.' },
              { icon:'⭐', title:'4.9 Rating', body:'100k+ customers and counting. The numbers speak.' },
            ].map((item,i)=>(
              <FadeUp key={i} delay={i*0.08}>
                <motion.div whileHover={{ y:-5, borderColor:`${f.color}44` }}
                  transition={{ duration:0.25 }}
                  style={{
                    padding:'2.5rem 2rem', borderRadius:20,
                    border:'1px solid rgba(255,255,255,0.06)',
                    background:'rgba(255,255,255,0.025)',
                    gridColumn: item.span ? 'span 1' : 'auto',
                  }}
                >
                  <div style={{ fontSize:34, marginBottom:'1.1rem' }}>{item.icon}</div>
                  <div style={{ fontFamily:serif, fontSize:22, fontWeight:700, marginBottom:'0.7rem', letterSpacing:'-0.02em' }}>{item.title}</div>
                  <div style={{ fontSize:13.5, color:'rgba(255,255,255,0.45)', lineHeight:1.7, fontWeight:300 }}>{item.body}</div>
                </motion.div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── BUNDLES ─────────────────────────────────────────────────────────── */}
      <section id="bundles" style={{ padding:'8rem 5vw', background:'#050505' }}>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          <FadeUp>
            <div style={{ marginBottom:'4rem' }}>
              <div style={{ fontFamily:sans, fontSize:9, fontWeight:800, letterSpacing:'0.35em', textTransform:'uppercase', color:'rgba(255,255,255,0.3)', marginBottom:'1rem' }}>Bundles</div>
              <h2 style={{ fontFamily:serif, fontSize:'clamp(38px,5.5vw,72px)', fontWeight:900, letterSpacing:'-0.04em', margin:'0 0 0.5rem', lineHeight:1 }}>Our goated bundles.</h2>
              <p style={{ color:'rgba(255,255,255,0.35)', fontWeight:300, fontSize:15 }}>The greatest flavour combos.</p>
            </div>
          </FadeUp>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'1.5rem' }}>
            {[
              { name:'Starter', desc:'7 flavours to kick things off', price:'£24.99', was:'£49.99', color:'#6366f1', items:['7 × flavour packs','Premium carry case','Free shipping'], pop:false },
              { name:'Pro',     desc:"The full pick'em experience",   price:'£59.99', was:'£95.99', color:'#f97316', items:['14 × flavour packs','Pro carry case','Vitamin Powerline','Priority shipping'], pop:true },
              { name:'Build Your Own', desc:'You know what you like', price:'from £3.50', was:null, color:'#10b981', items:['Choose any 8 flavours','Mix + match freely','Save 25%'], pop:false },
            ].map((b,i)=>(
              <FadeUp key={i} delay={i*0.1}>
                <TiltCard strength={10}>
                  <motion.div whileHover={{ borderColor:`${b.color}66` }}
                    style={{ padding:'2.8rem 2rem', borderRadius:24, cursor:'pointer', position:'relative',
                      border:`1px solid ${b.pop ? b.color+'55' : 'rgba(255,255,255,0.07)'}`,
                      background: b.pop ? `${b.color}0e` : 'rgba(255,255,255,0.025)',
                    }}
                  >
                    {b.pop && (
                      <div style={{ position:'absolute', top:-13, left:'50%', transform:'translateX(-50%)',
                        background:b.color, color:'#000', fontSize:9, fontWeight:900, letterSpacing:'0.2em',
                        textTransform:'uppercase', padding:'0.28rem 1.1rem', borderRadius:99 }}>MOST POPULAR</div>
                    )}
                    <div style={{ fontFamily:sans, fontSize:9, fontWeight:800, letterSpacing:'0.2em', textTransform:'uppercase', color:b.color, marginBottom:'0.8rem' }}>{b.name}</div>
                    <div style={{ fontFamily:serif, fontSize:42, fontWeight:900, letterSpacing:'-0.04em' }}>{b.price}</div>
                    {b.was && <div style={{ fontSize:12, color:'rgba(255,255,255,0.25)', textDecoration:'line-through', margin:'0.2rem 0 0.8rem' }}>{b.was}</div>}
                    <div style={{ fontSize:13, color:'rgba(255,255,255,0.4)', margin:'0.75rem 0 1.75rem', fontWeight:300 }}>{b.desc}</div>
                    <ul style={{ listStyle:'none', padding:0, margin:'0 0 2.2rem', display:'flex', flexDirection:'column', gap:'0.55rem' }}>
                      {b.items.map((it,j)=>(
                        <li key={j} style={{ fontSize:13, color:'rgba(255,255,255,0.55)', display:'flex', gap:'0.5rem', alignItems:'center' }}>
                          <span style={{ color:b.color, fontSize:10 }}>✓</span>{it}
                        </li>
                      ))}
                    </ul>
                    <MagBtn href="#" bg={b.pop?b.color:'rgba(255,255,255,0.08)'} fg={b.pop?'#000':'#fff'} style={{ display:'block', textAlign:'center', width:'100%', boxSizing:'border-box' }}>
                      {b.name==='Build Your Own'?'Customise':'Get this deal'}
                    </MagBtn>
                  </motion.div>
                </TiltCard>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── REVIEWS ─────────────────────────────────────────────────────────── */}
      <section id="reviews" style={{ padding:'6rem 5vw 8rem', background:'rgba(255,255,255,0.015)', borderTop:'1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          <FadeUp>
            <div style={{ marginBottom:'3.5rem' }}>
              <h2 style={{ fontFamily:serif, fontSize:'clamp(38px,5.5vw,72px)', fontWeight:900, letterSpacing:'-0.04em', margin:'0 0 0.5rem', lineHeight:1 }}>100k+ customers already.</h2>
              <p style={{ color:'rgba(255,255,255,0.35)', fontWeight:300, fontSize:15 }}>We are turning toothpicks into a movement. Are you in?</p>
            </div>
          </FadeUp>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'1.25rem' }}>
            {[
              { name:'Blake L.',    stars:5, text:'Great toothpicks, better than all the others. My whole office is hooked.', fi:0 },
              { name:'Joseph M.',   stars:5, text:'Ordered 3 times already. The Ratchet Raspberry is genuinely unreal.', fi:1 },
              { name:'Sokratis A.', stars:5, text:'Never thought I would say this but these toothpicks changed my life.', fi:2 },
              { name:'Mr R.',       stars:5, text:'Awesome! So much better than any other toothpick. Friends all want them.', fi:3 },
              { name:'Emma T.',     stars:5, text:'The Mango Madness is insane. I carry these everywhere now.', fi:4 },
              { name:'James K.',    stars:5, text:'KSI was not lying. These are actually elite. Cocky Cola is my pick.', fi:2 },
            ].map((r,i)=>(
              <FadeUp key={i} delay={i*0.07}>
                <motion.div whileHover={{ y:-5 }} style={{ padding:'1.8rem', borderRadius:18, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ display:'flex', gap:2, marginBottom:'1rem' }}>
                    {Array(r.stars).fill(0).map((_,j)=><span key={j} style={{ color:'#eab308', fontSize:13 }}>★</span>)}
                  </div>
                  <p style={{ fontSize:14, color:'rgba(255,255,255,0.65)', lineHeight:1.72, marginBottom:'1.25rem', fontWeight:300 }}>"{r.text}"</p>
                  <div style={{ display:'flex', gap:'0.6rem', alignItems:'center' }}>
                    <div style={{ width:30, height:30, borderRadius:'50%', background:FLAVOURS[r.fi].color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'#000', flexShrink:0 }}>{r.name[0]}</div>
                    <span style={{ fontSize:13, fontWeight:600 }}>{r.name} <span style={{ color:FLAVOURS[r.fi].color }}>✓</span></span>
                  </div>
                </motion.div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <section style={{ padding:'0 5vw 8rem' }}>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          <FadeUp>
            <div style={{ borderRadius:28, overflow:'hidden', position:'relative', padding:'6rem 4rem', textAlign:'center', background:'linear-gradient(135deg,#0d0520,#1e1b4b,#3730a3)' }}>
              {/* Scattered pack bg */}
              {[{ fi:0,r:-28,x:'1%',y:'8%',op:0.2 },{ fi:2,r:16,x:'82%',y:'5%',op:0.18 },{ fi:4,r:-14,x:'86%',y:'52%',op:0.16 },{ fi:1,r:22,x:'-3%',y:'55%',op:0.18 }].map((p,i)=>(
                <div key={i} style={{ position:'absolute', left:p.x, top:p.y, opacity:p.op, transform:`rotate(${p.r}deg)`, pointerEvents:'none' }}>
                  <Pack f={FLAVOURS[p.fi]} scale={0.8} shadow={false} />
                </div>
              ))}
              <motion.div animate={{ rotate:360 }} transition={{ duration:30, repeat:Infinity, ease:'linear' }}
                style={{ position:'absolute', inset:-100, background:'radial-gradient(ellipse at 55% 40%, #7c3aed18, transparent 60%)', pointerEvents:'none' }}
              />
              <div style={{ position:'relative', zIndex:2 }}>
                <h2 style={{ fontFamily:serif, fontSize:'clamp(36px,6vw,80px)', fontWeight:900, letterSpacing:'-0.045em', margin:'0 0 1rem', lineHeight:0.95 }}>
                  Ready to pick<em>'em</em>?
                </h2>
                <p style={{ fontSize:16, color:'rgba(255,255,255,0.55)', marginBottom:'2.8rem', fontWeight:300 }}>Free shipping from £35. 30-day satisfaction guarantee.</p>
                <div style={{ display:'flex', gap:'1rem', justifyContent:'center', flexWrap:'wrap' }}>
                  <MagBtn href="#bundles" bg="#fff" fg="#000">Shop Bundles</MagBtn>
                  <MagBtn href="#flavours" bg="transparent" fg="#fff" style={{ border:'1px solid rgba(255,255,255,0.2)', backdropFilter:'blur(8px)' }}>Explore Flavours</MagBtn>
                </div>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer style={{ borderTop:'1px solid rgba(255,255,255,0.06)', padding:'2.5rem 5vw', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'1rem' }}>
        <div style={{ fontFamily:serif, fontSize:22, fontWeight:900 }}>pick<span style={{ color:f.color, transition:'color 0.5s' }}>'em</span></div>
        <div style={{ fontSize:11, color:'rgba(255,255,255,0.22)', letterSpacing:'0.04em' }}>© 2025 pick'em — The toothpick that got flavour.</div>
        <div style={{ display:'flex', gap:'1.5rem', fontSize:11, color:'rgba(255,255,255,0.3)' }}>
          {['Privacy','Terms','Contact'].map(l=><a key={l} href="#" style={{ color:'inherit', textDecoration:'none' }}>{l}</a>)}
        </div>
      </footer>
    </div>
  )
}
