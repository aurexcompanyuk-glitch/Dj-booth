import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'

function ParticleCanvas() {
  const canvasRef = useRef(null)
  const animRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2 + 0.5,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      alpha: Math.random() * 0.3 + 0.05,
    }))

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(234,88,12,${p.alpha})`
        ctx.fill()
      })
      animRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      window.removeEventListener('resize', resize)
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      aria-hidden="true"
    />
  )
}

const inputStyle = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  padding: '14px 16px',
  fontFamily: 'Open Sans, sans-serif',
  fontSize: 15,
  color: 'white',
  outline: 'none',
  transition: 'border-color 0.2s ease',
}

const labelStyle = {
  fontFamily: 'Open Sans, sans-serif',
  fontWeight: 600,
  fontSize: 13,
  color: 'rgba(255,255,255,0.6)',
  display: 'block',
  marginBottom: 6,
  letterSpacing: '0.03em',
}

export default function Contact() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.2 })
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <section
      id="contact"
      style={{
        position: 'relative',
        backgroundColor: '#080D1A',
        padding: '100px 24px',
        overflow: 'hidden',
      }}
    >
      <ParticleCanvas />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 64,
          alignItems: 'start',
        }}>

          {/* Left info */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7 }}
          >
            <span style={{
              display: 'inline-block',
              background: 'rgba(234,88,12,0.12)',
              border: '1px solid rgba(234,88,12,0.3)',
              color: '#FB923C',
              fontFamily: 'Open Sans, sans-serif',
              fontWeight: 700,
              fontSize: 12,
              padding: '5px 16px',
              borderRadius: 100,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: 20,
            }}>
              Get In Touch
            </span>
            <h2 style={{
              fontFamily: 'Poppins, sans-serif',
              fontWeight: 800,
              fontSize: 'clamp(32px, 4vw, 48px)',
              color: 'white',
              lineHeight: 1.1,
              letterSpacing: '-1px',
              marginBottom: 20,
            }}>
              Ready to Fix It <span style={{ color: '#EA580C' }}>Today?</span>
            </h2>
            <p style={{
              fontFamily: 'Open Sans, sans-serif',
              fontSize: 16,
              color: 'rgba(255,255,255,0.5)',
              lineHeight: 1.75,
              marginBottom: 48,
            }}>
              Contact us now for a free estimate. We respond within minutes — not hours.
            </p>

            {[
              {
                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8 19.79 19.79 0 01.22 2.22 2 2 0 012.18 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.18 6.18l1.27-.55a2 2 0 012.11.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>,
                label: 'Phone',
                value: '(800) 555-1234',
                href: 'tel:8005551234',
              },
              {
                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
                label: 'Email',
                value: 'hello@flowmasterpro.com',
                href: 'mailto:hello@flowmasterpro.com',
              },
              {
                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
                label: 'Service Area',
                value: 'Chicago Metro Area, IL',
                href: null,
              },
              {
                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
                label: 'Hours',
                value: '24/7 — 365 Days a Year',
                href: null,
              },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                <div style={{
                  width: 44, height: 44, flexShrink: 0,
                  background: 'rgba(30,64,175,0.15)',
                  border: '1px solid rgba(30,64,175,0.3)',
                  borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#60A5FA',
                }}>
                  {item.icon}
                </div>
                <div>
                  <div style={{ fontFamily: 'Open Sans, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>{item.label}</div>
                  {item.href
                    ? <a href={item.href} style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, fontSize: 16, color: 'white', textDecoration: 'none' }}>{item.value}</a>
                    : <span style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, fontSize: 16, color: 'white' }}>{item.value}</span>
                  }
                </div>
              </div>
            ))}
          </motion.div>

          {/* Right form */}
          <motion.div
            ref={ref}
            initial={{ opacity: 0, x: 40 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.15 }}
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 20,
              padding: 36,
            }}
          >
            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ textAlign: 'center', padding: '40px 0' }}
              >
                <div style={{ color: '#60A5FA', marginBottom: 16 }}>
                  <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
                </div>
                <h3 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 24, color: 'white', marginBottom: 12 }}>
                  Message Received!
                </h3>
                <p style={{ fontFamily: 'Open Sans, sans-serif', fontSize: 16, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>
                  We'll be in touch within minutes. For emergencies, call us directly at (800) 555-1234.
                </p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                <h3 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 22, color: 'white', marginBottom: 28 }}>
                  Get Your Free Estimate
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label htmlFor="name" style={labelStyle}>Full Name</label>
                    <input id="name" type="text" placeholder="John Smith" required style={inputStyle}
                      onFocus={e => e.target.style.borderColor = '#1E40AF'}
                      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" style={labelStyle}>Phone Number</label>
                    <input id="phone" type="tel" placeholder="(312) 555-0000" required style={inputStyle}
                      onFocus={e => e.target.style.borderColor = '#1E40AF'}
                      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label htmlFor="service" style={labelStyle}>Service Needed</label>
                  <select id="service" required style={{ ...inputStyle, cursor: 'pointer' }}
                    onFocus={e => e.target.style.borderColor = '#1E40AF'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                  >
                    <option value="" style={{ background: '#06090F' }}>Select a service...</option>
                    <option value="emergency" style={{ background: '#06090F' }}>Emergency Repair</option>
                    <option value="drain" style={{ background: '#06090F' }}>Drain Cleaning</option>
                    <option value="general" style={{ background: '#06090F' }}>General Repairs</option>
                    <option value="install" style={{ background: '#06090F' }}>Installation</option>
                    <option value="water" style={{ background: '#06090F' }}>Water Quality</option>
                    <option value="repipe" style={{ background: '#06090F' }}>Re-Piping</option>
                    <option value="other" style={{ background: '#06090F' }}>Other</option>
                  </select>
                </div>
                <div style={{ marginBottom: 24 }}>
                  <label htmlFor="message" style={labelStyle}>Message</label>
                  <textarea
                    id="message"
                    rows={4}
                    placeholder="Describe the issue briefly..."
                    style={{ ...inputStyle, resize: 'vertical', minHeight: 100 }}
                    onFocus={e => e.target.style.borderColor = '#1E40AF'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                  />
                </div>
                <motion.button
                  type="submit"
                  whileHover={{
                    scale: 1.03,
                    boxShadow: '0 8px 32px rgba(234,88,12,0.5)',
                  }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    width: '100%',
                    backgroundColor: '#EA580C',
                    color: 'white',
                    fontFamily: 'Poppins, sans-serif',
                    fontWeight: 700,
                    fontSize: 16,
                    padding: '16px',
                    borderRadius: 10,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'box-shadow 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                  Send Request — It's Free
                </motion.button>
                <p style={{ fontFamily: 'Open Sans, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginTop: 12 }}>
                  We respond within minutes. No spam, ever.
                </p>
              </form>
            )}
          </motion.div>

        </div>
      </div>
    </section>
  )
}
