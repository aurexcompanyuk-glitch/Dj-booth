import { useEffect, useRef, useState, useCallback } from 'react'
import {
  motion, AnimatePresence, useScroll, useTransform,
  useMotionValue, useSpring, useInView
} from 'framer-motion'

// DESIGN_VARIANCE:9 / MOTION_INTENSITY:10 / VISUAL_DENSITY:3
// Scroll-driven pack explosion hero — Apple-style scrubbed cinematic sequence

const serif = "'Fraunces', Georgia, serif"
const sans  = "'Inter', sans-serif"

const FLAVOURS = [
  { id:'raspberry', name:'Ratchet Raspberry', slug:'RATCHET RASPBERRY', tag:'The toothpick that started it all.',   price:'£4.99', badge:'#1 BESTSELLER', color:'#c026d3', bg:'#0c0014', accent:'#e879f9', fruit:['🫐','🍇','✨'], rot:-14 },
  { id:'mango',     name:'Mango Madness',     slug:'MANGO MADNESS',     tag:"Let that Man-go and go for mango.",    price:'£4.99', badge:'FAN FAV',       color:'#f97316', bg:'#0f0600', accent:'#fed7aa', fruit:['🥭','🍊','💦'], rot:10  },
  { id:'cola',      name:'Cocky Cola',        slug:'COCKY COLA',        tag:'Down to earth. Up in flavour.',        price:'£4.99', badge:'CLASSIC',       color:'#ef4444', bg:'#0a0000', accent:'#fca5a5', fruit:['🍒','🥤','💥'], rot:-7  },
  { id:'mint',      name:'Minty Mint',        slug:'MINTY MINT',        tag:'Fresh enough to change the room.',     price:'£4.99', badge:'FRESH AF',      color:'#10b981', bg:'#001008', accent:'#a7f3d0', fruit:['🌿','❄️','✨'], rot:12  },
  { id:'lemon',     name:'Lightning Lemon',   slug:'LIGHTNING LEMON',   tag:'Vitamin-packed. Amplifying everything.',price:'£4.99', badge:'POWER',        color:'#eab308', bg:'#080600', accent:'#fef08a', fruit:['🍋','⚡','🌟'], rot:-9  },
]

// Toothpick positions that radiate outward on explosion
const STICKS = [
  { angle:  -80, dist: 380, color: '#c026d3', flavour: 'RATCHET\nRASPBERRY', delay: 0.00 },
  { angle:  -50, dist: 320, color: '#f97316', flavour: 'MANGO\nMADNESS',     delay: 0.04 },
  { angle:  -20, dist: 360, color: '#ef4444', flavour: 'COCKY\nCOLA',        delay: 0.08 },
  { angle:   15, dist: 340, color: '#10b981', flavour: 'MINTY\nMINT',        delay: 0.12 },
  { angle:   45, dist: 370, color: '#eab308', flavour: 'LIGHTNING\nLEMON',   delay: 0.16 },
  { angle:  -110, dist: 300, color: '#c026d3', flavour: '',                  delay: 0.06 },
  { angle:  -140, dist: 280, color: '#f97316', flavour: '',                  delay: 0.10 },
  { angle:  170,  dist: 330, color: '#ef4444', flavour: '',                  delay: 0.02 },
  { angle:  140,  dist: 290, color: '#10b981', flavour: '',                  delay: 0.14 },
  { angle:  100,  dist: 310, color: '#eab308', flavour: '',                  delay: 0.18 },
  { angle:   70,  dist: 260, color: '#c026d3', flavour: '',                  delay: 0.08 },
  { angle:  -165, dist: 350, color: '#f97316', flavour: '',                  delay: 0.06 },
]

// ─── CURSOR ────────────────────────────────────────────────────────────────────
function Cursor() {
  const mx = useMotionValue(-100)
  const my = useMotionValue(-100)
  const x  = useSpring(mx, { stiffness: 500, damping: 28 })
  const y  = useSpring(my, { stiffness: 500, damping: 28 })
  useEffect(() => {
    const move = e => { mx.set(e.clientX - 8); my.set(e.clientY - 8) }
    window.addEventListener('pointermove', move)
    return () => window.removeEventListener('pointermove', move)
  }, [mx, my])
  return (
    <motion.div style={{ position:'fixed', top:0, left:0, width:16, height:16, borderRadius:'50%',
      background:'#c026d3', pointerEvents:'none', zIndex:9999, x, y, mixBlendMode:'difference' }} />
  )
}

// ─── MAGNETIC BUTTON ───────────────────────────────────────────────────────────
function MagBtn({ children, onClick, style }) {
  const ref = useRef()
  const ox = useMotionValue(0); const sx = useSpring(ox, { stiffness: 200, damping: 15 })
  const oy = useMotionValue(0); const sy = useSpring(oy, { stiffness: 200, damping: 15 })
  const onMove = e => {
    const r = ref.current.getBoundingClientRect()
    ox.set((e.clientX - r.left - r.width/2) * 0.35)
    oy.set((e.clientY - r.top - r.height/2) * 0.35)
  }
  const onLeave = () => { ox.set(0); oy.set(0) }
  return (
    <motion.button ref={ref} onClick={onClick}
      onPointerMove={onMove} onPointerLeave={onLeave}
      style={{ x: sx, y: sy, cursor:'none', ...style }}
      whileTap={{ scale: 0.95 }}>
      {children}
    </motion.button>
  )
}

// ─── TILT CARD ─────────────────────────────────────────────────────────────────
function TiltCard({ children, style }) {
  const ref = useRef()
  const rx = useMotionValue(0); const srx = useSpring(rx, { stiffness: 180, damping: 20 })
  const ry = useMotionValue(0); const sry = useSpring(ry, { stiffness: 180, damping: 20 })
  const onMove = e => {
    const r = ref.current.getBoundingClientRect()
    const nx = (e.clientX - r.left) / r.width  - 0.5
    const ny = (e.clientY - r.top)  / r.height - 0.5
    ry.set(nx * 18); rx.set(-ny * 18)
  }
  const onLeave = () => { rx.set(0); ry.set(0) }
  return (
    <motion.div ref={ref} onPointerMove={onMove} onPointerLeave={onLeave}
      style={{ rotateX: srx, rotateY: sry, transformStyle:'preserve-3d', perspective:800, ...style }}>
      {children}
    </motion.div>
  )
}

// ─── SPLIT REVEAL ──────────────────────────────────────────────────────────────
function SplitReveal({ text, style, delay = 0 }) {
  const ref = useRef(); const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <span ref={ref} style={{ display:'inline-block', overflow:'hidden', ...style }}>
      {text.split(' ').map((w, i) => (
        <motion.span key={i} style={{ display:'inline-block', marginRight:'0.3em' }}
          initial={{ y:'110%', opacity:0 }}
          animate={inView ? { y:0, opacity:1 } : {}}
          transition={{ duration: 0.75, ease:[0.16,1,0.3,1], delay: delay + i * 0.07 }}>
          {w}
        </motion.span>
      ))}
    </span>
  )
}

// ─── PACK VISUAL (CSS) ─────────────────────────────────────────────────────────
function PackVisual({ flavour, size = 1, style }) {
  const f = FLAVOURS.find(x => x.id === flavour) || FLAVOURS[0]
  const w = 160 * size, h = 220 * size
  return (
    <div style={{ width: w, height: h, borderRadius: 20 * size, overflow:'hidden',
      boxShadow: `0 ${30*size}px ${80*size}px ${f.color}55, 0 0 0 ${2*size}px ${f.color}44`,
      background: `linear-gradient(160deg, #fff 0%, #f0f0f0 100%)`,
      display:'flex', flexDirection:'column', userSelect:'none', ...style }}>
      {/* top colour band */}
      <div style={{ background: `linear-gradient(135deg, ${f.color}, ${f.accent}55)`,
        height: h * 0.42, display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center', gap: 4 * size, padding: `${12*size}px ${8*size}px` }}>
        <div style={{ fontSize: 10 * size, fontFamily: sans, fontWeight: 800,
          color:'#fff', letterSpacing: 3 * size, opacity: 0.9 }}>PICK'EM</div>
        <div style={{ fontSize: 14 * size, fontFamily: serif, fontWeight: 900,
          color:'#fff', textAlign:'center', lineHeight: 1.1,
          textShadow:`0 ${2*size}px ${8*size}px rgba(0,0,0,0.3)` }}>
          {f.slug.split(' ').map((ln,i)=><div key={i}>{ln}</div>)}
        </div>
        {/* toothpick sticks showing out the top */}
        <div style={{ display:'flex', gap: 5*size, marginTop: 4*size }}>
          {[0,1,2,3,4].map(i => (
            <div key={i} style={{ width: 3*size, height: 28*size, borderRadius: 2*size,
              background: i % 2 === 0 ? '#fff' : f.accent,
              transform: `rotate(${(i-2)*4}deg)`,
              boxShadow: `0 0 ${6*size}px ${f.color}` }} />
          ))}
        </div>
      </div>
      {/* bottom white section */}
      <div style={{ flex:1, padding: `${10*size}px ${12*size}px`,
        display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
        <div style={{ fontSize: 8 * size, fontFamily: sans, fontWeight: 700,
          color: f.color, letterSpacing: 1.5 * size }}>7-PACK</div>
        <div style={{ display:'flex', gap: 4 * size, flexWrap:'wrap' }}>
          {f.fruit.map((fr,i) => (
            <span key={i} style={{ fontSize: 16 * size }}>{fr}</span>
          ))}
        </div>
        <div style={{ fontSize: 7 * size, fontFamily: sans, color:'#999',
          lineHeight: 1.3, fontWeight: 500 }}>{f.tag}</div>
        <div style={{ fontSize: 13 * size, fontFamily: serif, fontWeight: 700,
          color:'#111' }}>{f.price}</div>
      </div>
    </div>
  )
}

// ─── HERO SCROLL SECTION ───────────────────────────────────────────────────────
// Scroll-scrubbed: pack starts centered → shakes → EXPLODES → sticks radiate out
function HeroScrollSection() {
  const containerRef = useRef()
  const { scrollYProgress } = useScroll({ target: containerRef, offset:['start start','end end'] })

  // Phase 0→0.12: intro float, title appears
  // Phase 0.12→0.22: pack shakes / charges up
  // Phase 0.22→0.55: EXPLOSION — sticks fly out, pack scales up then settles
  // Phase 0.55→1.0: sticks settle, labels readable, CTA appears

  const packScale      = useTransform(scrollYProgress, [0, 0.10, 0.20, 0.28, 0.50], [0.7, 1.0, 1.05, 1.3, 1.1])
  const packY          = useTransform(scrollYProgress, [0, 0.10, 0.50, 0.90], ['8vh', '0vh', '-6vh', '-12vh'])
  const packOpacity    = useTransform(scrollYProgress, [0.80, 0.95], [1, 0])
  const packRotate     = useTransform(scrollYProgress, [0.12, 0.15, 0.17, 0.19, 0.22], [0, -4, 4, -3, 0])
  const bgProgress     = useTransform(scrollYProgress, [0, 0.3, 0.6, 1], ['#0a0a0a','#0c0014','#060012','#040008'])

  const titleY    = useTransform(scrollYProgress, [0, 0.08], ['40px', '0px'])
  const titleOp   = useTransform(scrollYProgress, [0, 0.08, 0.70, 0.85], [0, 1, 1, 0])

  const ctaOp   = useTransform(scrollYProgress, [0.60, 0.72], [0, 1])
  const ctaY    = useTransform(scrollYProgress, [0.60, 0.72], ['30px', '0px'])

  // Flash on explosion
  const flashOp = useTransform(scrollYProgress, [0.21, 0.23, 0.27], [0, 0.85, 0])

  // Shockwave ring
  const ringScale = useTransform(scrollYProgress, [0.22, 0.45], [0.2, 4])
  const ringOp    = useTransform(scrollYProgress, [0.22, 0.26, 0.50], [0, 0.6, 0])

  return (
    <div ref={containerRef} style={{ height:'500vh', position:'relative' }}>
      <motion.div style={{
        position:'sticky', top:0, height:'100vh', overflow:'hidden',
        background: bgProgress, display:'flex', alignItems:'center', justifyContent:'center',
      }}>
        {/* star-field background dots */}
        <Stars />

        {/* explosion flash */}
        <motion.div style={{ position:'absolute', inset:0, background:'#fff',
          opacity: flashOp, pointerEvents:'none', zIndex:20 }} />

        {/* shockwave ring */}
        <motion.div style={{
          position:'absolute', width:200, height:200, borderRadius:'50%',
          border:'3px solid #c026d3', scale: ringScale, opacity: ringOp,
          pointerEvents:'none', zIndex:15,
        }} />

        {/* radiating toothpicks */}
        {STICKS.map((s, i) => {
          const rad = (s.angle * Math.PI) / 180
          const tx  = Math.cos(rad) * s.dist
          const ty  = Math.sin(rad) * s.dist
          const stickX  = useTransform(scrollYProgress, [0.22 + s.delay, 0.55 + s.delay * 0.5], [0, tx])
          const stickY  = useTransform(scrollYProgress, [0.22 + s.delay, 0.55 + s.delay * 0.5], [0, ty])
          const stickOp = useTransform(scrollYProgress, [0.20, 0.24, 0.85, 0.98], [0, 1, 1, 0])
          const stickRot= useTransform(scrollYProgress, [0.22, 0.55], [0, s.angle + 90])
          return (
            <motion.div key={i} style={{
              position:'absolute', x: stickX, y: stickY,
              rotate: stickRot, opacity: stickOp,
              display:'flex', flexDirection:'column', alignItems:'center', gap:4,
              pointerEvents:'none', zIndex:10,
            }}>
              {/* stick */}
              <div style={{ width: 4, height: 90,
                background: `linear-gradient(to bottom, ${s.color}, ${s.color}88)`,
                borderRadius: 3,
                boxShadow: `0 0 12px ${s.color}, 0 0 24px ${s.color}66` }} />
              {/* label */}
              {s.flavour && (
                <div style={{ fontFamily: serif, fontSize: 9, fontWeight: 700,
                  color: s.color, textAlign:'center', lineHeight: 1.2,
                  whiteSpace:'pre-line', textShadow:`0 0 12px ${s.color}` }}>
                  {s.flavour}
                </div>
              )}
            </motion.div>
          )
        })}

        {/* CENTER PACK */}
        <motion.div style={{
          position:'absolute', scale: packScale, y: packY,
          opacity: packOpacity, rotate: packRotate, zIndex:12,
        }}>
          {/* glow aura behind pack */}
          <motion.div style={{
            position:'absolute', inset:'-40px', borderRadius:50,
            background: useTransform(scrollYProgress,
              [0, 0.22, 0.3],
              ['radial-gradient(circle, #c026d322 0%, transparent 70%)',
               'radial-gradient(circle, #c026d388 0%, transparent 60%)',
               'radial-gradient(circle, #c026d344 0%, transparent 70%)']),
            filter:'blur(20px)',
          }} />
          <PackVisual flavour="cola" size={1.6} />
        </motion.div>

        {/* TITLE — above */}
        <motion.div style={{
          position:'absolute', top:'10vh', left:0, right:0,
          textAlign:'center', y: titleY, opacity: titleOp, zIndex:16,
          pointerEvents:'none',
        }}>
          <div style={{ fontFamily: serif, fontStyle:'italic', fontWeight: 900,
            fontSize:'clamp(3rem, 9vw, 8rem)', color:'#fff', lineHeight:0.9,
            textShadow:'0 0 60px #c026d388' }}>
            pick'em
          </div>
          <div style={{ fontFamily: sans, fontSize:'clamp(0.7rem, 1.5vw, 1rem)',
            color:'#888', letterSpacing:'0.3em', marginTop:12, fontWeight:500 }}>
            THE TOOTHPICK THAT GOT FLAVOUR
          </div>
        </motion.div>

        {/* SCROLL HINT */}
        <motion.div style={{
          position:'absolute', bottom:'6vh', left:'50%', transform:'translateX(-50%)',
          opacity: useTransform(scrollYProgress, [0, 0.06, 0.18], [1, 1, 0]),
          zIndex:16,
        }}>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
            <div style={{ fontFamily: sans, fontSize:10, color:'#666', letterSpacing:'0.25em' }}>SCROLL TO OPEN</div>
            <motion.div style={{ width:1, height:40, background:'linear-gradient(to bottom, #c026d3, transparent)' }}
              animate={{ scaleY:[1,0.4,1], opacity:[1,0.3,1] }}
              transition={{ repeat:Infinity, duration:1.4, ease:'easeInOut' }} />
          </div>
        </motion.div>

        {/* CTA after explosion settles */}
        <motion.div style={{
          position:'absolute', bottom:'12vh', left:0, right:0,
          display:'flex', flexDirection:'column', alignItems:'center', gap:20,
          opacity: ctaOp, y: ctaY, zIndex:16,
        }}>
          <div style={{ fontFamily: serif, fontStyle:'italic',
            fontSize:'clamp(1.4rem, 3.5vw, 3rem)', color:'#fff', textAlign:'center' }}>
            5 flavours. One obsession.
          </div>
          <div style={{ display:'flex', gap:16 }}>
            <MagBtn style={{ background:'#c026d3', color:'#fff', border:'none',
              padding:'14px 36px', borderRadius:100, fontFamily:sans,
              fontWeight:700, fontSize:14, letterSpacing:'0.1em',
              boxShadow:'0 0 30px #c026d355' }}>
              SHOP NOW
            </MagBtn>
            <MagBtn style={{ background:'transparent', color:'#fff', border:'1px solid #444',
              padding:'14px 36px', borderRadius:100, fontFamily:sans,
              fontWeight:600, fontSize:14, letterSpacing:'0.1em' }}>
              SEE FLAVOURS ↓
            </MagBtn>
          </div>
        </motion.div>

        {/* scroll progress bar */}
        <motion.div style={{
          position:'absolute', left:0, top:0, width:3, height:'100vh',
          background:'#1a1a1a', zIndex:20,
        }}>
          <motion.div style={{
            width:'100%', transformOrigin:'top',
            scaleY: scrollYProgress,
            background:'linear-gradient(to bottom, #c026d3, #7c3aed)',
            height:'100%',
          }} />
        </motion.div>
      </motion.div>
    </div>
  )
}

// ─── STARFIELD ─────────────────────────────────────────────────────────────────
function Stars() {
  const stars = useRef(
    Array.from({ length: 80 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      s: 0.5 + Math.random() * 1.5,
      d: Math.random() * 4 + 1,
    }))
  )
  return (
    <div style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden' }}>
      {stars.current.map(s => (
        <motion.div key={s.id} style={{
          position:'absolute', left:`${s.x}%`, top:`${s.y}%`,
          width: s.s, height: s.s, borderRadius:'50%', background:'#fff',
        }}
          animate={{ opacity:[0.1, 0.8, 0.1] }}
          transition={{ repeat:Infinity, duration:s.d, ease:'easeInOut', delay: s.id * 0.05 }} />
      ))}
    </div>
  )
}

// ─── TICKER ────────────────────────────────────────────────────────────────────
function Ticker() {
  const items = ['RATCHET RASPBERRY','MANGO MADNESS','COCKY COLA','MINTY MINT','LIGHTNING LEMON',
                 '7-PACK','FLAVOURED TOOTHPICKS','THE TOOTHPICK THAT GOT FLAVOUR']
  const repeated = [...items, ...items, ...items]
  return (
    <div style={{ overflow:'hidden', background:'#c026d3', padding:'14px 0' }}>
      <motion.div style={{ display:'flex', gap:0, whiteSpace:'nowrap' }}
        animate={{ x: ['0%', '-33.33%'] }}
        transition={{ repeat:Infinity, duration:22, ease:'linear' }}>
        {repeated.map((t, i) => (
          <span key={i} style={{ fontFamily:sans, fontWeight:800, fontSize:12,
            letterSpacing:'0.2em', color:'#fff', padding:'0 40px' }}>
            {t} <span style={{ opacity:0.5 }}>✦</span>
          </span>
        ))}
      </motion.div>
    </div>
  )
}

// ─── FLAVOUR PANELS ────────────────────────────────────────────────────────────
function FlavourPanel({ f, index }) {
  const ref = useRef()
  const inView = useInView(ref, { once: false, margin:'-20%' })
  const isEven = index % 2 === 0

  return (
    <div ref={ref} style={{
      minHeight:'100vh', background: f.bg,
      display:'flex', alignItems:'center', justifyContent:'center',
      padding:'80px 60px', position:'relative', overflow:'hidden',
    }}>
      {/* background glow */}
      <motion.div style={{
        position:'absolute', width:'60vw', height:'60vw', borderRadius:'50%',
        background: `radial-gradient(circle, ${f.color}18 0%, transparent 70%)`,
        left: isEven ? '-10vw' : 'auto', right: isEven ? 'auto' : '-10vw',
        top:'50%', transform:'translateY(-50%)',
      }}
        animate={inView ? { scale:[1,1.08,1] } : {}}
        transition={{ repeat:Infinity, duration:4, ease:'easeInOut' }} />

      <div style={{
        maxWidth:1100, width:'100%', display:'flex',
        flexDirection: isEven ? 'row' : 'row-reverse',
        alignItems:'center', gap:80, zIndex:2,
      }}>
        {/* pack side */}
        <motion.div
          initial={{ x: isEven ? -120 : 120, opacity:0, rotate: f.rot }}
          animate={inView ? { x:0, opacity:1, rotate: f.rot * 0.3 } : {}}
          transition={{ duration:0.9, ease:[0.16,1,0.3,1] }}
          style={{ flexShrink:0 }}>
          <TiltCard>
            <PackVisual flavour={f.id} size={1.4} />
          </TiltCard>
          {/* floating fruit */}
          {f.fruit.map((fr, i) => (
            <motion.div key={i} style={{
              position:'absolute',
              top: `${-10 + i * 30}%`,
              left: isEven ? `${70 + i * 15}%` : `${-20 - i * 15}%`,
              fontSize: 28, pointerEvents:'none',
            }}
              animate={{ y:[-8,8,-8], rotate:[-5,5,-5] }}
              transition={{ repeat:Infinity, duration:2.5 + i * 0.4, ease:'easeInOut' }} />
          ))}
        </motion.div>

        {/* text side */}
        <div style={{ flex:1 }}>
          <motion.div
            initial={{ opacity:0 }} animate={inView ? { opacity:1 } : {}}
            transition={{ delay:0.15 }}
            style={{ fontFamily:sans, fontSize:11, fontWeight:700, letterSpacing:'0.25em',
              color:f.color, marginBottom:16 }}>
            {f.badge}
          </motion.div>

          <div style={{ fontFamily:serif, fontStyle:'italic', fontWeight:900,
            fontSize:'clamp(2.5rem, 6vw, 5.5rem)', lineHeight:0.9, color:'#fff',
            marginBottom:24 }}>
            <SplitReveal text={f.slug} delay={0.2} />
          </div>

          <motion.p
            initial={{ opacity:0, y:20 }} animate={inView ? { opacity:1, y:0 } : {}}
            transition={{ delay:0.4, duration:0.7 }}
            style={{ fontFamily:sans, fontSize:18, color:'#aaa', lineHeight:1.6,
              maxWidth:400, marginBottom:40 }}>
            {f.tag}
          </motion.p>

          <motion.div
            initial={{ opacity:0, y:20 }} animate={inView ? { opacity:1, y:0 } : {}}
            transition={{ delay:0.55, duration:0.7 }}
            style={{ display:'flex', alignItems:'center', gap:24 }}>
            <MagBtn style={{
              background: f.color, color:'#000', border:'none',
              padding:'14px 32px', borderRadius:100,
              fontFamily:sans, fontWeight:800, fontSize:13, letterSpacing:'0.12em',
              boxShadow:`0 0 30px ${f.color}55`, cursor:'none',
            }}>
              ADD TO CART — {f.price}
            </MagBtn>
            <div style={{ fontFamily:sans, fontSize:13, color:'#555', fontWeight:500 }}>
              7 picks per pack
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

// ─── STATS ─────────────────────────────────────────────────────────────────────
function Stats() {
  const ref = useRef()
  const inView = useInView(ref, { once: true, margin:'-80px' })
  const items = [
    { n:'5', label:'Bold flavours' },
    { n:'100%', label:'Natural extracts' },
    { n:'7', label:'Picks per pack' },
    { n:'0', label:'Bad vibes' },
  ]
  return (
    <div ref={ref} style={{ background:'#0a0a0a', padding:'120px 60px',
      borderTop:'1px solid #1a1a1a', borderBottom:'1px solid #1a1a1a' }}>
      <div style={{ maxWidth:1000, margin:'0 auto',
        display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:40 }}>
        {items.map((item, i) => (
          <motion.div key={i}
            initial={{ opacity:0, y:40 }} animate={inView ? { opacity:1, y:0 } : {}}
            transition={{ delay: i * 0.1, duration:0.7, ease:[0.16,1,0.3,1] }}
            style={{ textAlign:'center' }}>
            <div style={{ fontFamily:serif, fontStyle:'italic', fontWeight:900,
              fontSize:'clamp(2.5rem,5vw,4.5rem)', color:'#c026d3',
              lineHeight:1, marginBottom:8 }}>
              {item.n}
            </div>
            <div style={{ fontFamily:sans, fontSize:12, color:'#555',
              fontWeight:600, letterSpacing:'0.15em', textTransform:'uppercase' }}>
              {item.label}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ─── ALL FLAVOURS GRID ─────────────────────────────────────────────────────────
function AllFlavoursGrid() {
  const ref = useRef()
  const inView = useInView(ref, { once:true, margin:'-60px' })
  return (
    <div style={{ background:'#050505', padding:'120px 60px' }}>
      <div style={{ maxWidth:1100, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:80 }}>
          <div style={{ fontFamily:serif, fontStyle:'italic', fontWeight:900,
            fontSize:'clamp(2.5rem,6vw,5rem)', color:'#fff', marginBottom:16 }}>
            <SplitReveal text="All the flavours." />
          </div>
          <div style={{ fontFamily:sans, fontSize:15, color:'#555' }}>
            Pick your poison — or collect them all.
          </div>
        </div>
        <div ref={ref} style={{ display:'flex', gap:24, justifyContent:'center', flexWrap:'wrap' }}>
          {FLAVOURS.map((f, i) => (
            <motion.div key={f.id}
              initial={{ opacity:0, y:60, rotate: f.rot }}
              animate={inView ? { opacity:1, y:0, rotate: f.rot * 0.2 } : {}}
              transition={{ delay: i * 0.1, duration:0.8, ease:[0.16,1,0.3,1] }}>
              <TiltCard>
                <PackVisual flavour={f.id} size={0.95} />
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── BUNDLE SECTION ────────────────────────────────────────────────────────────
function Bundles() {
  const ref = useRef()
  const inView = useInView(ref, { once:true, margin:'-80px' })
  const tiers = [
    { name:'Starter', flavours:['cola'], count:1, price:'£4.99',  sub:'Single flavour, 7 picks', featured:false },
    { name:'Goated Bundle', flavours:['raspberry','mango','cola'], count:3, price:'£12.99', sub:'3 flavours, 21 picks — most popular', featured:true },
    { name:'Full Collection', flavours:['raspberry','mango','cola','mint','lemon'], count:5, price:'£19.99', sub:'All 5 flavours, 35 picks total', featured:false },
  ]
  return (
    <div style={{ background:'#0a0a0a', padding:'120px 60px', borderTop:'1px solid #111' }}>
      <div style={{ maxWidth:1100, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:80 }}>
          <div style={{ fontFamily:serif, fontStyle:'italic', fontWeight:900,
            fontSize:'clamp(2rem,5vw,4.5rem)', color:'#fff', marginBottom:12 }}>
            <SplitReveal text="Goated bundles." />
          </div>
          <div style={{ fontFamily:sans, fontSize:15, color:'#555' }}>Save more, flex harder.</div>
        </div>
        <div ref={ref} style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:24 }}>
          {tiers.map((t, i) => (
            <motion.div key={i}
              initial={{ opacity:0, y:50 }} animate={inView ? { opacity:1, y:0 } : {}}
              transition={{ delay: i * 0.15, duration:0.7, ease:[0.16,1,0.3,1] }}>
              <TiltCard style={{
                background: t.featured ? 'linear-gradient(135deg, #1a0020, #0d0018)' : '#111',
                borderRadius:24, padding:40,
                border: t.featured ? '1px solid #c026d388' : '1px solid #1f1f1f',
                boxShadow: t.featured ? '0 0 60px #c026d322' : 'none',
                position:'relative', overflow:'hidden',
              }}>
                {t.featured && (
                  <div style={{ position:'absolute', top:20, right:20, background:'#c026d3',
                    color:'#fff', fontFamily:sans, fontWeight:800, fontSize:9,
                    letterSpacing:'0.2em', padding:'4px 12px', borderRadius:100 }}>
                    BEST VALUE
                  </div>
                )}
                <div style={{ fontFamily:serif, fontStyle:'italic', fontWeight:700,
                  fontSize:26, color:'#fff', marginBottom:8 }}>{t.name}</div>
                <div style={{ fontFamily:sans, fontSize:12, color:'#666', marginBottom:32 }}>{t.sub}</div>
                <div style={{ display:'flex', gap:12, marginBottom:32, justifyContent:'center' }}>
                  {t.flavours.map(fid => <PackVisual key={fid} flavour={fid} size={0.5} />)}
                </div>
                <div style={{ fontFamily:serif, fontWeight:900, fontSize:32, color:t.featured ? '#c026d3' : '#fff',
                  marginBottom:24 }}>{t.price}</div>
                <MagBtn style={{
                  width:'100%', padding:'13px 0',
                  background: t.featured ? '#c026d3' : 'transparent',
                  color: t.featured ? '#fff' : '#888',
                  border: t.featured ? 'none' : '1px solid #333',
                  borderRadius:100, fontFamily:sans, fontWeight:700,
                  fontSize:13, letterSpacing:'0.1em', cursor:'none',
                }}>
                  {t.featured ? 'GRAB THE BUNDLE' : 'ADD TO CART'}
                </MagBtn>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── REVIEWS ───────────────────────────────────────────────────────────────────
function Reviews() {
  const ref = useRef()
  const inView = useInView(ref, { once:true, margin:'-80px' })
  const reviews = [
    { name:'@ksi_fanpage',    stars:5, text:'Bro these are actually mad. The mango one is pure fire 🥭' },
    { name:'@vikkstar_fan',   stars:5, text:'Can\'t stop using these. Minty mint is the one fr 🌿' },
    { name:'@harrypinero_uk', stars:5, text:'Pick\'em is the brand. Goated bundle is a must cop.' },
    { name:'@macklemoreuk',   stars:5, text:'Raspberry one hits different. These go HARD 💜' },
    { name:'@toothpick_stan', stars:5, text:'Literally addicted. Got the full collection, no cap.' },
    { name:'@flavourhead',    stars:5, text:'Cocky Cola is undefeated. Best pick I ever had 💥' },
  ]
  return (
    <div style={{ background:'#070707', padding:'120px 60px', borderTop:'1px solid #111' }}>
      <div style={{ maxWidth:1100, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:80 }}>
          <div style={{ fontFamily:serif, fontStyle:'italic', fontWeight:900,
            fontSize:'clamp(2rem,5vw,4rem)', color:'#fff', marginBottom:12 }}>
            <SplitReveal text="They're talking." />
          </div>
        </div>
        <div ref={ref} style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:20 }}>
          {reviews.map((r, i) => (
            <motion.div key={i}
              initial={{ opacity:0, y:40 }} animate={inView ? { opacity:1, y:0 } : {}}
              transition={{ delay: i * 0.1, duration:0.6 }}
              style={{ background:'#0f0f0f', borderRadius:20, padding:28,
                border:'1px solid #1a1a1a' }}>
              <div style={{ color:'#c026d3', fontSize:16, marginBottom:10 }}>{'★'.repeat(r.stars)}</div>
              <div style={{ fontFamily:sans, fontSize:15, color:'#ccc', lineHeight:1.6,
                marginBottom:16 }}>"{r.text}"</div>
              <div style={{ fontFamily:sans, fontSize:12, color:'#555', fontWeight:600 }}>{r.name}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── CTA BANNER ────────────────────────────────────────────────────────────────
function CTABanner() {
  return (
    <div style={{ background:'#c026d3', padding:'100px 60px', textAlign:'center',
      position:'relative', overflow:'hidden' }}>
      <motion.div
        animate={{ scale:[1,1.15,1], opacity:[0.3,0.6,0.3] }}
        transition={{ repeat:Infinity, duration:4 }}
        style={{ position:'absolute', width:'120vw', height:'120vw', borderRadius:'50%',
          background:'radial-gradient(circle, #ffffff22 0%, transparent 60%)',
          top:'50%', left:'50%', transform:'translate(-50%,-50%)',
          pointerEvents:'none' }} />
      <div style={{ position:'relative', zIndex:2 }}>
        <div style={{ fontFamily:serif, fontStyle:'italic', fontWeight:900,
          fontSize:'clamp(2.5rem, 7vw, 6rem)', color:'#fff', lineHeight:0.9, marginBottom:32 }}>
          Get your pick.
        </div>
        <MagBtn style={{
          background:'#fff', color:'#c026d3', border:'none',
          padding:'18px 48px', borderRadius:100,
          fontFamily:sans, fontWeight:800, fontSize:16, letterSpacing:'0.1em',
          boxShadow:'0 20px 60px rgba(0,0,0,0.3)', cursor:'none',
        }}>
          SHOP PICK'EM
        </MagBtn>
      </div>
    </div>
  )
}

// ─── FOOTER ────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <div style={{ background:'#000', padding:'60px', borderTop:'1px solid #111' }}>
      <div style={{ maxWidth:1100, margin:'0 auto',
        display:'flex', justifyContent:'space-between', alignItems:'center',
        flexWrap:'wrap', gap:24 }}>
        <div style={{ fontFamily:serif, fontStyle:'italic', fontWeight:900,
          fontSize:28, color:'#c026d3' }}>pick'em</div>
        <div style={{ fontFamily:sans, fontSize:12, color:'#444', letterSpacing:'0.15em' }}>
          THE TOOTHPICK THAT GOT FLAVOUR
        </div>
        <div style={{ display:'flex', gap:32 }}>
          {['Products','Store Locator','Customize Bundle','Contact'].map(l => (
            <span key={l} style={{ fontFamily:sans, fontSize:12, color:'#555',
              letterSpacing:'0.08em', cursor:'none', fontWeight:500 }}>{l}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── APP ───────────────────────────────────────────────────────────────────────
export default function AppPickem() {
  return (
    <div style={{ background:'#0a0a0a', color:'#fff', cursor:'none', overflowX:'hidden' }}>
      <Cursor />

      {/* Nav */}
      <motion.nav
        initial={{ y:-60, opacity:0 }} animate={{ y:0, opacity:1 }}
        transition={{ delay:0.3, duration:0.7, ease:[0.16,1,0.3,1] }}
        style={{ position:'fixed', top:0, left:0, right:0, zIndex:1000,
          display:'flex', justifyContent:'space-between', alignItems:'center',
          padding:'20px 40px',
          background:'linear-gradient(to bottom, rgba(10,10,10,0.9) 0%, transparent 100%)',
          backdropFilter:'blur(8px)' }}>
        <div style={{ fontFamily:serif, fontStyle:'italic', fontWeight:900,
          fontSize:24, color:'#fff' }}>pick'em</div>
        <div style={{ display:'flex', gap:32 }}>
          {['Flavours','Bundles','Store Locator'].map(l => (
            <span key={l} style={{ fontFamily:sans, fontSize:13, color:'#aaa',
              letterSpacing:'0.08em', fontWeight:500, cursor:'none' }}>{l}</span>
          ))}
        </div>
        <MagBtn style={{ background:'#c026d3', color:'#fff', border:'none',
          padding:'10px 24px', borderRadius:100,
          fontFamily:sans, fontWeight:700, fontSize:12, letterSpacing:'0.1em',
          cursor:'none' }}>
          SHOP NOW
        </MagBtn>
      </motion.nav>

      <HeroScrollSection />
      <Ticker />
      <AllFlavoursGrid />
      <Stats />
      {FLAVOURS.map((f, i) => <FlavourPanel key={f.id} f={f} index={i} />)}
      <Bundles />
      <Reviews />
      <CTABanner />
      <Footer />
    </div>
  )
}
