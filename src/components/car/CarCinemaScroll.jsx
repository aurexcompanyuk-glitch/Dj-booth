import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'

// Full-width cinematic scroll panels — each panel pins and transitions like a video cut
function Panel({ children, bg, index }) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const clipLeft = useTransform(scrollYProgress, [0.1, 0.4], ['100%', '0%'])
  const opacity = useTransform(scrollYProgress, [0, 0.1, 0.9, 1], [0, 1, 1, 0])
  const y = useTransform(scrollYProgress, [0, 1], [50, -50])

  return (
    <div ref={ref} style={{ position: 'relative', overflow: 'hidden', minHeight: '80vh', display: 'flex', alignItems: 'center', background: bg }}>
      {/* Wipe reveal — overlay slides right as panel enters */}
      <motion.div style={{
        position: 'absolute', inset: 0, background: '#070707', zIndex: 5,
        translateX: clipLeft
      }} />
      <motion.div style={{ opacity, y, position: 'relative', zIndex: 2, width: '100%' }}>
        {children}
      </motion.div>
    </div>
  )
}

const STEPS = [
  {
    label: 'Step 01',
    heading: 'Assessment',
    body: 'Your vehicle undergoes a thorough inspection under studio lighting. Every imperfection catalogued. A bespoke treatment plan built around your car\'s specific needs.',
    bg: '#080808',
    color: '#c9a84c',
  },
  {
    label: 'Step 02',
    heading: 'Decontamination',
    body: 'Two-stage wash, iron fallout removal, clay bar treatment. Every microscopic contaminant stripped from the paintwork before we touch a pad.',
    bg: '#050a10',
    color: '#4488ff',
  },
  {
    label: 'Step 03',
    heading: 'Correction',
    body: 'Machine polishing under 4000K LED inspection lighting. Swirls, scratches, and oxidation erased. Paint brought back to better than showroom.',
    bg: '#0a0700',
    color: '#c9a84c',
  },
  {
    label: 'Step 04',
    heading: 'Protection',
    body: 'Ceramic coating applied in a climate-controlled environment. Cured, inspected, and handed back with a protection certificate and aftercare kit.',
    bg: '#060606',
    color: '#ffffff',
  },
]

export default function CarCinemaScroll() {
  return (
    <section style={{ background: '#070707' }}>
      {/* Section intro */}
      <div style={{ maxWidth: 1320, margin: '0 auto', padding: '12rem 2.5rem 6rem' }}>
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '1.5rem' }}>
            <div style={{ width: 40, height: 1, background: 'rgba(201,168,76,0.4)' }} />
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '10px', fontWeight: 700, letterSpacing: '0.4em', color: 'rgba(201,168,76,0.65)', textTransform: 'uppercase' }}>The Process</span>
          </div>
          <h2 style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 'clamp(42px, 6vw, 88px)',
            fontWeight: 900, color: '#fff',
            letterSpacing: '-0.04em', lineHeight: 0.92,
          }}>
            Science meets<br />
            <span style={{ WebkitTextStroke: '1.5px rgba(255,255,255,0.2)', color: 'transparent' }}>obsession.</span>
          </h2>
        </motion.div>
      </div>

      {/* Cinematic panels */}
      {STEPS.map((step, i) => (
        <Panel key={i} index={i} bg={step.bg}>
          <div style={{ maxWidth: 1320, margin: '0 auto', padding: '7rem 2.5rem', display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '6rem', alignItems: 'center' }}>
            {/* Left — number */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ fontFamily: 'monospace', fontSize: '9px', color: 'rgba(201,168,76,0.5)', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>{step.label}</div>
              <div style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 'clamp(80px, 14vw, 180px)',
                fontWeight: 900, color: 'transparent',
                WebkitTextStroke: `1px ${step.color}33`,
                lineHeight: 1, letterSpacing: '-0.06em',
                userSelect: 'none'
              }}>{String(i + 1).padStart(2, '0')}</div>
            </div>

            {/* Right — content */}
            <div>
              <h3 style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 'clamp(36px, 4vw, 64px)',
                fontWeight: 900, color: step.color,
                letterSpacing: '-0.03em', lineHeight: 0.9,
                marginBottom: '2.5rem'
              }}>{step.heading}</h3>

              <div style={{ width: 48, height: 1, background: step.color + '44', marginBottom: '2rem' }} />

              <p style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 'clamp(14px, 1.2vw, 17px)',
                color: 'rgba(170,185,200,0.65)',
                lineHeight: 1.85, fontWeight: 300,
                maxWidth: '42ch'
              }}>{step.body}</p>
            </div>
          </div>
        </Panel>
      ))}
    </section>
  )
}
