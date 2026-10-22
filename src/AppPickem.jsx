import { useEffect, useRef, useState, useCallback } from 'react'
import {
  motion, AnimatePresence, useScroll, useTransform,
  useMotionValue, useSpring, useInView
} from 'framer-motion'

// DESIGN_VARIANCE:9 / MOTION_INTENSITY:9
// Bold coloured sections, auto-playing pack hero, scroll-triggered reveals

const serif = "'Fraunces', Georgia, serif"
const sans  = "'Inter', sans-serif"

const FLAVOURS = [
  { id:'raspberry', name:'Ratchet Raspberry', slug:'RATCHET\nRASPBERRY', tag:'The toothpick that started it all.',    price:'£4.99', badge:'#1 BESTSELLER', color:'#d946ef', bg:'#120018', accent:'#f0abfc', fruit:['🫐','🍇','✨'] },
  { id:'mango',     name:'Mango Madness',     slug:'MANGO\nMADNESS',     tag:"Let that Man-go and go for mango.",     price:'£4.99', badge:'FAN FAV',       color:'#f97316', bg:'#130600', accent:'#fed7aa', fruit:['🥭','🍊','💦'] },
  { id:'cola',      name:'Cocky Cola',        slug:'COCKY\nCOLA',        tag:'Down to earth. Up in flavour.',         price:'£4.99', badge:'CLASSIC',       color:'#ef4444', bg:'#130000', accent:'#fca5a5', fruit:['🍒','🥤','💥'] },
  { id:'mint',      name:'Minty Mint',        slug:'MINTY\nMINT',        tag:'Fresh enough to change the room.',      price:'£4.99', badge:'FRESH AF',      color:'#10b981', bg:'#001510', accent:'#a7f3d0', fruit:['🌿','❄️','✨'] },
  { id:'lemon',     name:'Lightning Lemon',   slug:'LIGHTNING\nLEMON',   tag:'Vitamin-packed. Amplifying everything.',price:'£4.99', badge:'POWER',         color:'#eab308', bg:'#0d0900', accent:'#fef08a', fruit:['🍋','⚡','🌟'] },
]

// Toothpick rays for the burst — defined outside component, no hooks
const RAYS = [
  { angle:-90, dist:260, color:'#d946ef', label:'RATCHET\nRASPBERRY' },
  { angle:-55, dist:210, color:'#f97316', label:'MANGO\nMADNESS' },
  { angle:-18, dist:240, color:'#ef4444', label:'COCKY\nCOLA' },
  { angle: 18, dist:220, color:'#10b981', label:'MINTY\nMINT' },
  { angle: 54, dist:250, color:'#eab308', label:'LIGHTNING\nLEMON' },
  { angle:-125, dist:180, color:'#d946ef', label:'' },
  { angle:-152, dist:200, color:'#f97316', label:'' },
  { angle: 170, dist:190, color:'#ef4444', label:'' },
  { angle: 135, dist:210, color:'#10b981', label:'' },
  { angle:  95, dist:175, color:'#eab308', label:'' },
  { angle:  72, dist:195, color:'#d946ef', label:'' },
  { angle:-168, dist:215, color:'#f97316', label:'' },
]

// ─── CURSOR ────────────────────────────────────────────────────────────────────
function Cursor() {
  const mx = useMotionValue(-100); const my = useMotionValue(-100)
  const x  = useSpring(mx, { stiffness:600, damping:30 })
  const y  = useSpring(my, { stiffness:600, damping:30 })
  useEffect(() => {
    const h = e => { mx.set(e.clientX - 8); my.set(e.clientY - 8) }
    window.addEventListener('pointermove', h)
    return () => window.removeEventListener('pointermove', h)
  }, [mx, my])
  return (
    <motion.div style={{ position:'fixed', top:0, left:0, width:16, height:16,
      borderRadius:'50%', background:'#d946ef', pointerEvents:'none',
      zIndex:9999, x, y, mixBlendMode:'difference' }} />
  )
}

// ─── MAGNETIC BUTTON ───────────────────────────────────────────────────────────
function MagBtn({ children, style, onClick }) {
  const ref = useRef()
  const ox = useMotionValue(0); const sx = useSpring(ox, { stiffness:220, damping:18 })
  const oy = useMotionValue(0); const sy = useSpring(oy, { stiffness:220, damping:18 })
  return (
    <motion.button ref={ref} onClick={onClick}
      onPointerMove={e => {
        const r = ref.current.getBoundingClientRect()
        ox.set((e.clientX - r.left - r.width/2) * 0.4)
        oy.set((e.clientY - r.top - r.height/2) * 0.4)
      }}
      onPointerLeave={() => { ox.set(0); oy.set(0) }}
      style={{ x:sx, y:sy, cursor:'none', ...style }}
      whileTap={{ scale:0.94 }}>
      {children}
    </motion.button>
  )
}

// ─── TILT CARD ─────────────────────────────────────────────────────────────────
function TiltCard({ children, style }) {
  const ref = useRef()
  const rx = useMotionValue(0); const srx = useSpring(rx, { stiffness:200, damping:22 })
  const ry = useMotionValue(0); const sry = useSpring(ry, { stiffness:200, damping:22 })
  return (
    <motion.div ref={ref}
      onPointerMove={e => {
        const r = ref.current.getBoundingClientRect()
        ry.set(((e.clientX - r.left) / r.width - 0.5) * 22)
        rx.set(-((e.clientY - r.top) / r.height - 0.5) * 22)
      }}
      onPointerLeave={() => { rx.set(0); ry.set(0) }}
      style={{ rotateX:srx, rotateY:sry, transformStyle:'preserve-3d', perspective:900, ...style }}>
      {children}
    </motion.div>
  )
}

// ─── PACK VISUAL ───────────────────────────────────────────────────────────────
function PackVisual({ flavour, size = 1 }) {
  const f = FLAVOURS.find(x => x.id === flavour) || FLAVOURS[2]
  const w = 160 * size, h = 220 * size
  return (
    <div style={{ width:w, height:h, borderRadius:20*size, overflow:'hidden', flexShrink:0,
      boxShadow:`0 ${24*size}px ${70*size}px ${f.color}44, 0 0 0 ${1.5*size}px ${f.color}33`,
      background:'linear-gradient(160deg, #ffffff 0%, #efefef 100%)' }}>
      {/* colour top */}
      <div style={{ background:`linear-gradient(145deg, ${f.color}ee, ${f.accent}66)`,
        height:h*0.44, display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center', gap:4*size, padding:`${10*size}px ${8*size}px` }}>
        <div style={{ fontFamily:sans, fontWeight:800, fontSize:9*size,
          color:'#fff', letterSpacing:3*size, opacity:0.9 }}>PICK'EM</div>
        <div style={{ fontFamily:serif, fontWeight:900, fontSize:13*size, color:'#fff',
          textAlign:'center', lineHeight:1.1, whiteSpace:'pre-line',
          textShadow:`0 ${2*size}px ${8*size}px rgba(0,0,0,0.25)` }}>{f.slug}</div>
        <div style={{ display:'flex', gap:4*size, marginTop:3*size }}>
          {[0,1,2,3,4].map(i => (
            <div key={i} style={{ width:2.5*size, height:26*size, borderRadius:2*size,
              background: i%2===0 ? 'rgba(255,255,255,0.9)' : f.accent,
              transform:`rotate(${(i-2)*5}deg)`,
              boxShadow:`0 0 ${5*size}px ${f.color}` }} />
          ))}
        </div>
      </div>
      {/* white bottom */}
      <div style={{ padding:`${9*size}px ${11*size}px`, display:'flex',
        flexDirection:'column', justifyContent:'space-between', height:h*0.56-2 }}>
        <div style={{ fontFamily:sans, fontWeight:700, fontSize:7.5*size,
          color:f.color, letterSpacing:1.5*size }}>7-PACK</div>
        <div style={{ display:'flex', gap:3*size }}>{f.fruit.map((fr,i) =>
          <span key={i} style={{ fontSize:15*size }}>{fr}</span>)}</div>
        <div style={{ fontFamily:sans, fontSize:6.5*size, color:'#999',
          lineHeight:1.3, fontWeight:500 }}>{f.tag}</div>
        <div style={{ fontFamily:serif, fontWeight:700, fontSize:12*size, color:'#111' }}>{f.price}</div>
      </div>
    </div>
  )
}

// ─── INDIVIDUAL STICK — own component so hooks are valid ───────────────────────
function BurstStick({ ray, exploded }) {
  const rad = (ray.angle * Math.PI) / 180
  const tx  = Math.cos(rad) * ray.dist
  const ty  = Math.sin(rad) * ray.dist
  return (
    <motion.div style={{
      position:'absolute', top:'50%', left:'50%',
      display:'flex', flexDirection:'column', alignItems:'center', gap:5,
      pointerEvents:'none', originX:'50%', originY:'50%',
    }}
      initial={{ x:0, y:0, rotate:0, opacity:0 }}
      animate={exploded
        ? { x: tx - 2, y: ty - 45, rotate: ray.angle + 90, opacity:1 }
        : { x:0, y:0, rotate:0, opacity:0 }}
      transition={{ type:'spring', stiffness:120, damping:14, delay: Math.random() * 0.12 }}>
      <div style={{ width:3.5, height:80,
        background:`linear-gradient(to bottom, ${ray.color}, ${ray.color}55)`,
        borderRadius:3,
        boxShadow:`0 0 10px ${ray.color}, 0 0 20px ${ray.color}66` }} />
      {ray.label && (
        <div style={{ fontFamily:serif, fontWeight:700, fontSize:8, color:ray.color,
          textAlign:'center', lineHeight:1.2, whiteSpace:'pre-line',
          textShadow:`0 0 10px ${ray.color}` }}>
          {ray.label}
        </div>
      )}
    </motion.div>
  )
}

// ─── HERO ──────────────────────────────────────────────────────────────────────
function Hero() {
  const [phase, setPhase] = useState('idle') // idle → charging → exploded → settled

  useEffect(() => {
    // auto-sequence after 1.2s
    const t1 = setTimeout(() => setPhase('charging'), 1200)
    const t2 = setTimeout(() => setPhase('exploded'), 2200)
    const t3 = setTimeout(() => setPhase('settled'), 3400)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  const packVariants = {
    idle:     { scale:0.82, rotate:0, opacity:0, y:20 },
    charging: { scale:1.0, rotate:[0,-3,3,-2,2,0], opacity:1, y:0,
      transition:{ duration:0.9, rotate:{ repeat:3, duration:0.18 } } },
    exploded: { scale:1.18, rotate:0, opacity:1, y:0,
      transition:{ duration:0.22, ease:[0.2, 0, 0.8, 1] } },
    settled:  { scale:1.0, rotate:0, opacity:1, y:0,
      transition:{ type:'spring', stiffness:160, damping:14 } },
  }

  return (
    <section style={{ minHeight:'100vh', background:'#08000f',
      display:'flex', alignItems:'center', justifyContent:'center',
      position:'relative', overflow:'hidden' }}>

      {/* starfield */}
      <Stars />

      {/* bg glow that pulses with phase */}
      <motion.div style={{
        position:'absolute', width:'70vw', height:'70vw', borderRadius:'50%',
        background:'radial-gradient(circle, #d946ef18 0%, transparent 65%)',
        pointerEvents:'none',
      }}
        animate={phase === 'exploded'
          ? { scale:[1,2.2,1.4], opacity:[0.3,0.8,0.4] }
          : { scale:1, opacity:0.3 }}
        transition={{ duration:0.6 }} />

      {/* flash */}
      <AnimatePresence>
        {phase === 'exploded' && (
          <motion.div key="flash"
            initial={{ opacity:0.9 }} animate={{ opacity:0 }} exit={{ opacity:0 }}
            transition={{ duration:0.5 }}
            style={{ position:'absolute', inset:0, background:'#fff',
              pointerEvents:'none', zIndex:30 }} />
        )}
      </AnimatePresence>

      {/* shockwave rings */}
      <AnimatePresence>
        {(phase === 'exploded' || phase === 'settled') && (
          <>
            {[0,1,2].map(i => (
              <motion.div key={i}
                initial={{ scale:0.1, opacity:0.8 }}
                animate={{ scale:3.5, opacity:0 }}
                transition={{ duration:1.1, delay:i*0.18, ease:'easeOut' }}
                style={{ position:'absolute', width:200, height:200, borderRadius:'50%',
                  border:`2px solid #d946ef`, pointerEvents:'none', zIndex:20 }} />
            ))}
          </>
        )}
      </AnimatePresence>

      {/* burst sticks */}
      {RAYS.map((ray, i) => (
        <BurstStick key={i} ray={ray} exploded={phase === 'exploded' || phase === 'settled'} />
      ))}

      {/* CENTER PACK */}
      <motion.div style={{ position:'relative', zIndex:12 }}
        variants={packVariants}
        initial="idle"
        animate={phase}>
        {/* halo */}
        <motion.div style={{
          position:'absolute', inset:'-30px', borderRadius:40,
          background:`radial-gradient(circle, #d946ef22 0%, transparent 70%)`,
          filter:'blur(16px)',
        }}
          animate={{ opacity:[0.4,0.9,0.4] }}
          transition={{ repeat:Infinity, duration:2.8 }} />
        <PackVisual flavour="cola" size={1.8} />
      </motion.div>

      {/* TITLE — fades in after burst */}
      <motion.div style={{ position:'absolute', top:'9vh', left:0, right:0, textAlign:'center', zIndex:16 }}
        initial={{ opacity:0, y:30 }}
        animate={{ opacity:1, y:0 }}
        transition={{ delay:0.4, duration:0.9, ease:[0.16,1,0.3,1] }}>
        <div style={{ fontFamily:serif, fontStyle:'italic', fontWeight:900,
          fontSize:'clamp(3.5rem, 10vw, 9rem)', color:'#fff', lineHeight:0.88,
          textShadow:'0 0 80px #d946ef66' }}>
          pick'em
        </div>
        <div style={{ fontFamily:sans, fontSize:'clamp(0.65rem, 1.4vw, 0.9rem)',
          color:'#666', letterSpacing:'0.35em', marginTop:14, fontWeight:600 }}>
          THE TOOTHPICK THAT GOT FLAVOUR
        </div>
      </motion.div>

      {/* CTAs — appear after settled */}
      <motion.div style={{ position:'absolute', bottom:'8vh', left:0, right:0,
        display:'flex', flexDirection:'column', alignItems:'center', gap:20, zIndex:16 }}
        initial={{ opacity:0, y:24 }}
        animate={phase === 'settled' ? { opacity:1, y:0 } : { opacity:0, y:24 }}
        transition={{ duration:0.8, ease:[0.16,1,0.3,1] }}>
        <div style={{ fontFamily:serif, fontStyle:'italic', fontWeight:700,
          fontSize:'clamp(1.1rem, 2.5vw, 2rem)', color:'#ccc' }}>
          5 flavours. One obsession.
        </div>
        <div style={{ display:'flex', gap:14 }}>
          <MagBtn style={{ background:'#d946ef', color:'#fff', border:'none',
            padding:'15px 40px', borderRadius:100, fontFamily:sans, fontWeight:800,
            fontSize:13, letterSpacing:'0.12em', boxShadow:'0 0 40px #d946ef44' }}>
            SHOP NOW
          </MagBtn>
          <MagBtn style={{ background:'transparent', color:'#999', border:'1px solid #333',
            padding:'15px 40px', borderRadius:100, fontFamily:sans, fontWeight:600,
            fontSize:13, letterSpacing:'0.12em' }}>
            SEE FLAVOURS ↓
          </MagBtn>
        </div>
      </motion.div>

      {/* scroll hint */}
      <motion.div style={{ position:'absolute', bottom:'2vh', left:'50%', x:'-50%', zIndex:16 }}
        animate={{ opacity:[0.4,1,0.4] }} transition={{ repeat:Infinity, duration:2 }}>
        <div style={{ fontFamily:sans, fontSize:9, color:'#555', letterSpacing:'0.3em', textAlign:'center' }}>
          SCROLL
        </div>
      </motion.div>
    </section>
  )
}

// ─── STARS ─────────────────────────────────────────────────────────────────────
function Stars() {
  const stars = useRef(
    Array.from({ length:90 }, (_, i) => ({
      id:i, x:Math.random()*100, y:Math.random()*100,
      s:0.5+Math.random()*1.8, d:1.5+Math.random()*3.5,
    }))
  )
  return (
    <div style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
      {stars.current.map(s => (
        <motion.div key={s.id} style={{ position:'absolute', left:`${s.x}%`, top:`${s.y}%`,
          width:s.s, height:s.s, borderRadius:'50%', background:'#fff' }}
          animate={{ opacity:[0.08,0.7,0.08] }}
          transition={{ repeat:Infinity, duration:s.d, delay:s.id*0.04 }} />
      ))}
    </div>
  )
}

// ─── TICKER ────────────────────────────────────────────────────────────────────
function Ticker() {
  const items = ['RATCHET RASPBERRY','MANGO MADNESS','COCKY COLA','MINTY MINT','LIGHTNING LEMON',
                 '7-PACK','FLAVOURED TOOTHPICKS','THE TOOTHPICK THAT GOT FLAVOUR']
  const rep = [...items,...items,...items]
  return (
    <div style={{ overflow:'hidden', background:'#d946ef', padding:'13px 0' }}>
      <motion.div style={{ display:'flex', whiteSpace:'nowrap' }}
        animate={{ x:['0%','-33.33%'] }} transition={{ repeat:Infinity, duration:24, ease:'linear' }}>
        {rep.map((t,i) => (
          <span key={i} style={{ fontFamily:sans, fontWeight:800, fontSize:11,
            letterSpacing:'0.22em', color:'#fff', padding:'0 44px' }}>
            {t} <span style={{ opacity:0.45 }}>✦</span>
          </span>
        ))}
      </motion.div>
    </div>
  )
}

// ─── FLAVOUR PANEL ─────────────────────────────────────────────────────────────
function FlavourPanel({ f, index }) {
  const ref = useRef()
  const inView = useInView(ref, { once:false, margin:'-15%' })
  const isEven = index % 2 === 0

  return (
    <section ref={ref} style={{ minHeight:'100vh', background:f.bg, position:'relative',
      display:'flex', alignItems:'center', overflow:'hidden' }}>

      {/* large background glow blob */}
      <div style={{ position:'absolute', width:'80vw', height:'80vw', borderRadius:'50%', zIndex:0,
        background:`radial-gradient(circle, ${f.color}14 0%, transparent 65%)`,
        left: isEven ? '-20vw' : 'auto', right: isEven ? 'auto' : '-20vw', top:'10%' }} />

      {/* accent bar on the side */}
      <div style={{ position:'absolute', top:0, bottom:0, width:3, zIndex:1,
        left: isEven ? 0 : 'auto', right: isEven ? 'auto' : 0,
        background:`linear-gradient(to bottom, transparent, ${f.color}, transparent)` }} />

      <div style={{ maxWidth:1160, width:'100%', margin:'0 auto', padding:'80px 60px',
        display:'flex', alignItems:'center', gap:80, zIndex:2,
        flexDirection: isEven ? 'row' : 'row-reverse' }}>

        {/* PACK — slides in from side */}
        <motion.div style={{ flexShrink:0 }}
          initial={{ x: isEven ? -160 : 160, opacity:0, rotate: isEven ? -18 : 18 }}
          animate={inView ? { x:0, opacity:1, rotate: isEven ? -4 : 4 } : {}}
          transition={{ duration:1.0, ease:[0.16,1,0.3,1] }}>
          <TiltCard>
            <div style={{ position:'relative' }}>
              <PackVisual flavour={f.id} size={1.5} />
              {/* floating fruit */}
              {f.fruit.map((fr, i) => (
                <motion.div key={i} style={{
                  position:'absolute',
                  top: `${-15 + i * 35}%`,
                  left: isEven ? `${90 + i*18}%` : `${-30 - i*18}%`,
                  fontSize:26, pointerEvents:'none',
                }}
                  animate={{ y:[-6,6,-6], rotate:[-4,4,-4] }}
                  transition={{ repeat:Infinity, duration:2.2+i*0.5, ease:'easeInOut' }} />
              ))}
            </div>
          </TiltCard>
        </motion.div>

        {/* TEXT */}
        <div style={{ flex:1 }}>
          <motion.div
            initial={{ opacity:0 }} animate={inView ? { opacity:1 } : {}}
            transition={{ delay:0.1 }}
            style={{ fontFamily:sans, fontWeight:800, fontSize:10, letterSpacing:'0.3em',
              color:f.color, marginBottom:18, textTransform:'uppercase' }}>
            {f.badge}
          </motion.div>

          <motion.div
            initial={{ opacity:0, y:40 }} animate={inView ? { opacity:1, y:0 } : {}}
            transition={{ delay:0.18, duration:0.85, ease:[0.16,1,0.3,1] }}
            style={{ fontFamily:serif, fontStyle:'italic', fontWeight:900,
              fontSize:'clamp(2.8rem,6.5vw,6rem)', lineHeight:0.88, color:'#fff',
              whiteSpace:'pre-line', marginBottom:28 }}>
            {f.slug}
          </motion.div>

          <motion.p
            initial={{ opacity:0, y:24 }} animate={inView ? { opacity:1, y:0 } : {}}
            transition={{ delay:0.32, duration:0.7 }}
            style={{ fontFamily:sans, fontSize:17, color:'#888', lineHeight:1.7,
              maxWidth:380, marginBottom:44 }}>
            {f.tag}
          </motion.p>

          <motion.div
            initial={{ opacity:0, y:24 }} animate={inView ? { opacity:1, y:0 } : {}}
            transition={{ delay:0.44, duration:0.7 }}
            style={{ display:'flex', alignItems:'center', gap:20, flexWrap:'wrap' }}>
            <MagBtn style={{ background:f.color, color:'#000', border:'none',
              padding:'15px 36px', borderRadius:100, fontFamily:sans,
              fontWeight:800, fontSize:13, letterSpacing:'0.12em',
              boxShadow:`0 0 40px ${f.color}55`, cursor:'none' }}>
              ADD TO CART — {f.price}
            </MagBtn>
            <span style={{ fontFamily:sans, fontSize:12, color:'#444', fontWeight:500 }}>
              7 picks per pack
            </span>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

// ─── ALL PACKS GRID ────────────────────────────────────────────────────────────
function AllPacksGrid() {
  const ref = useRef()
  const inView = useInView(ref, { once:true, margin:'-60px' })
  return (
    <section style={{ background:'#060006', padding:'130px 60px' }}>
      <div style={{ maxWidth:1160, margin:'0 auto' }}>
        <motion.div style={{ textAlign:'center', marginBottom:80 }}
          initial={{ opacity:0, y:40 }} animate={inView ? { opacity:1, y:0 } : {}}
          ref={ref} transition={{ duration:0.8 }}>
          <div style={{ fontFamily:serif, fontStyle:'italic', fontWeight:900,
            fontSize:'clamp(2.2rem,5.5vw,5rem)', color:'#fff', marginBottom:12 }}>
            All the flavours.
          </div>
          <div style={{ fontFamily:sans, fontSize:15, color:'#555' }}>
            Pick your poison — or collect them all.
          </div>
        </motion.div>
        <div style={{ display:'flex', gap:28, justifyContent:'center', flexWrap:'wrap' }}>
          {FLAVOURS.map((f, i) => (
            <motion.div key={f.id}
              initial={{ opacity:0, y:60 }}
              animate={inView ? { opacity:1, y:0 } : {}}
              transition={{ delay: i * 0.1, duration:0.8, ease:[0.16,1,0.3,1] }}>
              <TiltCard>
                <PackVisual flavour={f.id} size={1.0} />
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── STATS ─────────────────────────────────────────────────────────────────────
function Stats() {
  const ref = useRef()
  const inView = useInView(ref, { once:true, margin:'-80px' })
  const items = [
    { n:'5',    label:'Bold flavours' },
    { n:'100%', label:'Natural extracts' },
    { n:'7',    label:'Picks per pack' },
    { n:'0',    label:'Bad vibes' },
  ]
  return (
    <section ref={ref} style={{ background:'#08000f', padding:'110px 60px',
      borderTop:'1px solid #1a001f' }}>
      <div style={{ maxWidth:1000, margin:'0 auto',
        display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:40 }}>
        {items.map((item, i) => (
          <motion.div key={i} style={{ textAlign:'center' }}
            initial={{ opacity:0, y:40 }} animate={inView ? { opacity:1, y:0 } : {}}
            transition={{ delay:i*0.1, duration:0.7 }}>
            <div style={{ fontFamily:serif, fontStyle:'italic', fontWeight:900,
              fontSize:'clamp(2.5rem,5vw,5rem)', color:'#d946ef', lineHeight:1, marginBottom:8 }}>
              {item.n}
            </div>
            <div style={{ fontFamily:sans, fontSize:11, color:'#555',
              fontWeight:700, letterSpacing:'0.18em', textTransform:'uppercase' }}>
              {item.label}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

// ─── BUNDLES ───────────────────────────────────────────────────────────────────
function Bundles() {
  const ref = useRef()
  const inView = useInView(ref, { once:true, margin:'-80px' })
  const tiers = [
    { name:'Starter',       flavours:['cola'],                         count:1, price:'£4.99',  sub:'Single flavour, 7 picks',           featured:false },
    { name:'Goated Bundle', flavours:['raspberry','mango','cola'],     count:3, price:'£12.99', sub:'3 flavours — most popular',          featured:true  },
    { name:'Full Set',      flavours:['raspberry','mango','cola','mint','lemon'], count:5, price:'£19.99', sub:'All 5 flavours, 35 picks', featured:false },
  ]
  return (
    <section style={{ background:'#06000c', padding:'130px 60px', borderTop:'1px solid #111' }}>
      <div style={{ maxWidth:1160, margin:'0 auto' }}>
        <div ref={ref} style={{ textAlign:'center', marginBottom:80 }}>
          <motion.div initial={{ opacity:0, y:30 }} animate={inView ? { opacity:1, y:0 } : {}}
            transition={{ duration:0.8 }}
            style={{ fontFamily:serif, fontStyle:'italic', fontWeight:900,
              fontSize:'clamp(2rem,5vw,4.5rem)', color:'#fff', marginBottom:12 }}>
            Goated bundles.
          </motion.div>
          <motion.div initial={{ opacity:0 }} animate={inView ? { opacity:1 } : {}}
            transition={{ delay:0.2 }}
            style={{ fontFamily:sans, fontSize:15, color:'#555' }}>
            Save more, flex harder.
          </motion.div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:24 }}>
          {tiers.map((t, i) => (
            <motion.div key={i}
              initial={{ opacity:0, y:50 }} animate={inView ? { opacity:1, y:0 } : {}}
              transition={{ delay:i*0.14, duration:0.75 }}>
              <TiltCard style={{
                background: t.featured ? 'linear-gradient(145deg, #1c0024, #0e0016)' : '#0f0f0f',
                borderRadius:24, padding:'40px 36px',
                border: t.featured ? '1px solid #d946ef66' : '1px solid #1e1e1e',
                boxShadow: t.featured ? '0 0 60px #d946ef18' : 'none',
                position:'relative', overflow:'hidden',
              }}>
                {t.featured && (
                  <div style={{ position:'absolute', top:18, right:18, background:'#d946ef',
                    color:'#fff', fontFamily:sans, fontWeight:800, fontSize:9,
                    letterSpacing:'0.22em', padding:'4px 14px', borderRadius:100 }}>
                    BEST VALUE
                  </div>
                )}
                <div style={{ fontFamily:serif, fontStyle:'italic', fontWeight:700,
                  fontSize:24, color:'#fff', marginBottom:6 }}>{t.name}</div>
                <div style={{ fontFamily:sans, fontSize:12, color:'#555', marginBottom:30 }}>{t.sub}</div>
                <div style={{ display:'flex', gap:10, marginBottom:30,
                  justifyContent:'center', flexWrap:'wrap' }}>
                  {t.flavours.map(fid => <PackVisual key={fid} flavour={fid} size={0.5} />)}
                </div>
                <div style={{ fontFamily:serif, fontWeight:900, fontSize:30,
                  color: t.featured ? '#d946ef' : '#fff', marginBottom:22 }}>{t.price}</div>
                <MagBtn style={{ width:'100%', padding:'13px 0',
                  background: t.featured ? '#d946ef' : 'transparent',
                  color: t.featured ? '#fff' : '#666',
                  border: t.featured ? 'none' : '1px solid #2a2a2a',
                  borderRadius:100, fontFamily:sans, fontWeight:700,
                  fontSize:12, letterSpacing:'0.12em', cursor:'none' }}>
                  {t.featured ? 'GRAB THE BUNDLE' : 'ADD TO CART'}
                </MagBtn>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── REVIEWS ───────────────────────────────────────────────────────────────────
function Reviews() {
  const ref = useRef()
  const inView = useInView(ref, { once:true, margin:'-80px' })
  const reviews = [
    { name:'@ksi_fanpage',    stars:5, text:'Bro these are actually mad. The mango one is pure fire 🥭' },
    { name:'@vikkstar_fan',   stars:5, text:"Can't stop using these. Minty mint is the one fr 🌿" },
    { name:'@harrypinero_uk', stars:5, text:"Pick'em is the brand. Goated bundle is a must cop." },
    { name:'@macklemoreuk',   stars:5, text:'Raspberry one hits different. These go HARD 💜' },
    { name:'@toothpick_stan', stars:5, text:'Literally addicted. Got the full collection, no cap.' },
    { name:'@flavourhead',    stars:5, text:'Cocky Cola is undefeated. Best pick I ever had 💥' },
  ]
  return (
    <section ref={ref} style={{ background:'#070007', padding:'130px 60px',
      borderTop:'1px solid #111' }}>
      <div style={{ maxWidth:1160, margin:'0 auto' }}>
        <motion.div style={{ textAlign:'center', marginBottom:80 }}
          initial={{ opacity:0, y:30 }} animate={inView ? { opacity:1, y:0 } : {}}
          transition={{ duration:0.8 }}>
          <div style={{ fontFamily:serif, fontStyle:'italic', fontWeight:900,
            fontSize:'clamp(2rem,5vw,4rem)', color:'#fff', marginBottom:8 }}>
            They're talking.
          </div>
        </motion.div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:18 }}>
          {reviews.map((r,i) => (
            <motion.div key={i}
              initial={{ opacity:0, y:36 }} animate={inView ? { opacity:1, y:0 } : {}}
              transition={{ delay:i*0.09, duration:0.65 }}
              style={{ background:'#0d000d', borderRadius:20, padding:'26px 24px',
                border:'1px solid #1a001a' }}>
              <div style={{ color:'#d946ef', fontSize:15, marginBottom:10 }}>{'★'.repeat(r.stars)}</div>
              <div style={{ fontFamily:sans, fontSize:15, color:'#bbb', lineHeight:1.65,
                marginBottom:16 }}>"{r.text}"</div>
              <div style={{ fontFamily:sans, fontSize:11, color:'#444', fontWeight:600 }}>{r.name}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── CTA BANNER ────────────────────────────────────────────────────────────────
function CTABanner() {
  return (
    <section style={{ background:'#d946ef', padding:'110px 60px',
      textAlign:'center', position:'relative', overflow:'hidden' }}>
      <motion.div style={{ position:'absolute', width:'140vw', height:'140vw', borderRadius:'50%',
        background:'radial-gradient(circle, #ffffff1a 0%, transparent 55%)',
        top:'50%', left:'50%', x:'-50%', y:'-50%', pointerEvents:'none' }}
        animate={{ scale:[1,1.12,1] }} transition={{ repeat:Infinity, duration:4 }} />
      <div style={{ position:'relative', zIndex:2 }}>
        <div style={{ fontFamily:serif, fontStyle:'italic', fontWeight:900,
          fontSize:'clamp(2.5rem,7vw,7rem)', color:'#fff', lineHeight:0.88, marginBottom:36 }}>
          Get your pick.
        </div>
        <MagBtn style={{ background:'#fff', color:'#d946ef', border:'none',
          padding:'18px 52px', borderRadius:100, fontFamily:sans, fontWeight:800,
          fontSize:15, letterSpacing:'0.1em', boxShadow:'0 20px 60px rgba(0,0,0,0.25)',
          cursor:'none' }}>
          SHOP PICK'EM
        </MagBtn>
      </div>
    </section>
  )
}

// ─── FOOTER ────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{ background:'#000', padding:'60px', borderTop:'1px solid #111' }}>
      <div style={{ maxWidth:1160, margin:'0 auto',
        display:'flex', justifyContent:'space-between', alignItems:'center',
        flexWrap:'wrap', gap:24 }}>
        <div style={{ fontFamily:serif, fontStyle:'italic', fontWeight:900, fontSize:28, color:'#d946ef' }}>
          pick'em
        </div>
        <div style={{ fontFamily:sans, fontSize:11, color:'#333', letterSpacing:'0.18em' }}>
          THE TOOTHPICK THAT GOT FLAVOUR
        </div>
        <div style={{ display:'flex', gap:32 }}>
          {['Products','Store Locator','Customize Bundle','Contact'].map(l => (
            <span key={l} style={{ fontFamily:sans, fontSize:12, color:'#555',
              letterSpacing:'0.08em', fontWeight:500, cursor:'none' }}>{l}</span>
          ))}
        </div>
      </div>
    </footer>
  )
}

// ─── APP ───────────────────────────────────────────────────────────────────────
export default function AppPickem() {
  return (
    <div style={{ background:'#08000f', color:'#fff', cursor:'none', overflowX:'hidden' }}>
      <Cursor />

      {/* Fixed nav */}
      <motion.nav
        initial={{ y:-60, opacity:0 }} animate={{ y:0, opacity:1 }}
        transition={{ delay:0.2, duration:0.8, ease:[0.16,1,0.3,1] }}
        style={{ position:'fixed', top:0, left:0, right:0, zIndex:1000,
          display:'flex', justifyContent:'space-between', alignItems:'center',
          padding:'18px 40px',
          background:'linear-gradient(to bottom, rgba(8,0,15,0.95) 0%, transparent 100%)',
          backdropFilter:'blur(10px)' }}>
        <div style={{ fontFamily:serif, fontStyle:'italic', fontWeight:900, fontSize:22, color:'#fff' }}>
          pick'em
        </div>
        <div style={{ display:'flex', gap:32 }}>
          {['Flavours','Bundles','Store Locator'].map(l => (
            <span key={l} style={{ fontFamily:sans, fontSize:12, color:'#888',
              letterSpacing:'0.1em', fontWeight:500, cursor:'none' }}>{l}</span>
          ))}
        </div>
        <MagBtn style={{ background:'#d946ef', color:'#fff', border:'none',
          padding:'10px 26px', borderRadius:100, fontFamily:sans,
          fontWeight:700, fontSize:12, letterSpacing:'0.1em', cursor:'none' }}>
          SHOP NOW
        </MagBtn>
      </motion.nav>

      <Hero />
      <Ticker />
      {FLAVOURS.map((f, i) => <FlavourPanel key={f.id} f={f} index={i} />)}
      <AllPacksGrid />
      <Stats />
      <Bundles />
      <Reviews />
      <CTABanner />
      <Footer />
    </div>
  )
}
