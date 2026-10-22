import { useRef, useState } from 'react'
import { motion, useScroll, useTransform, useInView } from 'framer-motion'
import CarModel from './components/car2/CarModel'

// ── Scramble text effect ──────────────────────────────────────────────────────
function Scramble({ text, delay = 0 }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  const [display, setDisplay] = useState(text)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

  useEffect(() => {
    if (!inView) return
    const timer = setTimeout(() => {
      let iter = 0
      const interval = setInterval(() => {
        setDisplay(text.split('').map((c, i) => {
          if (c === ' ') return ' '
          if (i < iter) return text[i]
          return chars[Math.floor(Math.random() * chars.length)]
        }).join(''))
        if (iter >= text.length) clearInterval(interval)
        iter += 0.4
      }, 40)
    }, delay * 1000)
    return () => clearTimeout(timer)
  }, [inView])

  return <span ref={ref}>{display}</span>
}

import { useEffect } from 'react'

// ── Section label ─────────────────────────────────────────────────────────────
function Label({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem' }}>
      <div style={{ width: 32, height: 1, background: 'rgba(201,168,76,0.5)' }} />
      <span style={{
        fontFamily: 'Inter, sans-serif', fontSize: '9px', fontWeight: 700,
        letterSpacing: '0.45em', color: 'rgba(201,168,76,0.7)',
        textTransform: 'uppercase'
      }}>{children}</span>
    </div>
  )
}

// ── Reveal on scroll ──────────────────────────────────────────────────────────
function Reveal({ children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 1, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// HERO — full viewport sticky 3D car with scroll-driven camera orbit
// ═══════════════════════════════════════════════════════════════════════════════
function Hero() {
  const sectionRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end end'] })

  // Text fades out as you scroll down
  const titleOpacity = useTransform(scrollYProgress, [0, 0.25], [1, 0])
  const titleY = useTransform(scrollYProgress, [0, 0.25], [0, -80])

  // Overlay text fades in mid-scroll
  const midOpacity = useTransform(scrollYProgress, [0.3, 0.45, 0.7, 0.85], [0, 1, 1, 0])
  const midY = useTransform(scrollYProgress, [0.3, 0.45], [40, 0])

  // Final CTA fades in near end
  const ctaOpacity = useTransform(scrollYProgress, [0.85, 1], [0, 1])

  return (
    // Tall section — gives scroll room for camera orbit
    <div ref={sectionRef} style={{ height: '400vh', position: 'relative' }}>

      {/* Sticky canvas wrapper */}
      <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden', background: '#000' }}>

        {/* 3D scene */}
        <CarModel scrollRef={sectionRef} />

        {/* Letterbox */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '6.5vh', background: '#000', zIndex: 10 }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '6.5vh', background: '#000', zIndex: 10 }} />

        {/* Vignette */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 5, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 90% 90% at 50% 50%, transparent 35%, rgba(0,0,0,0.7) 100%)'
        }} />

        {/* Film grain */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 5, opacity: 0.03, pointerEvents: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '256px'
        }} />

        {/* NAV */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
          padding: '1.8rem 2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <motion.div
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
            style={{ fontFamily: 'Inter, sans-serif', fontSize: '16px', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}
          >
            VELVET<span style={{ color: 'rgba(201,168,76,0.9)' }}>.</span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.8 }}
            style={{ display: 'flex', gap: '2.5rem', alignItems: 'center' }}
          >
            {['Services', 'Process', 'Book'].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`} style={{
                fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 700,
                letterSpacing: '0.2em', textTransform: 'uppercase',
                color: item === 'Book' ? 'rgba(201,168,76,0.9)' : 'rgba(255,255,255,0.4)',
                textDecoration: 'none',
                border: item === 'Book' ? '1px solid rgba(201,168,76,0.4)' : 'none',
                padding: item === 'Book' ? '0.5rem 1.2rem' : 0,
                transition: 'all 0.3s'
              }}>{item}</a>
            ))}
          </motion.div>
        </div>

        {/* ── PHASE 1: Opening title ── */}
        <motion.div
          style={{
            position: 'absolute', inset: 0, zIndex: 8,
            display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
            justifyContent: 'flex-end', padding: '0 4vw 14vh',
            opacity: titleOpacity, y: titleY, pointerEvents: 'none'
          }}
        >
          <motion.div
            initial={{ opacity: 0, letterSpacing: '0.8em' }}
            animate={{ opacity: 1, letterSpacing: '0.4em' }}
            transition={{ duration: 2, delay: 0.6 }}
            style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 700, color: 'rgba(201,168,76,0.7)', letterSpacing: '0.4em', textTransform: 'uppercase', marginBottom: '1.5rem' }}
          >
            Premium Auto Detailing
          </motion.div>

          {['THE ART', 'OF THE', 'PERFECT', 'FINISH.'].map((line, i) => (
            <div key={i} style={{ overflow: 'hidden' }}>
              <motion.div
                initial={{ y: '105%' }}
                animate={{ y: '0%' }}
                transition={{ duration: 1.1, delay: 0.8 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: 'clamp(52px, 10vw, 140px)',
                  fontWeight: 900, lineHeight: 0.9, letterSpacing: '-0.04em',
                  color: i === 3 ? 'transparent' : '#fff',
                  WebkitTextStroke: i === 3 ? '1.5px rgba(201,168,76,0.55)' : 'none',
                }}
              >{line}</motion.div>
            </div>
          ))}

          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 1.2, delay: 1.8 }}
            style={{ width: 'clamp(140px, 18vw, 280px)', height: 1, background: 'linear-gradient(90deg, rgba(201,168,76,0.8), transparent)', margin: '2.5rem 0', transformOrigin: 'left' }}
          />

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5, delay: 2.2 }}
            style={{ fontFamily: 'Inter, sans-serif', fontSize: 'clamp(12px, 1.1vw, 14px)', color: 'rgba(180,195,215,0.55)', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 300 }}
          >
            Scroll to explore
          </motion.p>
        </motion.div>

        {/* ── PHASE 2: Mid-scroll — car detail callouts ── */}
        <motion.div style={{
          position: 'absolute', inset: 0, zIndex: 8, pointerEvents: 'none',
          opacity: midOpacity
        }}>
          <motion.div style={{
            position: 'absolute', right: '5vw', top: '50%', transform: 'translateY(-50%)',
            y: midY, textAlign: 'right'
          }}>
            <div style={{ fontFamily: 'monospace', fontSize: '9px', color: 'rgba(201,168,76,0.6)', letterSpacing: '0.3em', marginBottom: '0.5rem' }}>CERAMIC COAT</div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 'clamp(28px, 4vw, 56px)', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', lineHeight: 0.9 }}>
              9H<br />Hardness
            </div>
            <div style={{ width: 40, height: 1, background: 'rgba(201,168,76,0.5)', marginLeft: 'auto', marginTop: '1.5rem' }} />
          </motion.div>

          <motion.div style={{
            position: 'absolute', left: '5vw', bottom: '18vh',
            y: midY
          }}>
            <div style={{ fontFamily: 'monospace', fontSize: '9px', color: 'rgba(68,136,255,0.7)', letterSpacing: '0.3em', marginBottom: '0.5rem' }}>PAINT CORRECTION</div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 'clamp(22px, 3vw, 44px)', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', lineHeight: 0.9 }}>
              Swirl-free<br /><span style={{ WebkitTextStroke: '1px rgba(255,255,255,0.3)', color: 'transparent' }}>Mirror finish</span>
            </div>
          </motion.div>
        </motion.div>

        {/* ── PHASE 3: CTA ── */}
        <motion.div style={{
          position: 'absolute', inset: 0, zIndex: 8, pointerEvents: 'none',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
          paddingBottom: '14vh', opacity: ctaOpacity
        }}>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 'clamp(36px, 5vw, 72px)', fontWeight: 900, color: '#fff', letterSpacing: '-0.04em', textAlign: 'center', lineHeight: 0.9, marginBottom: '2.5rem' }}>
            Ready to transform<br />
            <span style={{ color: 'rgba(201,168,76,0.85)' }}>your vehicle?</span>
          </div>
          <a href="#book" style={{
            pointerEvents: 'all',
            display: 'inline-block',
            padding: '1.1rem 4rem',
            border: '1px solid rgba(201,168,76,0.7)',
            color: '#fff', fontFamily: 'Inter, sans-serif', fontSize: '11px',
            fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase',
            textDecoration: 'none', background: 'rgba(201,168,76,0.1)',
            backdropFilter: 'blur(8px)', transition: 'all 0.4s'
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(201,168,76,0.25)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(201,168,76,0.1)' }}
          >Book a Detail</a>
        </motion.div>

        {/* HUD */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.5 }}
          style={{ position: 'absolute', bottom: '8vh', left: '2.5vw', zIndex: 10, fontFamily: 'monospace', fontSize: '9px', color: 'rgba(201,168,76,0.35)', letterSpacing: '0.15em' }}>
          3D PREVIEW · LIVE RENDER
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.5 }}
          style={{ position: 'absolute', bottom: '8vh', right: '2.5vw', zIndex: 10, fontFamily: 'monospace', fontSize: '9px', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.15em' }}>
          REC ● {new Date().getFullYear()}
        </motion.div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICES
// ═══════════════════════════════════════════════════════════════════════════════
const SERVICES = [
  { n: '01', title: 'Paint Correction', detail: 'Swirl marks, scratches, and oxidation removed under 4000K LED inspection lighting. Single or multi-stage correction.', accent: '#c9a84c' },
  { n: '02', title: 'Ceramic Coating', detail: '9H ceramic coatings applied in our climate-controlled studio. Up to 7 years of hydrophobic protection.', accent: '#4488ff' },
  { n: '03', title: 'PPF Wrapping', detail: 'Self-healing Paint Protection Film on high-impact zones or full body. Invisible shield against stone chips.', accent: '#ffffff' },
  { n: '04', title: 'Interior Detail', detail: 'Full leather conditioning, deep carpet extraction, ozone odour treatment, and dashboard restoration.', accent: '#c9a84c' },
  { n: '05', title: 'Engine Bay', detail: 'Safe degreasing, steam clean, and protection treatment. Makes your engine look factory-fresh.', accent: '#4488ff' },
  { n: '06', title: 'Full Valet', detail: 'The complete package — exterior detail, interior valet, and express paint enhancement. One day. Total transformation.', accent: '#ffffff' },
]

function Services() {
  return (
    <section id="services" style={{ background: '#060606', padding: '12rem 0 10rem' }}>
      <div style={{ maxWidth: 1320, margin: '0 auto', padding: '0 2.5rem' }}>
        <Reveal>
          <Label>What We Offer</Label>
          <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: 'clamp(42px, 6vw, 92px)', fontWeight: 900, color: '#fff', letterSpacing: '-0.04em', lineHeight: 0.88, marginBottom: '8rem' }}>
            Every surface.<br />
            <span style={{ WebkitTextStroke: '1.5px rgba(255,255,255,0.18)', color: 'transparent' }}>Obsessed over.</span>
          </h2>
        </Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1px', background: 'rgba(255,255,255,0.05)' }}>
          {SERVICES.map((s, i) => (
            <Reveal key={i} delay={i * 0.05}>
              <motion.div
                whileHover={{ background: `rgba(${s.accent === '#c9a84c' ? '201,168,76' : s.accent === '#4488ff' ? '68,136,255' : '255,255,255'},0.04)` }}
                style={{ padding: '3.5rem', background: '#060606', transition: 'background 0.4s', minHeight: 300 }}
              >
                <div style={{ fontFamily: 'monospace', fontSize: '9px', color: s.accent, opacity: 0.5, letterSpacing: '0.2em', marginBottom: '2rem' }}>{s.n}</div>
                <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: 'clamp(22px, 2.5vw, 34px)', fontWeight: 800, color: s.accent, letterSpacing: '-0.02em', marginBottom: '1.5rem', lineHeight: 1 }}>{s.title}</h3>
                <div style={{ width: 36, height: 1, background: s.accent, opacity: 0.3, marginBottom: '1.5rem' }} />
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: 'rgba(160,175,195,0.6)', lineHeight: 1.85, fontWeight: 300 }}>{s.detail}</p>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROCESS — full-screen wipe panels
// ═══════════════════════════════════════════════════════════════════════════════
const STEPS = [
  { n: '01', title: 'Assessment', body: 'Paint depth gauge, inspection under controlled lighting, full vehicle condition report. Nothing starts without a baseline.' },
  { n: '02', title: 'Decontamination', body: 'Iron fallout, tar, and mineral deposits chemically removed. Clay bar treatment prepares the surface for polishing.' },
  { n: '03', title: 'Correction', body: 'Machine polishing with dual-action and rotary polishers. Up to 95% defect removal on single-stage, 99% on multi-stage.' },
  { n: '04', title: 'Protection', body: 'Ceramic coating or PPF applied in a dust-controlled environment. 24-hour cure before delivery with full documentation.' },
]

function ProcessSection() {
  return (
    <section id="process" style={{ background: '#040404' }}>
      <div style={{ maxWidth: 1320, margin: '0 auto', padding: '12rem 2.5rem 6rem' }}>
        <Reveal>
          <Label>The Process</Label>
          <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: 'clamp(42px, 6vw, 92px)', fontWeight: 900, color: '#fff', letterSpacing: '-0.04em', lineHeight: 0.88, marginBottom: '8rem' }}>
            Science.<br /><span style={{ WebkitTextStroke: '1.5px rgba(255,255,255,0.18)', color: 'transparent' }}>Not guesswork.</span>
          </h2>
        </Reveal>
      </div>
      {STEPS.map((step, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8 }}
          style={{
            borderTop: '1px solid rgba(255,255,255,0.05)',
            padding: '5rem 2.5rem',
            maxWidth: 1320, margin: '0 auto',
            display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr', gap: '4rem', alignItems: 'center'
          }}
        >
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 'clamp(80px, 10vw, 140px)', fontWeight: 900, color: 'transparent', WebkitTextStroke: '1px rgba(201,168,76,0.15)', lineHeight: 1, letterSpacing: '-0.05em' }}>{step.n}</div>
          <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: 'clamp(28px, 3vw, 48px)', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', lineHeight: 0.9 }}>{step.title}</h3>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', color: 'rgba(160,180,200,0.6)', lineHeight: 1.85, fontWeight: 300 }}>{step.body}</p>
        </motion.div>
      ))}
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATS
// ═══════════════════════════════════════════════════════════════════════════════
function StatCounter({ target, suffix = '' }) {
  const [val, setVal] = useState(0)
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  useEffect(() => {
    if (!inView) return
    let start = null
    const step = ts => {
      if (!start) start = ts
      const p = Math.min((ts - start) / 2000, 1)
      setVal(Math.floor((1 - Math.pow(1 - p, 3)) * target))
      if (p < 1) requestAnimationFrame(step)
      else setVal(target)
    }
    requestAnimationFrame(step)
  }, [inView])
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>
}

function Stats() {
  const stats = [
    { n: 2400, s: '+', l: 'Vehicles Detailed' },
    { n: 98, s: '%', l: 'Client Return Rate' },
    { n: 14, s: 'yrs', l: 'In the Industry' },
    { n: 100, s: '%', l: 'Satisfaction Guarantee' },
  ]
  return (
    <section style={{ background: '#050505', borderTop: '1px solid rgba(201,168,76,0.07)', borderBottom: '1px solid rgba(201,168,76,0.07)', padding: '8rem 0' }}>
      <div style={{ maxWidth: 1320, margin: '0 auto', padding: '0 2.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 0 }}>
        {stats.map((s, i) => (
          <Reveal key={i} delay={i * 0.08}>
            <div style={{ padding: '2rem 2.5rem', borderRight: i < 3 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 'clamp(52px, 6vw, 80px)', fontWeight: 900, color: '#fff', letterSpacing: '-0.05em', lineHeight: 1 }}>
                <StatCounter target={s.n} suffix={s.s} />
              </div>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 700, color: 'rgba(201,168,76,0.55)', letterSpacing: '0.25em', textTransform: 'uppercase', marginTop: '0.75rem' }}>{s.l}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// BOOK
// ═══════════════════════════════════════════════════════════════════════════════
function Book() {
  const [sent, setSent] = useState(false)
  const inp = {
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
    padding: '1.1rem 1.4rem', color: '#fff',
    fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 300,
    outline: 'none', width: '100%', boxSizing: 'border-box', transition: 'border-color 0.3s'
  }
  return (
    <section id="book" style={{ background: '#040404', padding: '12rem 0 10rem' }}>
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '0 2.5rem' }}>
        <Reveal>
          <Label>Book Now</Label>
          <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: 'clamp(48px, 7vw, 100px)', fontWeight: 900, color: '#fff', letterSpacing: '-0.04em', lineHeight: 0.88, marginBottom: '5rem' }}>
            Your car<br /><span style={{ WebkitTextStroke: '1.5px rgba(201,168,76,0.55)', color: 'transparent' }}>deserves this.</span>
          </h2>
        </Reveal>
        {sent ? (
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
            style={{ padding: '5rem', border: '1px solid rgba(201,168,76,0.3)', textAlign: 'center', background: 'rgba(201,168,76,0.04)' }}>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '42px', fontWeight: 900, color: '#c9a84c' }}>Received.</div>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', color: 'rgba(160,180,200,0.55)', fontWeight: 300, marginTop: '1rem' }}>We will be in touch within 2 hours.</p>
          </motion.div>
        ) : (
          <Reveal delay={0.15}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <input placeholder="Your name" style={inp} onFocus={e => e.target.style.borderColor = 'rgba(201,168,76,0.5)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.07)'} />
                <input placeholder="Phone number" style={inp} onFocus={e => e.target.style.borderColor = 'rgba(201,168,76,0.5)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.07)'} />
              </div>
              <input placeholder="Vehicle (make, model, year)" style={inp} onFocus={e => e.target.style.borderColor = 'rgba(201,168,76,0.5)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.07)'} />
              <select defaultValue="" style={{ ...inp, color: 'rgba(255,255,255,0.45)' }}>
                <option value="" disabled>Service required</option>
                <option>Paint Correction</option><option>Ceramic Coating</option>
                <option>PPF Wrap</option><option>Interior Detail</option><option>Full Package</option>
              </select>
              <textarea rows={3} placeholder="Anything else..." style={{ ...inp, resize: 'none' }} onFocus={e => e.target.style.borderColor = 'rgba(201,168,76,0.5)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.07)'} />
              <motion.button whileHover={{ background: 'rgba(201,168,76,0.22)' }} whileTap={{ scale: 0.99 }} onClick={() => setSent(true)}
                style={{ padding: '1.3rem', border: '1px solid rgba(201,168,76,0.55)', background: 'rgba(201,168,76,0.08)', color: '#fff', fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.4s' }}>
                Submit Enquiry
              </motion.button>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
function Ticker() {
  const items = ['Paint Correction', 'Ceramic Coating', 'PPF', 'Interior Detail', 'Engine Bay', 'Wheel Refurb', 'Headlight Restore']
  const row = [...items, ...items, ...items]
  return (
    <div style={{ overflow: 'hidden', background: '#080808', borderTop: '1px solid rgba(201,168,76,0.07)', borderBottom: '1px solid rgba(201,168,76,0.07)', padding: '0.9rem 0' }}>
      <motion.div animate={{ x: ['0%', '-33.33%'] }} transition={{ repeat: Infinity, duration: 30, ease: 'linear' }}
        style={{ display: 'flex', whiteSpace: 'nowrap', gap: '4rem' }}>
        {row.map((item, i) => (
          <span key={i} style={{ fontFamily: 'Inter, sans-serif', fontSize: '9px', fontWeight: 700, letterSpacing: '0.35em', textTransform: 'uppercase', color: i % 2 === 0 ? 'rgba(255,255,255,0.25)' : 'rgba(201,168,76,0.45)' }}>
            {item} <span style={{ color: 'rgba(201,168,76,0.2)', marginLeft: '4rem' }}>◆</span>
          </span>
        ))}
      </motion.div>
    </div>
  )
}

function Footer() {
  return (
    <footer style={{ background: '#020202', borderTop: '1px solid rgba(255,255,255,0.04)', padding: '3rem 2.5rem' }}>
      <div style={{ maxWidth: 1320, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', fontWeight: 900, color: '#fff' }}>VELVET<span style={{ color: 'rgba(201,168,76,0.85)' }}>.</span></div>
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', color: 'rgba(255,255,255,0.15)', letterSpacing: '0.1em' }}>© 2024 Velvet Detail Studio · All rights reserved</div>
      </div>
    </footer>
  )
}

export default function AppCar2() {
  return (
    <div style={{ background: '#000', color: '#fff', overflowX: 'hidden' }}>
      <Hero />
      <Ticker />
      <Services />
      <ProcessSection />
      <Stats />
      <Book />
      <Footer />
    </div>
  )
}
