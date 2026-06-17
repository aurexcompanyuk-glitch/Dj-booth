import { useRef } from 'react'
import { motion, useScroll, useTransform, useInView } from 'framer-motion'
import CinematicPipes from './components/CinematicPipes'

// ── Reveal wrapper ─────────────────────────────────────────────────────────────
function Reveal({ children, delay = 0, y = 40 }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}

// ── Horizontal marquee ─────────────────────────────────────────────────────────
function Ticker() {
  const items = ['Emergency Callout', 'Boiler Installations', 'Underfloor Heating', 'Gas Safe Registered', 'Commercial Contracts', 'Drain Clearance', '24/7 Service']
  const row = [...items, ...items]
  return (
    <div style={{ overflow: 'hidden', background: '#0a0f1a', borderTop: '1px solid rgba(255,120,30,0.15)', borderBottom: '1px solid rgba(255,120,30,0.15)', padding: '1rem 0' }}>
      <motion.div
        animate={{ x: ['0%', '-50%'] }}
        transition={{ repeat: Infinity, duration: 28, ease: 'linear' }}
        style={{ display: 'flex', whiteSpace: 'nowrap', gap: '4rem' }}
      >
        {row.map((item, i) => (
          <span key={i} style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '11px', fontWeight: 700, letterSpacing: '0.25em',
            textTransform: 'uppercase', color: i % 2 === 0 ? 'rgba(255,255,255,0.5)' : 'rgba(255,120,30,0.6)'
          }}>
            {item} <span style={{ color: 'rgba(255,80,10,0.4)', marginLeft: '4rem' }}>◆</span>
          </span>
        ))}
      </motion.div>
    </div>
  )
}

// ── Services ───────────────────────────────────────────────────────────────────
const SERVICES = [
  { num: '01', title: 'Emergency Repairs', desc: 'Burst pipes, leaks, and failures responded to within the hour, any time of day or night.', icon: '⚡' },
  { num: '02', title: 'Boiler & Heating', desc: 'Full boiler installations, servicing, and smart thermostat integration for maximum efficiency.', icon: '🔥' },
  { num: '03', title: 'Bathroom Fitting', desc: 'Complete wet room, en-suite, and bathroom design and installation from concept to finish.', icon: '🚿' },
  { num: '04', title: 'Commercial Contracts', desc: 'Ongoing maintenance contracts and large-scale installations for commercial properties.', icon: '🏗️' },
  { num: '05', title: 'Drain Clearance', desc: 'High-pressure jetting and CCTV drain surveys to locate and clear any blockage.', icon: '🌀' },
  { num: '06', title: 'Gas & Compliance', desc: 'Gas Safe registered engineers for all gas work, safety checks, and landlord certificates.', icon: '📋' },
]

function Services() {
  return (
    <section id="services" style={{ background: '#060a14', padding: '10rem 0' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 2rem' }}>
        <Reveal>
          <p style={{ fontFamily: 'Inter', fontSize: 11, letterSpacing: '0.35em', color: 'rgba(255,120,30,0.7)', textTransform: 'uppercase', marginBottom: '1rem' }}>What We Do</p>
          <h2 style={{ fontFamily: 'Inter', fontSize: 'clamp(36px, 5vw, 68px)', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: '5rem' }}>
            Every job.<br /><span style={{ WebkitTextStroke: '1px rgba(255,255,255,0.3)', color: 'transparent' }}>Every scale.</span>
          </h2>
        </Reveal>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1px', background: 'rgba(255,255,255,0.06)' }}>
          {SERVICES.map((s, i) => (
            <Reveal key={s.num} delay={i * 0.06}>
              <motion.div
                whileHover={{ background: 'rgba(255,80,10,0.06)' }}
                style={{
                  padding: '3rem', background: '#060a14',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  cursor: 'default', transition: 'background 0.3s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,120,30,0.5)', letterSpacing: '0.1em' }}>{s.num}</span>
                  <span style={{ fontSize: 24, opacity: 0.6 }}>{s.icon}</span>
                </div>
                <h3 style={{ fontFamily: 'Inter', fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: '0.75rem', letterSpacing: '-0.01em' }}>{s.title}</h3>
                <p style={{ fontFamily: 'Inter', fontSize: 14, color: 'rgba(160,180,200,0.65)', lineHeight: 1.75, fontWeight: 300 }}>{s.desc}</p>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Stats bar ──────────────────────────────────────────────────────────────────
function Stats() {
  const stats = [
    { n: '37', unit: 'yrs', label: 'In business' },
    { n: '12k+', unit: '', label: 'Jobs completed' },
    { n: '98%', unit: '', label: 'Customer satisfaction' },
    { n: '24/7', unit: '', label: 'Emergency response' },
  ]
  return (
    <section style={{ background: '#080d18', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '6rem 0' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '3rem' }}>
        {stats.map((s, i) => (
          <Reveal key={i} delay={i * 0.1}>
            <div>
              <div style={{ fontFamily: 'Inter', fontSize: 'clamp(42px, 5vw, 72px)', fontWeight: 900, color: '#fff', letterSpacing: '-0.04em', lineHeight: 1 }}>
                {s.n}<span style={{ color: 'rgba(255,120,30,0.8)', fontSize: '0.5em' }}>{s.unit}</span>
              </div>
              <p style={{ fontFamily: 'Inter', fontSize: 12, color: 'rgba(160,180,200,0.5)', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: '0.5rem' }}>{s.label}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

// ── Process ────────────────────────────────────────────────────────────────────
function Process() {
  const steps = [
    { n: '01', t: 'Contact', d: 'Call us or fill out the form. We’ll pick up within minutes.' },
    { n: '02', t: 'Survey', d: 'We assess the job and give you a transparent, fixed-price quote.' },
    { n: '03', t: 'Execute', d: 'Our engineers arrive on time, fully equipped, and get it done right first time.' },
    { n: '04', t: 'Certify', d: 'All work certified, warranted, and signed off to current standards.' },
  ]
  return (
    <section style={{ background: '#060a14', padding: '10rem 0' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 2rem' }}>
        <Reveal>
          <h2 style={{ fontFamily: 'Inter', fontSize: 'clamp(36px, 5vw, 68px)', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: '6rem' }}>
            How it works.
          </h2>
        </Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0', position: 'relative' }}>
          {/* connecting line */}
          <div style={{ position: 'absolute', top: '1.5rem', left: '2rem', right: '2rem', height: 1, background: 'linear-gradient(90deg, rgba(255,120,30,0.3), rgba(255,120,30,0.1))', zIndex: 0 }} />
          {steps.map((s, i) => (
            <Reveal key={i} delay={i * 0.1} y={20}>
              <div style={{ padding: '0 2rem 0 0', position: 'relative', zIndex: 1 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  border: '1px solid rgba(255,120,30,0.5)',
                  background: '#060a14',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,120,30,0.8)',
                  marginBottom: '2rem'
                }}>{s.n}</div>
                <h3 style={{ fontFamily: 'Inter', fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: '0.75rem' }}>{s.t}</h3>
                <p style={{ fontFamily: 'Inter', fontSize: 14, color: 'rgba(160,180,200,0.6)', lineHeight: 1.75, fontWeight: 300, maxWidth: '28ch' }}>{s.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Reviews ────────────────────────────────────────────────────────────────────
const REVIEWS = [
  { name: 'Sarah M.', loc: 'Manchester', text: 'Called at midnight with a burst pipe. Engineer was here within 40 minutes and had it fixed in under an hour. Absolutely incredible service.' },
  { name: 'James T.', loc: 'Salford', text: 'New boiler installed in a day. Clean, professional, and the engineer explained everything clearly. Five stars without hesitation.' },
  { name: 'Priya K.', loc: 'Stockport', text: 'Used them for our office block`s annual compliance check. On time, thorough, and the paperwork was ready the same day. Will use again.' },
]
function Reviews() {
  return (
    <section style={{ background: '#080d18', padding: '10rem 0' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 2rem' }}>
        <Reveal>
          <h2 style={{ fontFamily: 'Inter', fontSize: 'clamp(36px, 5vw, 68px)', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: '5rem' }}>
            What clients say.
          </h2>
        </Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          {REVIEWS.map((r, i) => (
            <Reveal key={i} delay={i * 0.1}>
              <motion.div
                whileHover={{ y: -4, borderColor: 'rgba(255,120,30,0.4)' }}
                style={{
                  padding: '2.5rem', border: '1px solid rgba(255,255,255,0.07)',
                  background: 'rgba(255,255,255,0.02)', transition: 'all 0.3s'
                }}
              >
                <div style={{ display: 'flex', gap: '3px', marginBottom: '1.5rem' }}>
                  {[...Array(5)].map((_, j) => <span key={j} style={{ color: '#ff7820', fontSize: 13 }}>★</span>)}
                </div>
                <p style={{ fontFamily: 'Inter', fontSize: 15, color: 'rgba(200,215,230,0.75)', lineHeight: 1.8, fontWeight: 300, marginBottom: '2rem', fontStyle: 'italic' }}>
                  "{r.text}"
                </p>
                <div>
                  <div style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 700, color: '#fff' }}>{r.name}</div>
                  <div style={{ fontFamily: 'Inter', fontSize: 11, color: 'rgba(255,120,30,0.6)', letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 2 }}>{r.loc}</div>
                </div>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Contact ────────────────────────────────────────────────────────────────────
function Contact() {
  return (
    <section id="contact" style={{ background: '#060a14', padding: '10rem 0' }}>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 2rem', textAlign: 'center' }}>
        <Reveal>
          <p style={{ fontFamily: 'Inter', fontSize: 11, letterSpacing: '0.35em', color: 'rgba(255,120,30,0.7)', textTransform: 'uppercase', marginBottom: '1.5rem' }}>
            Get in Touch
          </p>
          <h2 style={{ fontFamily: 'Inter', fontSize: 'clamp(42px, 6vw, 82px)', fontWeight: 900, color: '#fff', letterSpacing: '-0.04em', lineHeight: 0.95, marginBottom: '2rem' }}>
            Let's fix it<br /><span style={{ WebkitTextStroke: '1.5px rgba(255,255,255,0.35)', color: 'transparent' }}>together.</span>
          </h2>
          <p style={{ fontFamily: 'Inter', fontSize: 16, color: 'rgba(160,180,200,0.6)', lineHeight: 1.75, fontWeight: 300, maxWidth: '45ch', margin: '0 auto 3.5rem' }}>
            Whether it's a dripping tap or a full commercial installation — we're the call you need to make.
          </p>
        </Reveal>

        <Reveal delay={0.2}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 500, margin: '0 auto' }}>
            <input placeholder="Your name" style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
              padding: '1.1rem 1.5rem', color: '#fff', fontFamily: 'Inter', fontSize: 14,
              outline: 'none', width: '100%', boxSizing: 'border-box'
            }} />
            <input placeholder="Phone or email" style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
              padding: '1.1rem 1.5rem', color: '#fff', fontFamily: 'Inter', fontSize: 14,
              outline: 'none', width: '100%', boxSizing: 'border-box'
            }} />
            <textarea placeholder="Describe the job..." rows={4} style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
              padding: '1.1rem 1.5rem', color: '#fff', fontFamily: 'Inter', fontSize: 14,
              outline: 'none', resize: 'none', width: '100%', boxSizing: 'border-box'
            }} />
            <motion.button
              whileHover={{ background: 'rgba(255,80,10,0.5)', borderColor: '#ff7820' }}
              whileTap={{ scale: 0.98 }}
              style={{
                padding: '1.2rem', border: '1px solid rgba(255,120,30,0.6)',
                background: 'rgba(255,80,10,0.12)', color: '#fff',
                fontFamily: 'Inter', fontSize: 12, fontWeight: 700,
                letterSpacing: '0.25em', textTransform: 'uppercase', cursor: 'pointer',
                transition: 'all 0.3s'
              }}
            >
              Send Message
            </motion.button>
          </div>
        </Reveal>

        <Reveal delay={0.3}>
          <div style={{ marginTop: '5rem', display: 'flex', justifyContent: 'center', gap: '4rem', flexWrap: 'wrap' }}>
            {['0800 123 4567', 'info@flowpro.co.uk', 'Mon–Sun, 24hrs'].map((item, i) => (
              <div key={i} style={{ fontFamily: 'Inter', fontSize: 13, color: 'rgba(180,200,220,0.5)', letterSpacing: '0.05em' }}>{item}</div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}

// ── Footer ─────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{ background: '#02050a', borderTop: '1px solid rgba(255,255,255,0.05)', padding: '3rem 0' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 900, color: '#fff', letterSpacing: '-0.01em' }}>
          FLOW<span style={{ color: 'rgba(255,120,30,0.8)' }}>PRO</span>
        </div>
        <div style={{ fontFamily: 'Inter', fontSize: 11, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.15em' }}>
          © 2024 FlowPro Plumbing · Gas Safe No. 123456 · All rights reserved
        </div>
      </div>
    </footer>
  )
}

// ── Navbar ─────────────────────────────────────────────────────────────────────
function Navbar() {
  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      padding: '1.5rem 2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      background: 'linear-gradient(180deg, rgba(2,5,10,0.9) 0%, transparent 100%)',
      backdropFilter: 'blur(2px)'
    }}>
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1, delay: 0.5 }}
        style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}
      >
        FLOW<span style={{ color: 'rgba(255,120,30,0.85)' }}>PRO</span>
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.8 }}
        style={{ display: 'flex', gap: '2.5rem' }}
      >
        {['Services', 'Process', 'Contact'].map(item => (
          <a key={item} href={`#${item.toLowerCase()}`} style={{
            fontFamily: 'Inter', fontSize: 11, fontWeight: 600, letterSpacing: '0.2em',
            textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', textDecoration: 'none',
            transition: 'color 0.2s'
          }}
            onMouseEnter={e => e.target.style.color = '#fff'}
            onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.45)'}
          >{item}</a>
        ))}
        <a href="#contact" style={{
          fontFamily: 'Inter', fontSize: 11, fontWeight: 700, letterSpacing: '0.2em',
          textTransform: 'uppercase', color: 'rgba(255,120,30,0.9)', textDecoration: 'none',
          border: '1px solid rgba(255,120,30,0.4)', padding: '0.5rem 1.2rem'
        }}>Emergency</a>
      </motion.div>
    </nav>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function AppCinematic() {
  return (
    <div style={{ background: '#02050a', color: '#fff', overflowX: 'hidden' }}>
      <Navbar />
      <CinematicPipes />
      <Ticker />
      <Services />
      <Stats />
      <Process />
      <Reviews />
      <Contact />
      <Footer />
    </div>
  )
}
