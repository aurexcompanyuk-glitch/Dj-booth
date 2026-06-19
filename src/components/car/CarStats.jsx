import { useRef, useEffect, useState } from 'react'
import { motion, useInView } from 'framer-motion'

function Counter({ target, suffix = '', duration = 2200 }) {
  const [val, setVal] = useState(0)
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })

  useEffect(() => {
    if (!inView) return
    let start = null
    const step = (ts) => {
      if (!start) start = ts
      const p = Math.min((ts - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(Math.floor(eased * target))
      if (p < 1) requestAnimationFrame(step)
      else setVal(target)
    }
    requestAnimationFrame(step)
  }, [inView, target, duration])

  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>
}

const STATS = [
  { n: 2400, suffix: '+', label: 'Vehicles Detailed' },
  { n: 98, suffix: '%', label: 'Client Return Rate' },
  { n: 14, suffix: 'yrs', label: 'In the Industry' },
  { n: 5, suffix: '★', label: 'Average Rating' },
]

export default function CarStats() {
  return (
    <section style={{
      background: '#050505',
      borderTop: '1px solid rgba(201,168,76,0.08)',
      borderBottom: '1px solid rgba(201,168,76,0.08)',
      padding: '9rem 0',
      position: 'relative', overflow: 'hidden'
    }}>
      {/* bg sweep */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(201,168,76,0.03) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 2.5rem' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '0',
        }}>
          {STATS.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              style={{
                padding: '3rem 2.5rem',
                borderRight: i < STATS.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none'
              }}
            >
              <div style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 'clamp(52px, 6vw, 84px)',
                fontWeight: 900, lineHeight: 1,
                letterSpacing: '-0.05em',
                color: '#fff'
              }}>
                <Counter target={s.n} suffix={s.suffix} />
              </div>
              <p style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '11px', fontWeight: 600,
                color: 'rgba(201,168,76,0.55)',
                letterSpacing: '0.25em', textTransform: 'uppercase',
                marginTop: '0.75rem'
              }}>{s.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
