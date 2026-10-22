import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'

const SERVICES = [
  {
    num: '01',
    title: 'Paint\nCorrection',
    sub: 'Swirl removal · Cut polish · Single-stage · Multi-stage',
    color: '#c9a84c',
    bg: 'linear-gradient(135deg, #0d0900 0%, #1a1200 60%, #0d0900 100%)',
    accent: 'rgba(201,168,76,',
  },
  {
    num: '02',
    title: 'Ceramic\nCoating',
    sub: '9H hardness · 5-year protection · Hydrophobic seal',
    color: '#4488ff',
    bg: 'linear-gradient(135deg, #00060f 0%, #001833 60%, #00060f 100%)',
    accent: 'rgba(68,136,255,',
  },
  {
    num: '03',
    title: 'Interior\nDetail',
    sub: 'Deep clean · Leather conditioning · Odour elimination',
    color: '#ffffff',
    bg: 'linear-gradient(135deg, #080808 0%, #111111 60%, #080808 100%)',
    accent: 'rgba(255,255,255,',
  },
  {
    num: '04',
    title: 'Paint\nProtection Film',
    sub: 'Self-healing TPU · Full body · Partial · Targeted zones',
    color: '#c9a84c',
    bg: 'linear-gradient(135deg, #0a0500 0%, #190e00 60%, #0a0500 100%)',
    accent: 'rgba(201,168,76,',
  },
]

function ServiceCard({ s, index }) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [60, -60])
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0])
  const scale = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0.94, 1, 1, 0.94])

  return (
    <motion.div
      ref={ref}
      style={{ opacity, scale }}
      whileHover={{ scale: 1.015 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <div style={{
        position: 'relative', overflow: 'hidden',
        background: s.bg,
        border: `1px solid ${s.accent}0.12)`,
        padding: '5rem 4rem',
        minHeight: 400,
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        cursor: 'default',
        transition: 'border-color 0.4s'
      }}
        onMouseEnter={e => e.currentTarget.style.borderColor = `${s.accent}0.4)`}
        onMouseLeave={e => e.currentTarget.style.borderColor = `${s.accent}0.12)`}
      >
        {/* bg glow */}
        <div style={{
          position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)',
          width: '60%', height: '60%',
          background: `radial-gradient(circle, ${s.accent}0.06) 0%, transparent 70%)`,
          pointerEvents: 'none'
        }} />

        {/* Corner lines */}
        <div style={{ position: 'absolute', top: 20, left: 20, width: 28, height: 1, background: s.accent + '0.4)' }} />
        <div style={{ position: 'absolute', top: 20, left: 20, width: 1, height: 28, background: s.accent + '0.4)' }} />
        <div style={{ position: 'absolute', bottom: 20, right: 20, width: 28, height: 1, background: s.accent + '0.3)' }} />
        <div style={{ position: 'absolute', bottom: 20, right: 20, width: 1, height: 28, background: s.accent + '0.3)' }} />

        <div>
          <div style={{
            fontFamily: 'monospace', fontSize: '10px',
            color: s.accent + '0.5)', letterSpacing: '0.2em',
            marginBottom: '2.5rem'
          }}>{s.num} / 04</div>

          <h3 style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 'clamp(36px, 4.5vw, 64px)',
            fontWeight: 900, lineHeight: 0.9,
            letterSpacing: '-0.04em',
            color: s.color,
            whiteSpace: 'pre-line',
            marginBottom: '2rem'
          }}>{s.title}</h3>
        </div>

        <div>
          <motion.div style={{ y }} >
            <p style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 'clamp(11px, 1vw, 13px)',
              color: 'rgba(160,175,190,0.55)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              fontWeight: 400,
              lineHeight: 2
            }}>{s.sub}</p>
          </motion.div>

          <div style={{
            marginTop: '2.5rem',
            width: 48, height: 1,
            background: s.accent + '0.4)'
          }} />
        </div>
      </div>
    </motion.div>
  )
}

export default function CarReel() {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'start start'] })
  const titleY = useTransform(scrollYProgress, [0, 1], [80, 0])
  const titleOpacity = useTransform(scrollYProgress, [0, 0.6], [0, 1])

  return (
    <section ref={ref} style={{ background: '#070707', padding: '12rem 0 10rem' }}>
      <div style={{ maxWidth: 1320, margin: '0 auto', padding: '0 2.5rem' }}>

        {/* Section header */}
        <motion.div style={{ y: titleY, opacity: titleOpacity }} >
          <div style={{
            display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '1.5rem'
          }}>
            <div style={{ width: 40, height: 1, background: 'rgba(201,168,76,0.4)' }} />
            <span style={{
              fontFamily: "'Inter', sans-serif", fontSize: '10px', fontWeight: 700,
              letterSpacing: '0.4em', color: 'rgba(201,168,76,0.65)',
              textTransform: 'uppercase'
            }}>Services</span>
          </div>
          <h2 style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 'clamp(42px, 6vw, 88px)',
            fontWeight: 900, color: '#fff',
            letterSpacing: '-0.04em', lineHeight: 0.92,
            marginBottom: '7rem'
          }}>
            Every surface.<br />
            <span style={{ WebkitTextStroke: '1.5px rgba(255,255,255,0.2)', color: 'transparent' }}>
              Perfected.
            </span>
          </h2>
        </motion.div>

        {/* Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1px',
          background: 'rgba(255,255,255,0.05)'
        }}>
          {SERVICES.map((s, i) => (
            <ServiceCard key={s.num} s={s} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
