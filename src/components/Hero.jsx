import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'

function AnimatedStat({ target, suffix, label }) {
  const mv = useMotionValue(0)
  const spring = useSpring(mv, { stiffness: 40, damping: 20 })
  const [display, setDisplay] = useState(0)
  const ref = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        mv.set(target)
        observer.disconnect()
      }
    }, { threshold: 0.3 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [mv, target])

  useEffect(() => {
    return spring.on('change', (v) => setDisplay(Math.round(v)))
  }, [spring])

  return (
    <div ref={ref} style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 900, fontSize: 'clamp(28px,4vw,44px)', color: '#EA580C', lineHeight: 1 }}>
        {display.toLocaleString()}{suffix}
      </div>
      <div style={{ fontFamily: 'Open Sans, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 6, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        {label}
      </div>
    </div>
  )
}

export default function Hero() {
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

    // Particles
    const particles = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2 + 0.5,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.5 + 0.1,
    }))

    let t = 0
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Sine waves
      const waves = [
        { color: 'rgba(30,64,175,0.15)', amp: 60, freq: 0.008, phase: 0, speed: 0.012 },
        { color: 'rgba(30,64,175,0.10)', amp: 45, freq: 0.006, phase: 1, speed: 0.009 },
        { color: 'rgba(234,88,12,0.08)', amp: 35, freq: 0.01, phase: 2, speed: 0.015 },
        { color: 'rgba(96,165,250,0.08)', amp: 25, freq: 0.012, phase: 3, speed: 0.011 },
        { color: 'rgba(234,88,12,0.05)', amp: 50, freq: 0.005, phase: 4, speed: 0.007 },
      ]

      waves.forEach(w => {
        ctx.beginPath()
        ctx.moveTo(0, canvas.height / 2)
        for (let x = 0; x <= canvas.width; x += 4) {
          const y = canvas.height / 2 + Math.sin(x * w.freq + t * w.speed + w.phase) * w.amp
          ctx.lineTo(x, y)
        }
        ctx.lineTo(canvas.width, canvas.height)
        ctx.lineTo(0, canvas.height)
        ctx.closePath()
        ctx.fillStyle = w.color
        ctx.fill()
      })

      // Particles
      particles.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(96,165,250,${p.alpha})`
        ctx.fill()
      })

      t++
      animRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      window.removeEventListener('resize', resize)
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [])

  const headingWords = ['Chicago\'s', '#1', 'Trusted', 'Plumbing', 'Experts']

  const containerVariants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: 0.12, delayChildren: 0.3 }
    }
  }

  const wordVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
  }

  return (
    <section
      id="hero"
      style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        backgroundColor: '#06090F',
      }}
    >
      {/* Canvas Background */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      />

      {/* Dark overlay gradient */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at 50% 0%, rgba(30,64,175,0.15) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} aria-hidden="true" />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 2, maxWidth: 960, margin: '0 auto', padding: '120px 24px 80px', textAlign: 'center' }}>

        {/* Eyebrow Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 28 }}
        >
          <span style={{
            background: 'rgba(234,88,12,0.15)',
            border: '1px solid rgba(234,88,12,0.4)',
            color: '#FB923C',
            fontFamily: 'Open Sans, sans-serif',
            fontWeight: 700,
            fontSize: 12,
            padding: '6px 16px',
            borderRadius: 100,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}>
            ⚡ Est. 1999 · Chicago's Premier Plumbing Service
          </span>
        </motion.div>

        {/* Heading */}
        <motion.h1
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          style={{
            fontFamily: 'Poppins, sans-serif',
            fontWeight: 900,
            fontSize: 'clamp(40px, 7vw, 84px)',
            lineHeight: 1.05,
            letterSpacing: '-2px',
            marginBottom: 24,
            overflow: 'hidden',
          }}
        >
          {headingWords.map((word, i) => (
            <span key={i} style={{ display: 'inline-block', overflow: 'hidden', marginRight: i < headingWords.length - 1 ? '0.25em' : 0 }}>
              <motion.span
                variants={wordVariants}
                style={{
                  display: 'inline-block',
                  color: word === '#1' ? '#EA580C' : 'white',
                }}
              >
                {word}
              </motion.span>
            </span>
          ))}
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          style={{
            fontFamily: 'Open Sans, sans-serif',
            fontSize: 'clamp(16px, 2.5vw, 20px)',
            color: 'rgba(255,255,255,0.65)',
            lineHeight: 1.7,
            maxWidth: 640,
            margin: '0 auto 40px',
          }}
        >
          Fast, reliable plumbing repairs and installations. Licensed master plumbers available 24/7 — same-day service guaranteed with upfront, honest pricing.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.1 }}
          style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 64 }}
        >
          <motion.a
            href="#contact"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              backgroundColor: '#1E40AF',
              color: 'white',
              fontFamily: 'Poppins, sans-serif',
              fontWeight: 700,
              fontSize: 16,
              padding: '16px 32px',
              borderRadius: 10,
              textDecoration: 'none',
              cursor: 'pointer',
              boxShadow: '0 8px 32px rgba(30,64,175,0.4)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Get Free Estimate
          </motion.a>
          <motion.a
            href="tel:8005551234"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              backgroundColor: 'transparent',
              color: '#EA580C',
              fontFamily: 'Poppins, sans-serif',
              fontWeight: 700,
              fontSize: 16,
              padding: '16px 32px',
              borderRadius: 10,
              textDecoration: 'none',
              cursor: 'pointer',
              border: '2px solid #EA580C',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8 19.79 19.79 0 01.22 2.22 2 2 0 012.18 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.18 6.18l1.27-.55a2 2 0 012.11.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>
            Emergency Line
          </motion.a>
        </motion.div>

        {/* Stats Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.3 }}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 24,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16,
            padding: '28px 24px',
          }}
        >
          <AnimatedStat target={25} suffix="+" label="Years Experience" />
          <AnimatedStat target={10000} suffix="+" label="Happy Customers" />
          <AnimatedStat target={99} suffix="%" label="Satisfaction Rate" />
          <AnimatedStat target={24} suffix="/7" label="Emergency Service" />
        </motion.div>

      </div>

      {/* Bottom fade */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 80,
        background: 'linear-gradient(to bottom, transparent, #06090F)',
        pointerEvents: 'none',
      }} aria-hidden="true" />
    </section>
  )
}
