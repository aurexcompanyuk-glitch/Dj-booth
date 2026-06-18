import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useScroll, useTransform, useInView, useMotionValue, useSpring } from 'framer-motion'

const serif = "'Fraunces', Georgia, serif"
const sans = "'Inter', sans-serif"

const FLAVOURS = [
  {
    id: 'ratchet-raspberry',
    name: 'Ratchet Raspberry',
    short: 'Ratchet\nRaspberry',
    tagline: 'The OG. The icon.\nThe one that started it all.',
    color: '#7c3aed', border: '#a78bfa', bg: '#0d0520',
    splash: 'radial-gradient(ellipse at 60% 40%, #4c1d9533 0%, #1e1b4b22 50%, transparent 80%)',
    fruit: ['🫐', '🍇', '✨'],
    price: '£4.99', badge: 'BESTSELLER',
    rot: -8, x: '-5%',
  },
  {
    id: 'mango-madness',
    name: 'Mango Madness',
    short: 'Mango\nMadness',
    tagline: "Let that Man-go\nand go for mango.",
    color: '#f97316', border: '#fed7aa', bg: '#100500',
    splash: 'radial-gradient(ellipse at 40% 60%, #f9731622 0%, #c2410c11 50%, transparent 80%)',
    fruit: ['🥭', '🍊', '💦'],
    price: '£4.99', badge: 'FAN FAV',
    rot: 6, x: '5%',
  },
  {
    id: 'cocky-cola',
    name: 'Cocky Cola',
    short: 'Cocky\nCola',
    tagline: "We reached astronomical\nheights. Down to earth now.",
    color: '#dc2626', border: '#fca5a5', bg: '#0a0000',
    splash: 'radial-gradient(ellipse at 55% 35%, #dc262622 0%, #7f1d1d11 50%, transparent 80%)',
    fruit: ['🍒', '🥤', '💥'],
    price: '£4.99', badge: 'CLASSIC',
    rot: -5, x: '-3%',
  },
  {
    id: 'minty-mint',
    name: 'Minty Mint',
    short: 'Minty\nMint',
    tagline: 'Fresh enough\nto change the room.',
    color: '#10b981', border: '#a7f3d0', bg: '#001008',
    splash: 'radial-gradient(ellipse at 45% 55%, #10b98122 0%, #065f4611 50%, transparent 80%)',
    fruit: ['🌿', '❄️', '✨'],
    price: '£4.99', badge: 'FRESH',
    rot: 9, x: '4%',
  },
  {
    id: 'lightning-lemon',
    name: 'Lightning Lemon',
    short: 'Lightning\nLemon',
    tagline: 'Vitamin B1+B6.\nAmplifying Apple energy.',
    color: '#eab308', border: '#fef08a', bg: '#0a0800',
    splash: 'radial-gradient(ellipse at 50% 50%, #eab30822 0%, #71391211 50%, transparent 80%)',
    fruit: ['🍋', '⚡', '🌟'],
    price: '£4.99', badge: 'POWER',
    rot: -7, x: '-4%',
  },
]

// ─── PRODUCT PACK CARD ───────────────────────────────────────────────────────
function PackCard({ flavour, style = {}, rotate = 0, scale = 1, shadow = true }) {
  return (
    <div style={{
      width: 148, height: 210,
      background: '#ffffff',
      borderRadius: 18,
      border: `2.5px solid ${flavour.border}44`,
      padding: '14px 14px 10px',
      position: 'relative',
      transform: `rotate(${rotate}deg) scale(${scale})`,
      boxShadow: shadow ? `0 24px 80px rgba(0,0,0,0.55), 0 0 0 1px ${flavour.color}22, inset 0 1px 0 rgba(255,255,255,0.9)` : 'none',
      transformOrigin: 'center',
      userSelect: 'none',
      ...style,
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <span style={{ fontFamily: serif, fontWeight: 700, fontSize: 9, color: '#222', letterSpacing: '-0.01em' }}>pick'em</span>
        <span style={{ fontFamily: sans, fontSize: 7, color: '#999', letterSpacing: '0.05em' }}>Rip me open →</span>
      </div>

      {/* Flavour name */}
      <div style={{
        fontFamily: serif, fontWeight: 900, fontSize: 19, lineHeight: 1.0,
        color: flavour.color, letterSpacing: '-0.03em',
        whiteSpace: 'pre-line', marginBottom: 4,
      }}>{flavour.short}</div>

      <div style={{ fontFamily: sans, fontSize: 7.5, color: '#666', fontStyle: 'italic', marginBottom: 10 }}>
        The toothpick that got flavor.
      </div>

      {/* Lips illustration (CSS) */}
      <div style={{
        height: 76, margin: '0 -2px',
        background: `linear-gradient(135deg, ${flavour.color}18 0%, ${flavour.color}08 100%)`,
        borderRadius: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 46,
        filter: 'saturate(0.8)',
        position: 'relative', overflow: 'hidden',
      }}>
        👄
        {/* Toothpick graphic */}
        <div style={{
          position: 'absolute', width: 3, height: 58,
          background: `linear-gradient(to bottom, ${flavour.border}, #c49060)`,
          borderRadius: 99, transform: 'rotate(-30deg)',
          boxShadow: `0 0 8px ${flavour.color}66`,
          left: '56%', top: '10%',
        }} />
      </div>

      {/* Bottom row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <span style={{ fontFamily: sans, fontSize: 7, color: '#aaa' }}>No sugar coating ;)</span>
        <span style={{
          fontFamily: serif, fontWeight: 900, fontSize: 13,
          color: flavour.color, letterSpacing: '-0.02em',
        }}>20x</span>
      </div>
    </div>
  )
}

// ─── TILT CARD WRAPPER ───────────────────────────────────────────────────────
function TiltPack({ flavour, rotate = 0, children }) {
  const ref = useRef(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotX = useSpring(useTransform(y, [-60, 60], [14, -14]), { stiffness: 200, damping: 20 })
  const rotY = useSpring(useTransform(x, [-60, 60], [-14, 14]), { stiffness: 200, damping: 20 })

  const handleMove = (e) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    x.set(e.clientX - rect.left - rect.width / 2)
    y.set(e.clientY - rect.top - rect.height / 2)
  }
  const handleLeave = () => { x.set(0); y.set(0) }

  return (
    <motion.div ref={ref}
      onMouseMove={handleMove} onMouseLeave={handleLeave}
      style={{ rotateX: rotX, rotateY: rotY, perspective: 800, cursor: 'pointer' }}
      whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.96 }}
      transition={{ duration: 0.3 }}
    >
      {children || <PackCard flavour={flavour} rotate={rotate} />}
    </motion.div>
  )
}

// ─── FLOATING INGREDIENT ────────────────────────────────────────────────────
function FloatEl({ emoji, x, y, delay = 0, size = 28 }) {
  return (
    <motion.div
      animate={{ y: [0, -18, 0], rotate: [0, 8, -5, 0], scale: [1, 1.08, 1] }}
      transition={{ duration: 4 + delay, repeat: Infinity, delay, ease: 'easeInOut' }}
      style={{
        position: 'absolute', left: x, top: y,
        fontSize: size, pointerEvents: 'none', userSelect: 'none',
        filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.4))',
        zIndex: 4,
      }}
    >{emoji}</motion.div>
  )
}

// ─── REVEAL ─────────────────────────────────────────────────────────────────
function Reveal({ children, delay = 0, y = 40 }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
    >{children}</motion.div>
  )
}

// ─── SCATTER HERO PACKS ──────────────────────────────────────────────────────
const HERO_PACKS = [
  { fi: 2, rotate: -18, x: '8%',  y: '12%', scale: 1.05, delay: 0.0, zIndex: 5 },
  { fi: 0, rotate:  -5, x: '30%', y: '6%',  scale: 1.12, delay: 0.1, zIndex: 7 },
  { fi: 1, rotate:  12, x: '54%', y: '10%', scale: 1.05, delay: 0.2, zIndex: 6 },
  { fi: 3, rotate: -22, x: '74%', y: '15%', scale: 0.92, delay: 0.15, zIndex: 4 },
  { fi: 4, rotate:  16, x: '85%', y: '22%', scale: 0.88, delay: 0.25, zIndex: 3 },
]

// ─── MAIN ────────────────────────────────────────────────────────────────────
export default function AppPickem() {
  const [activeFlavour, setActiveFlavour] = useState(0)
  const f = FLAVOURS[activeFlavour]

  const containerRef = useRef(null)
  const { scrollYProgress } = useScroll()
  const bgHue = useTransform(scrollYProgress, [0, 1], [270, 50])

  return (
    <div ref={containerRef} style={{ background: '#050505', color: '#fff', fontFamily: sans, overflowX: 'hidden' }}>

      {/* ── NAV ─────────────────────────────────────────────────────────────── */}
      <motion.nav
        initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.8 }}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          background: 'rgba(5,5,5,0.8)', backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          padding: '0 2.5rem', height: 60,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <div style={{ fontFamily: serif, fontWeight: 900, fontSize: 24, letterSpacing: '-0.03em' }}>
          pick<span style={{ color: f.color, transition: 'color 0.5s' }}>'em</span>
        </div>
        <div style={{ display: 'flex', gap: '2rem', fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.55)' }}>
          {['flavours', 'bundles', 'reviews'].map(l => (
            <a key={l} href={`#${l}`} style={{ textDecoration: 'none', color: 'inherit', textTransform: 'capitalize', letterSpacing: '0.05em' }}
              onMouseEnter={e => e.target.style.color = '#fff'}
              onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.55)'}
            >{l}</a>
          ))}
        </div>
        <motion.a href="#bundles" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
          style={{
            background: f.color, color: '#000', fontWeight: 800, fontSize: 11,
            letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none',
            padding: '0.5rem 1.4rem', borderRadius: 99, transition: 'background 0.4s',
          }}
        >Shop</motion.a>
      </motion.nav>

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section style={{
        position: 'relative', minHeight: '100vh', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'flex-end', paddingBottom: '8vh',
        background: '#050505',
      }}>
        {/* Animated colour splash */}
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.6, 0.4] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute', inset: 0, zIndex: 0,
            background: 'radial-gradient(ellipse at 50% 55%, #7c3aed22 0%, #dc262611 35%, transparent 70%)',
          }}
        />

        {/* Scattered packs */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 2 }}>
          {HERO_PACKS.map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: -120, rotate: p.rotate - 15 }}
              animate={{ opacity: 1, y: 0, rotate: p.rotate }}
              transition={{ duration: 1.0, delay: p.delay + 0.2, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: 'absolute', left: p.x, top: p.y,
                zIndex: p.zIndex, transformOrigin: 'center',
              }}
            >
              <motion.div
                animate={{ y: [0, -12, 0], rotate: [p.rotate, p.rotate + 2, p.rotate - 1, p.rotate] }}
                transition={{ duration: 4 + i * 0.6, repeat: Infinity, delay: i * 0.3, ease: 'easeInOut' }}
              >
                <PackCard flavour={FLAVOURS[p.fi]} rotate={0} scale={p.scale} />
              </motion.div>
            </motion.div>
          ))}

          {/* Floating ingredients */}
          <FloatEl emoji="🍒" x="4%" y="55%" delay={0}   size={32} />
          <FloatEl emoji="🥭" x="22%" y="72%" delay={1.2} size={26} />
          <FloatEl emoji="🍋" x="68%" y="65%" delay={0.7} size={24} />
          <FloatEl emoji="💦" x="80%" y="45%" delay={1.8} size={22} />
          <FloatEl emoji="🫐" x="13%" y="38%" delay={2.1} size={20} />
          <FloatEl emoji="⚡" x="90%" y="70%" delay={0.5} size={28} />
        </div>

        {/* Bottom gradient fade so packs blend into headline area */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '45%', zIndex: 3,
          background: 'linear-gradient(to top, #050505 30%, transparent)',
        }} />

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.9, ease: [0.16, 1, 0.3, 1] }}
          style={{ position: 'relative', zIndex: 10, textAlign: 'center', padding: '0 2rem' }}
        >
          <div style={{
            fontFamily: serif, fontSize: 'clamp(56px, 10vw, 140px)',
            fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 0.9,
            marginBottom: '1.4rem',
          }}>
            THE TOOTH<span style={{ color: f.color, fontStyle: 'italic', transition: 'color 0.5s' }}>PICK</span><br />
            THAT GOT<br />
            <span style={{ WebkitTextStroke: '1.5px rgba(255,255,255,0.25)', color: 'transparent' }}>FLAVOUR.</span>
          </div>
          <p style={{ fontSize: 'clamp(14px,1.5vw,17px)', color: 'rgba(255,255,255,0.5)', marginBottom: '2.2rem', fontWeight: 300 }}>
            20+ insane flavours. Vitamin-infused. 100k+ obsessed.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <motion.a href="#bundles" whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.97 }}
              style={{
                background: '#fff', color: '#000', fontWeight: 800, fontSize: 13,
                letterSpacing: '0.06em', textDecoration: 'none',
                padding: '0.85rem 2.4rem', borderRadius: 99,
              }}
            >Get the deal</motion.a>
            <motion.a href="#flavours" whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.97 }}
              style={{
                background: 'rgba(255,255,255,0.06)', color: '#fff', fontWeight: 600, fontSize: 13,
                border: '1px solid rgba(255,255,255,0.15)', textDecoration: 'none',
                padding: '0.85rem 2.4rem', borderRadius: 99, backdropFilter: 'blur(8px)',
              }}
            >Try now</motion.a>
          </div>
        </motion.div>
      </section>

      {/* ── TICKER ──────────────────────────────────────────────────────────── */}
      <div style={{ overflow: 'hidden', background: f.color, padding: '0.7rem 0', transition: 'background 0.5s' }}>
        <motion.div
          animate={{ x: [0, -1200] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
          style={{ display: 'flex', gap: '2.5rem', whiteSpace: 'nowrap', width: 'max-content' }}
        >
          {Array(6).fill(['✦ KSI', '✦ Macklemore', '✦ Harry Pinero', '✦ Vikkstar', '✦ The toothpick that got flavour', '✦ 100k+ customers']).flat().map((t, i) => (
            <span key={i} style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#000' }}>{t}</span>
          ))}
        </motion.div>
      </div>

      {/* ── FLAVOUR SHOWCASE ─────────────────────────────────────────────────── */}
      <section id="flavours">
        {FLAVOURS.map((flav, fi) => {
          const ref = useRef(null)
          const inView = useInView(ref, { once: true, margin: '-100px' })
          const fromLeft = fi % 2 === 0

          return (
            <div key={flav.id} ref={ref} style={{
              position: 'relative', minHeight: '90vh', overflow: 'hidden',
              display: 'flex', alignItems: 'center',
              background: flav.bg,
              borderTop: `1px solid ${flav.color}22`,
            }}>
              {/* Background splash */}
              <motion.div
                animate={inView ? { scale: [0.8, 1.2, 1], opacity: [0, 0.6, 0.35] } : {}}
                transition={{ duration: 1.5, ease: 'easeOut' }}
                style={{
                  position: 'absolute', inset: '-20%', zIndex: 0,
                  background: flav.splash,
                  borderRadius: '50%',
                }}
              />

              <div style={{
                maxWidth: 1100, margin: '0 auto', padding: '5rem 3rem',
                display: 'grid',
                gridTemplateColumns: fromLeft ? '1fr 1fr' : '1fr 1fr',
                gap: '4rem', alignItems: 'center',
                position: 'relative', zIndex: 2, width: '100%',
              }}>

                {/* Pack visual */}
                <motion.div
                  initial={{ opacity: 0, x: fromLeft ? -120 : 120, rotate: flav.rot - 5 }}
                  animate={inView ? { opacity: 1, x: 0, rotate: flav.rot } : {}}
                  transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                  style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', order: fromLeft ? 0 : 1 }}
                >
                  <div style={{ position: 'relative' }}>
                    {/* Shadow pack behind */}
                    <div style={{
                      position: 'absolute', top: 12, left: 12,
                      transform: `rotate(${flav.rot + 8}deg)`,
                      opacity: 0.45,
                    }}>
                      <PackCard flavour={flav} rotate={0} scale={1.08} shadow={false} />
                    </div>
                    <div style={{
                      position: 'absolute', top: 6, left: 6,
                      transform: `rotate(${flav.rot + 4}deg)`,
                      opacity: 0.65,
                    }}>
                      <PackCard flavour={flav} rotate={0} scale={1.04} shadow={false} />
                    </div>

                    {/* Main pack with tilt */}
                    <TiltPack flavour={flav} rotate={flav.rot}>
                      <PackCard flavour={flav} rotate={0} scale={1.3} />
                    </TiltPack>

                    {/* Floating fruit */}
                    {flav.fruit.map((emoji, i) => (
                      <motion.div
                        key={i}
                        animate={{ y: [0, -14, 0], rotate: [0, 10, -5, 0] }}
                        transition={{ duration: 3 + i, repeat: Infinity, delay: i * 0.8 }}
                        style={{
                          position: 'absolute',
                          top: `${['-15%', '80%', '40%'][i]}`,
                          left: `${['85%', '-15%', '90%'][i]}`,
                          fontSize: 32, filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.5))',
                        }}
                      >{emoji}</motion.div>
                    ))}
                  </div>
                </motion.div>

                {/* Text */}
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  style={{ order: fromLeft ? 1 : 0 }}
                >
                  <div style={{
                    display: 'inline-block', background: `${flav.color}22`,
                    border: `1px solid ${flav.color}44`, borderRadius: 99,
                    padding: '0.3rem 1rem', fontSize: 9, fontWeight: 800,
                    letterSpacing: '0.3em', textTransform: 'uppercase',
                    color: flav.border, marginBottom: '1.5rem',
                  }}>{flav.badge}</div>

                  <h2 style={{
                    fontFamily: serif, fontSize: 'clamp(44px, 6vw, 80px)',
                    fontWeight: 900, letterSpacing: '-0.04em',
                    lineHeight: 0.92, margin: '0 0 1.5rem',
                    whiteSpace: 'pre-line',
                  }}>{flav.short}</h2>

                  <p style={{
                    fontSize: 'clamp(15px, 1.4vw, 18px)', color: 'rgba(255,255,255,0.6)',
                    lineHeight: 1.7, fontWeight: 300, whiteSpace: 'pre-line',
                    marginBottom: '2.5rem',
                  }}>{flav.tagline}</p>

                  <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ fontFamily: serif, fontSize: 42, fontWeight: 900, letterSpacing: '-0.04em' }}>{flav.price}</div>
                    <motion.button
                      whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.97 }}
                      style={{
                        background: flav.color, color: '#000', border: 'none',
                        borderRadius: 99, padding: '0.8rem 2rem',
                        fontSize: 13, fontWeight: 800, cursor: 'pointer',
                        letterSpacing: '0.04em',
                      }}
                    >Add to bag</motion.button>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.05em' }}>20 picks per pack</span>
                  </div>
                </motion.div>
              </div>
            </div>
          )
        })}
      </section>

      {/* ── STATS ───────────────────────────────────────────────────────────── */}
      <section style={{ padding: '7rem 2rem', background: '#070707', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <Reveal>
            <h2 style={{ fontFamily: serif, fontSize: 'clamp(36px,6vw,72px)', fontWeight: 900, letterSpacing: '-0.04em', textAlign: 'center', margin: '0 0 4rem' }}>
              Not just a toothpick.
            </h2>
          </Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1.5rem' }}>
            {[
              { n: '100k+', l: 'Customers worldwide', icon: '🌍' },
              { n: '20+',   l: 'Insane flavours',     icon: '🎨' },
              { n: '4.9★',  l: 'Average rating',      icon: '⭐' },
            ].map((s, i) => (
              <Reveal key={i} delay={i * 0.1}>
                <div style={{
                  padding: '2.5rem', borderRadius: 20, textAlign: 'center',
                  border: '1px solid rgba(255,255,255,0.07)',
                  background: 'rgba(255,255,255,0.025)',
                }}>
                  <div style={{ fontSize: 36, marginBottom: '0.75rem' }}>{s.icon}</div>
                  <div style={{ fontFamily: serif, fontSize: 'clamp(36px,4vw,52px)', fontWeight: 900, letterSpacing: '-0.04em' }}>{s.n}</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: '0.5rem' }}>{s.l}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── BUNDLES ─────────────────────────────────────────────────────────── */}
      <section id="bundles" style={{ padding: '8rem 2rem', background: '#050505' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.35em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: '1rem' }}>Bundles</div>
              <h2 style={{ fontFamily: serif, fontSize: 'clamp(36px,5vw,68px)', fontWeight: 900, letterSpacing: '-0.04em', margin: '0 0 0.5rem' }}>Our goated bundles.</h2>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 300 }}>The greatest flavour combos.</p>
            </div>
          </Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1.5rem' }}>
            {[
              { name: 'Starter', desc: '7 flavours to kick things off', price: '£24.99', was: '£49.99', color: '#6366f1', items: ['7 × flavour packs', 'Carry case', 'Free shipping'], popular: false },
              { name: 'Pro', desc: "The full pick'em experience", price: '£59.99', was: '£95.99', color: '#f97316', items: ['14 × flavour packs', 'Pro carry case', 'Vitamin Powerline', 'Priority shipping'], popular: true },
              { name: 'Build Your Own', desc: 'You know what you like', price: 'from £3.50', was: null, color: '#10b981', items: ['Choose any 8 flavours', 'Mix + match freely', 'Save 25%'], popular: false },
            ].map((b, i) => (
              <Reveal key={i} delay={i * 0.1}>
                <motion.div
                  whileHover={{ y: -8, scale: 1.02 }}
                  transition={{ duration: 0.3 }}
                  style={{
                    padding: '2.5rem 2rem', borderRadius: 22, cursor: 'pointer',
                    border: `1px solid ${b.popular ? b.color + '55' : 'rgba(255,255,255,0.07)'}`,
                    background: b.popular ? `${b.color}0d` : 'rgba(255,255,255,0.03)',
                    position: 'relative',
                  }}
                >
                  {b.popular && (
                    <div style={{
                      position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)',
                      background: b.color, color: '#000', fontSize: 9, fontWeight: 900,
                      letterSpacing: '0.2em', textTransform: 'uppercase',
                      padding: '0.3rem 1.1rem', borderRadius: 99,
                    }}>MOST POPULAR</div>
                  )}
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: b.color, marginBottom: '0.75rem' }}>{b.name}</div>
                  <div style={{ fontFamily: serif, fontSize: 38, fontWeight: 900, letterSpacing: '-0.03em' }}>{b.price}</div>
                  {b.was && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textDecoration: 'line-through', marginBottom: '0.5rem' }}>{b.was}</div>}
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: '0.75rem 0 1.5rem', fontWeight: 300 }}>{b.desc}</div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {b.items.map((item, j) => (
                      <li key={j} style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span style={{ color: b.color }}>✓</span>{item}
                      </li>
                    ))}
                  </ul>
                  <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                    style={{
                      width: '100%', background: b.popular ? b.color : 'rgba(255,255,255,0.08)',
                      color: b.popular ? '#000' : '#fff', border: 'none',
                      borderRadius: 99, padding: '0.85rem', fontSize: 13, fontWeight: 700,
                      cursor: 'pointer', letterSpacing: '0.03em',
                    }}
                  >{b.name === 'Build Your Own' ? 'Customise' : 'Get this deal'}</motion.button>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── REVIEWS ─────────────────────────────────────────────────────────── */}
      <section id="reviews" style={{ padding: '6rem 2rem 8rem', background: '#070707', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
              <h2 style={{ fontFamily: serif, fontSize: 'clamp(36px,5vw,68px)', fontWeight: 900, letterSpacing: '-0.04em', margin: '0 0 0.5rem' }}>100k+ customers already.</h2>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 300 }}>We are turning toothpicks into a movement. Are you in?</p>
            </div>
          </Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1.25rem' }}>
            {[
              { name: 'Blake L.', stars: 5, text: 'Great toothpicks, better than all the others. My whole office is hooked.', flav: 0 },
              { name: 'Joseph M.', stars: 5, text: 'Ordered 3 times already. The Ratchet Raspberry is genuinely unreal.', flav: 1 },
              { name: 'Sokratis A.', stars: 5, text: 'Never thought I would say this but these toothpicks changed my life.', flav: 2 },
              { name: 'Mr R.', stars: 5, text: 'Awesome! So much better than any other toothpick. Friends all want them.', flav: 3 },
              { name: 'Emma T.', stars: 5, text: 'The Mango Madness is insane. I carry these everywhere now.', flav: 4 },
              { name: 'James K.', stars: 5, text: 'KSI was not lying. These are actually elite. Cocky Cola is my pick.', flav: 2 },
            ].map((r, i) => (
              <Reveal key={i} delay={i * 0.07}>
                <motion.div whileHover={{ y: -4 }}
                  style={{
                    padding: '1.75rem', borderRadius: 16,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <div style={{ display: 'flex', gap: '2px', marginBottom: '1rem' }}>
                    {Array(r.stars).fill(0).map((_, j) => <span key={j} style={{ color: '#eab308', fontSize: 13 }}>★</span>)}
                  </div>
                  <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, marginBottom: '1.25rem', fontWeight: 300 }}>"{r.text}"</p>
                  <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                      background: FLAVOURS[r.flav].color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 800, color: '#000',
                    }}>{r.name[0]}</div>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{r.name} <span style={{ color: FLAVOURS[r.flav].color }}>✓</span></span>
                  </div>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────────────────────── */}
      <section style={{ padding: '0 2rem 8rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <Reveal>
            <div style={{
              borderRadius: 28, overflow: 'hidden', position: 'relative',
              background: 'linear-gradient(135deg, #1e1b4b 0%, #3730a3 40%, #7c3aed 100%)',
              padding: '5rem 3rem', textAlign: 'center',
            }}>
              {/* Scattered packs in background */}
              {[
                { fi: 0, rot: -25, x: '2%', y: '10%', op: 0.25 },
                { fi: 2, rot: 18, x: '80%', y: '5%', op: 0.2 },
                { fi: 4, rot: -12, x: '88%', y: '55%', op: 0.18 },
                { fi: 1, rot: 22, x: '-2%', y: '60%', op: 0.2 },
              ].map((p, i) => (
                <div key={i} style={{
                  position: 'absolute', left: p.x, top: p.y,
                  opacity: p.op, transform: `rotate(${p.rot}deg)`,
                  pointerEvents: 'none',
                }}>
                  <PackCard flavour={FLAVOURS[p.fi]} rotate={0} scale={0.85} shadow={false} />
                </div>
              ))}

              <div style={{ position: 'relative', zIndex: 2 }}>
                <h2 style={{ fontFamily: serif, fontSize: 'clamp(36px,6vw,72px)', fontWeight: 900, letterSpacing: '-0.04em', margin: '0 0 1rem', lineHeight: 1 }}>
                  Ready to pick<span style={{ fontStyle: 'italic' }}>'em</span>?
                </h2>
                <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.65)', marginBottom: '2.5rem', fontWeight: 300 }}>Free shipping from £35. 30-day satisfaction guarantee.</p>
                <motion.a href="#bundles" whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.97 }}
                  style={{
                    display: 'inline-block', background: '#fff', color: '#000',
                    fontWeight: 900, fontSize: 15, letterSpacing: '0.03em',
                    textDecoration: 'none', padding: '1rem 3rem', borderRadius: 99,
                  }}
                >Shop Bundles</motion.a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '2.5rem 2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 900 }}>pick<span style={{ color: f.color, transition: 'color 0.5s' }}>'em</span></div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>© 2025 pick'em. The toothpick that got flavour.</div>
        <div style={{ display: 'flex', gap: '1.5rem', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
          {['Privacy', 'Terms', 'Contact'].map(l => <a key={l} href="#" style={{ color: 'inherit', textDecoration: 'none' }}>{l}</a>)}
        </div>
      </footer>
    </div>
  )
}
