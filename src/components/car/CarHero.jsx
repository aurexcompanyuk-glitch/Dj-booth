import { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import CarCanvas from './CarCanvas'

const WORDS = ['DETAIL.', 'PROTECT.', 'PERFECT.']

export default function CarHero() {
  const ref = useRef(null)
  const [phase, setPhase] = useState(0) // 0=black, 1=sweep, 2=text, 3=full
  const { scrollY } = useScroll()
  const textY = useTransform(scrollY, [0, 600], [0, -120])
  const textOpacity = useTransform(scrollY, [0, 400], [1, 0])
  const scaleCanvas = useTransform(scrollY, [0, 600], [1, 1.08])

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 300)
    const t2 = setTimeout(() => setPhase(2), 1100)
    const t3 = setTimeout(() => setPhase(3), 2000)
    return () => [t1, t2, t3].forEach(clearTimeout)
  }, [])

  return (
    <section ref={ref} style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#070707' }}>

      {/* Canvas bg */}
      <motion.div style={{ position: 'absolute', inset: 0, scale: scaleCanvas }}>
        <CarCanvas />
      </motion.div>

      {/* Opening black overlay — fades out */}
      <AnimatePresence>
        {phase < 1 && (
          <motion.div
            key="black"
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: 'easeInOut' }}
            style={{ position: 'absolute', inset: 0, background: '#000', zIndex: 20 }}
          />
        )}
      </AnimatePresence>

      {/* Sweep line reveal */}
      {phase >= 1 && (
        <motion.div
          initial={{ scaleX: 0, x: '-50%' }}
          animate={{ scaleX: [0, 1, 1, 0], x: ['-50%', '0%', '0%', '150%'] }}
          transition={{ duration: 1.4, times: [0, 0.4, 0.6, 1], ease: 'easeInOut' }}
          style={{
            position: 'absolute', top: '50%', left: 0, right: 0,
            height: 1, background: 'rgba(201,168,76,0.8)',
            zIndex: 15, transformOrigin: 'left center',
            boxShadow: '0 0 20px rgba(201,168,76,0.6)'
          }}
        />
      )}

      {/* Letterbox */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '7vh', background: '#000', zIndex: 10 }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '7vh', background: '#000', zIndex: 10 }} />

      {/* Vignette */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 5, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 30%, rgba(0,0,0,0.85) 100%)'
      }} />

      {/* Noise grain */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 5, opacity: 0.035, pointerEvents: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize: '256px'
      }} />

      {/* Main text */}
      <motion.div
        style={{
          position: 'absolute', inset: 0, zIndex: 8,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          y: textY, opacity: textOpacity, pointerEvents: 'none'
        }}
      >
        {/* Studio label */}
        {phase >= 2 && (
          <motion.div
            initial={{ opacity: 0, letterSpacing: '0.8em' }}
            animate={{ opacity: 1, letterSpacing: '0.45em' }}
            transition={{ duration: 1.6, delay: 0.2 }}
            style={{
              fontFamily: "'Inter', sans-serif", fontSize: 'clamp(9px,1vw,11px)',
              fontWeight: 700, color: 'rgba(201,168,76,0.75)',
              textTransform: 'uppercase', letterSpacing: '0.45em',
              marginBottom: '3.5rem'
            }}
          >
            Premium Auto Detailing Studio
          </motion.div>
        )}

        {/* Headline — each word erupts from bottom */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.1em' }}>
          {phase >= 2 && WORDS.map((word, i) => (
            <div key={word} style={{ overflow: 'hidden' }}>
              <motion.div
                initial={{ y: '105%', skewY: 4 }}
                animate={{ y: '0%', skewY: 0 }}
                transition={{ duration: 1.0, delay: 0.1 + i * 0.14, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 'clamp(64px, 13vw, 200px)',
                  fontWeight: 900,
                  letterSpacing: '-0.04em',
                  lineHeight: 0.88,
                  color: i === 2 ? 'transparent' : '#fff',
                  WebkitTextStroke: i === 2 ? '1.5px rgba(201,168,76,0.6)' : 'none',
                  textShadow: i < 2 ? '0 0 120px rgba(201,168,76,0.12)' : 'none',
                }}
              >
                {word}
              </motion.div>
            </div>
          ))}
        </div>

        {/* Gold divider */}
        {phase >= 3 && (
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1.2, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            style={{
              width: 'clamp(160px, 22vw, 320px)', height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.8), transparent)',
              margin: '3rem auto', transformOrigin: 'center'
            }}
          />
        )}

        {/* Tagline */}
        {phase >= 3 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.4, delay: 0.4 }}
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 'clamp(12px, 1.2vw, 15px)',
              color: 'rgba(180,190,205,0.55)',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              fontWeight: 300
            }}
          >
            Paint correction · Ceramic coating · Full detail
          </motion.p>
        )}

        {/* CTA */}
        {phase >= 3 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.8 }}
            style={{ marginTop: '3.5rem', pointerEvents: 'all' }}
          >
            <a href="#contact" style={{
              display: 'inline-block',
              padding: '1rem 3.2rem',
              border: '1px solid rgba(201,168,76,0.55)',
              color: '#fff',
              fontFamily: "'Inter', sans-serif",
              fontSize: '11px', fontWeight: 700,
              letterSpacing: '0.3em', textTransform: 'uppercase',
              textDecoration: 'none',
              background: 'rgba(201,168,76,0.07)',
              backdropFilter: 'blur(8px)',
              transition: 'all 0.4s cubic-bezier(0.16,1,0.3,1)'
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(201,168,76,0.22)'; e.currentTarget.style.borderColor = 'rgba(201,168,76,1)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(201,168,76,0.07)'; e.currentTarget.style.borderColor = 'rgba(201,168,76,0.55)' }}
            >
              Book a Detail
            </a>
          </motion.div>
        )}
      </motion.div>

      {/* HUD corners */}
      {phase >= 3 && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }}
            style={{ position: 'absolute', top: '8.5vh', left: '2vw', zIndex: 10, fontFamily: 'monospace', fontSize: '10px', color: 'rgba(201,168,76,0.4)', letterSpacing: '0.12em' }}>
            STUDIO · 4K · 24fps
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }}
            style={{ position: 'absolute', top: '8.5vh', right: '2vw', zIndex: 10, fontFamily: 'monospace', fontSize: '10px', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.12em' }}>
            REC ● 00:00:12
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.2 }}
            style={{ position: 'absolute', bottom: '9vh', right: '2vw', zIndex: 10, fontFamily: 'monospace', fontSize: '10px', color: 'rgba(255,255,255,0.18)', letterSpacing: '0.1em' }}>
            ANAMORPHIC 2.39:1
          </motion.div>
        </>
      )}

      {/* Scroll cue */}
      {phase >= 3 && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3 }}
          style={{ position: 'absolute', bottom: '9vh', left: '50%', transform: 'translateX(-50%)', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}
        >
          <motion.div animate={{ y: [0, 9, 0] }} transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
            style={{ width: 1, height: 32, background: 'linear-gradient(180deg, rgba(201,168,76,0.6), transparent)' }}
          />
        </motion.div>
      )}
    </section>
  )
}
