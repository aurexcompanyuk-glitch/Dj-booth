import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useSpring, useScroll, useTransform } from 'framer-motion'

function AnimatedStat({ target, suffix, label }) {
  const mv = useMotionValue(0)
  const spring = useSpring(mv, { stiffness: 40, damping: 20 })
  const [display, setDisplay] = useState(0)
  const ref = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { mv.set(target); observer.disconnect() }
    }, { threshold: 0.3 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [mv, target])

  useEffect(() => spring.on('change', v => setDisplay(Math.round(v))), [spring])

  return (
    <div ref={ref} style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 900, fontSize: 'clamp(26px,3.5vw,42px)', color: '#EA580C', lineHeight: 1 }}>
        {display.toLocaleString()}{suffix}
      </div>
      <div style={{ fontFamily: 'Open Sans, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 6, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        {label}
      </div>
    </div>
  )
}

function ScrambleText({ text, delay = 0 }) {
  const [displayed, setDisplayed] = useState('')
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const started = useRef(false)
  const ref = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true
        let frame = 0
        const totalFrames = 20
        setTimeout(() => {
          const interval = setInterval(() => {
            frame++
            const progress = frame / totalFrames
            setDisplayed(
              text.split('').map((char, i) => {
                if (char === ' ' || char === '·') return char
                if (i / text.length < progress) return char
                return chars[Math.floor(Math.random() * chars.length)]
              }).join('')
            )
            if (frame >= totalFrames) { clearInterval(interval); setDisplayed(text) }
          }, 38)
        }, delay * 1000)
        observer.disconnect()
      }
    }, { threshold: 0.3 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [text, delay])

  return <span ref={ref}>{displayed || ' '.repeat(text.length)}</span>
}

export default function Hero() {
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const sectionRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end start'] })
  const yParallax = useTransform(scrollYProgress, [0, 1], [0, 150])
  const opacityFade = useTransform(scrollYProgress, [0, 0.65], [1, 0])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight }
    resize()
    window.addEventListener('resize', resize)

    const particles = Array.from({ length: 140 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2.0 + 0.4,
      vx: (Math.random() - 0.5) * 0.28,
      vy: (Math.random() - 0.5) * 0.28,
      alpha: Math.random() * 0.42 + 0.07,
      type: Math.random() > 0.65 ? 'orange' : Math.random() > 0.5 ? 'blue' : 'cyan',
    }))

    let t = 0
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const waves = [
        { r: 30, g: 64, b: 175, amp: 72, freq: 0.007, phase: 0, speed: 0.009, alpha: 0.13 },
        { r: 30, g: 64, b: 175, amp: 50, freq: 0.005, phase: 1.5, speed: 0.007, alpha: 0.09 },
        { r: 234, g: 88, b: 12, amp: 42, freq: 0.009, phase: 2.8, speed: 0.013, alpha: 0.07 },
        { r: 96, g: 165, b: 250, amp: 28, freq: 0.011, phase: 4, speed: 0.01, alpha: 0.06 },
        { r: 234, g: 88, b: 12, amp: 55, freq: 0.004, phase: 5.5, speed: 0.006, alpha: 0.05 },
        { r: 147, g: 51, b: 234, amp: 18, freq: 0.013, phase: 0.7, speed: 0.016, alpha: 0.035 },
      ]
      waves.forEach(w => {
        ctx.beginPath()
        ctx.moveTo(0, canvas.height / 2)
        for (let x = 0; x <= canvas.width; x += 3) {
          const y = canvas.height / 2
            + Math.sin(x * w.freq + t * w.speed + w.phase) * w.amp
            + Math.sin(x * w.freq * 1.7 + t * w.speed * 0.6 + w.phase * 1.3) * (w.amp * 0.35)
          ctx.lineTo(x, y)
        }
        ctx.lineTo(canvas.width, canvas.height)
        ctx.lineTo(0, canvas.height)
        ctx.closePath()
        ctx.fillStyle = `rgba(${w.r},${w.g},${w.b},${w.alpha})`
        ctx.fill()
      })

      particles.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0
        const c = p.type === 'orange' ? `rgba(234,140,60,${p.alpha})` : p.type === 'blue' ? `rgba(96,165,250,${p.alpha})` : `rgba(147,197,253,${p.alpha})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = c
        ctx.fill()
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[j].x - p.x, dy = particles[j].y - p.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 85) {
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = `rgba(96,165,250,${0.055 * (1 - dist / 85)})`
            ctx.lineWidth = 0.5; ctx.stroke()
          }
        }
      })
      t++
      animRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(animRef.current) }
  }, [])

  return (
    <section
      ref={sectionRef}
      id="hero"
      style={{ position: 'relative', minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#06090F' }}
    >
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} aria-hidden="true" />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(30,64,175,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} aria-hidden="true" />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 120, background: 'linear-gradient(to bottom, transparent, #06090F)', pointerEvents: 'none' }} aria-hidden="true" />

      <motion.div style={{ y: yParallax, opacity: opacityFade, position: 'relative', zIndex: 2, maxWidth: 1000, margin: '0 auto', padding: '130px 24px 90px', textAlign: 'center' }}>

        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.1 }} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 30 }}>
          <span style={{ background: 'rgba(234,88,12,0.12)', border: '1px solid rgba(234,88,12,0.35)', color: '#FB923C', fontFamily: 'Open Sans, sans-serif', fontWeight: 700, fontSize: 12, padding: '6px 18px', borderRadius: 100, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Est. 1999 · Chicago's Premier Plumbing Service
          </span>
        </motion.div>

        <div style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 900, fontSize: 'clamp(42px, 7.5vw, 90px)', lineHeight: 1.02, letterSpacing: '-2.5px', marginBottom: 28, overflow: 'hidden' }}>
          {[
            { word: "Chicago's", color: 'white' },
            { word: '#1', color: '#EA580C' },
            { word: 'Trusted', color: 'white' },
            { word: 'Plumbing', color: 'white' },
            { word: 'Experts', color: 'white' },
          ].map(({ word, color }, i) => (
            <span key={i} style={{ display: 'inline-block', overflow: 'hidden', marginRight: i < 4 ? '0.22em' : 0 }}>
              <motion.span
                initial={{ y: '110%', opacity: 0 }}
                animate={{ y: '0%', opacity: 1 }}
                transition={{ duration: 0.65, delay: 0.3 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                style={{ display: 'inline-block', color }}
              >
                {word}
              </motion.span>
            </span>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 1.0 }}
          style={{ fontFamily: 'Open Sans, sans-serif', fontSize: 'clamp(16px, 2.2vw, 19px)', color: 'rgba(255,255,255,0.6)', lineHeight: 1.75, maxWidth: 620, margin: '0 auto 44px' }}
        >
          Fast, reliable plumbing repairs and installations. Licensed master plumbers available 24/7 — same-day service guaranteed with upfront, honest pricing.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 1.15 }}
          style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 70 }}
        >
          <motion.a href="#contact" whileHover={{ scale: 1.04, boxShadow: '0 12px 48px rgba(30,64,175,0.55)' }} whileTap={{ scale: 0.97 }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 10, backgroundColor: '#1E40AF', color: 'white', fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 15, padding: '16px 34px', borderRadius: 10, textDecoration: 'none', cursor: 'pointer', boxShadow: '0 8px 32px rgba(30,64,175,0.4)', transition: 'box-shadow 0.3s ease' }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
            Get Free Estimate
          </motion.a>
          <motion.a href="tel:8005551234" whileHover={{ scale: 1.04, backgroundColor: 'rgba(234,88,12,0.1)' }} whileTap={{ scale: 0.97 }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 10, backgroundColor: 'transparent', color: '#EA580C', fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 15, padding: '16px 34px', borderRadius: 10, textDecoration: 'none', cursor: 'pointer', border: '2px solid #EA580C', transition: 'background 0.25s ease' }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8 19.79 19.79 0 01.22 2.22 2 2 0 012.18 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.18 6.18l1.27-.55a2 2 0 012.11.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" /></svg>
            Emergency Line
          </motion.a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 1.3 }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '26px 24px', backdropFilter: 'blur(10px)' }}
        >
          <AnimatedStat target={25} suffix="+" label="Years Experience" />
          <AnimatedStat target={10000} suffix="+" label="Happy Customers" />
          <AnimatedStat target={99} suffix="%" label="Satisfaction Rate" />
          <AnimatedStat target={24} suffix="/7" label="Emergency Service" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.9, duration: 0.7 }}
          style={{ marginTop: 32, fontFamily: 'monospace', fontSize: 11, color: 'rgba(96,165,250,0.45)', letterSpacing: '0.12em', textTransform: 'uppercase' }}
        >
          <ScrambleText text="Licensed · Bonded · Insured · Illinois Lic. PL-2024-7834" delay={2.2} />
        </motion.div>

      </motion.div>
    </section>
  )
}
