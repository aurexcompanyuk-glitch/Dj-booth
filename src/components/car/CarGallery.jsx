import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'

// Parallax masonry gallery — each panel moves at a different rate creating depth
const PANELS = [
  { id: 1, label: 'Paint Correction', tag: 'Before / After', speed: -0.2, h: 520, seed: 10 },
  { id: 2, label: 'Ceramic Coat', tag: 'Protection', speed: 0.15, h: 380, seed: 20 },
  { id: 3, label: 'Interior Detail', tag: 'Full Valet', speed: -0.1, h: 460, seed: 30 },
  { id: 4, label: 'PPF Wrap', tag: 'Full Body', speed: 0.2, h: 500, seed: 40 },
  { id: 5, label: 'Engine Bay', tag: 'Deep Clean', speed: -0.15, h: 360, seed: 50 },
  { id: 6, label: 'Wheels & Arches', tag: 'Iron Removal', speed: 0.1, h: 480, seed: 60 },
]

// Deterministic color based on seed — rich dark tones
function panelGradient(seed) {
  const palettes = [
    'linear-gradient(160deg, #0d0500 0%, #1a0d00 50%, #0a0300 100%)',
    'linear-gradient(160deg, #000a18 0%, #001530 50%, #000810 100%)',
    'linear-gradient(160deg, #0a0a0a 0%, #161616 50%, #080808 100%)',
    'linear-gradient(160deg, #0d0800 0%, #1c1400 50%, #0a0700 100%)',
    'linear-gradient(160deg, #030a0f 0%, #061520 50%, #020609 100%)',
    'linear-gradient(160deg, #080808 0%, #131313 50%, #050505 100%)',
  ]
  return palettes[(seed / 10 - 1) % palettes.length]
}

function GalleryCard({ p }) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [p.speed * 200, -p.speed * 200])

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ scale: 1.012 }}
      style={{
        position: 'relative', overflow: 'hidden',
        height: p.h,
        background: panelGradient(p.seed),
        border: '1px solid rgba(255,255,255,0.05)',
        cursor: 'pointer',
        transition: 'border-color 0.4s'
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)' }}
    >
      {/* Parallax bg element */}
      <motion.div style={{ y, position: 'absolute', inset: '-20%', pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', top: '30%', left: '20%',
          width: '60%', height: '40%',
          background: 'radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 70%)'
        }} />
        {/* Light streaks */}
        <div style={{
          position: 'absolute', top: '20%', left: '-20%', right: '-20%', height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.08), transparent)',
          transform: `rotate(${-15 + (p.seed % 30)}deg)`
        }} />
        <div style={{
          position: 'absolute', top: '60%', left: '-20%', right: '-20%', height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)',
          transform: `rotate(${5 + (p.seed % 20)}deg)`
        }} />
      </motion.div>

      {/* Corner bracket */}
      <div style={{ position: 'absolute', top: 16, left: 16, width: 20, height: 1, background: 'rgba(201,168,76,0.35)' }} />
      <div style={{ position: 'absolute', top: 16, left: 16, width: 1, height: 20, background: 'rgba(201,168,76,0.35)' }} />

      {/* Labels — slide up on hover */}
      <motion.div
        initial={false}
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '3rem 2rem 2rem',
          background: 'linear-gradient(0deg, rgba(0,0,0,0.7) 0%, transparent 100%)'
        }}
      >
        <div style={{ fontFamily: 'monospace', fontSize: '9px', color: 'rgba(201,168,76,0.6)', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>{p.tag}</div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 'clamp(16px, 2vw, 22px)', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>{p.label}</div>
      </motion.div>
    </motion.div>
  )
}

export default function CarGallery() {
  return (
    <section style={{ background: '#070707', padding: '10rem 0' }}>
      <div style={{ maxWidth: 1320, margin: '0 auto', padding: '0 2.5rem' }}>

        <motion.div
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          style={{ marginBottom: '6rem' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '1.5rem' }}>
            <div style={{ width: 40, height: 1, background: 'rgba(201,168,76,0.4)' }} />
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '10px', fontWeight: 700, letterSpacing: '0.4em', color: 'rgba(201,168,76,0.65)', textTransform: 'uppercase' }}>Portfolio</span>
          </div>
          <h2 style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 'clamp(42px, 6vw, 88px)',
            fontWeight: 900, color: '#fff',
            letterSpacing: '-0.04em', lineHeight: 0.92,
          }}>
            The work<br />
            <span style={{ WebkitTextStroke: '1.5px rgba(255,255,255,0.2)', color: 'transparent' }}>speaks.</span>
          </h2>
        </motion.div>

        {/* Masonry grid */}
        <div style={{
          columns: 'auto 320px', columnGap: '1px',
        }}>
          {PANELS.map(p => (
            <div key={p.id} style={{ marginBottom: '1px', breakInside: 'avoid' }}>
              <GalleryCard p={p} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
