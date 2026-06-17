import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

const steps = [
  {
    num: '01',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8 19.79 19.79 0 01.22 2.22 2 2 0 012.18 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.18 6.18l1.27-.55a2 2 0 012.11.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>
    ),
    title: 'Call & Book',
    desc: 'Reach us any time — day or night. Our team answers immediately and books your appointment on the spot.',
  },
  {
    num: '02',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
    ),
    title: 'Diagnose & Quote',
    desc: 'Our plumber inspects thoroughly, identifies root causes, and hands you a clear upfront written quote.',
  },
  {
    num: '03',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>
    ),
    title: 'Expert Repair',
    desc: 'Our licensed master plumbers execute the repair with quality parts and meticulous craftsmanship.',
  },
  {
    num: '04',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
    ),
    title: 'Guaranteed',
    desc: 'We test everything, clean up completely, and back every job with our industry-leading 2-year guarantee.',
  },
]

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.18 } }
}

const stepVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } }
}

export default function Process() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.2 })

  return (
    <section
      id="process"
      style={{
        background: 'linear-gradient(180deg, #06090F 0%, #080D1A 50%, #06090F 100%)',
        padding: '100px 24px',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          style={{ textAlign: 'center', marginBottom: 72 }}
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
            marginBottom: 16,
          }}>
            How It Works
          </span>
          <h2 style={{
            fontFamily: 'Poppins, sans-serif',
            fontWeight: 800,
            fontSize: 'clamp(32px, 5vw, 52px)',
            color: 'white',
            letterSpacing: '-1px',
            lineHeight: 1.1,
            marginBottom: 16,
          }}>
            Simple, Transparent <span style={{ color: '#EA580C' }}>Process</span>
          </h2>
          <p style={{
            fontFamily: 'Open Sans, sans-serif',
            fontSize: 17,
            color: 'rgba(255,255,255,0.5)',
            maxWidth: 520,
            margin: '0 auto',
            lineHeight: 1.7,
          }}>
            Four straightforward steps from your call to a fully fixed, guaranteed repair.
          </p>
        </motion.div>

        {/* Steps */}
        <motion.div
          ref={ref}
          variants={containerVariants}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 0,
            position: 'relative',
          }}
        >
          {/* Connecting line */}
          <div style={{
            position: 'absolute',
            top: 44,
            left: '12.5%',
            right: '12.5%',
            height: 1,
            background: 'linear-gradient(90deg, rgba(30,64,175,0.5) 0%, rgba(234,88,12,0.5) 100%)',
            pointerEvents: 'none',
          }} aria-hidden="true" />

          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              variants={stepVariants}
              style={{ textAlign: 'center', padding: '0 24px 0' }}
            >
              {/* Icon bubble */}
              <div style={{ position: 'relative', display: 'inline-block', marginBottom: 28 }}>
                <div style={{
                  width: 88, height: 88,
                  background: 'linear-gradient(135deg, rgba(30,64,175,0.2), rgba(30,64,175,0.08))',
                  border: '1px solid rgba(30,64,175,0.4)',
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#60A5FA',
                  margin: '0 auto',
                  position: 'relative',
                  zIndex: 1,
                }}>
                  {step.icon}
                </div>
                <span style={{
                  position: 'absolute',
                  top: -8,
                  right: -8,
                  background: '#EA580C',
                  color: 'white',
                  fontFamily: 'Poppins, sans-serif',
                  fontWeight: 800,
                  fontSize: 11,
                  width: 24, height: 24,
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  zIndex: 2,
                }}>
                  {i + 1}
                </span>
              </div>

              <h3 style={{
                fontFamily: 'Poppins, sans-serif',
                fontWeight: 700,
                fontSize: 20,
                color: 'white',
                marginBottom: 12,
                letterSpacing: '-0.3px',
              }}>
                {step.title}
              </h3>
              <p style={{
                fontFamily: 'Open Sans, sans-serif',
                fontSize: 14,
                color: 'rgba(255,255,255,0.5)',
                lineHeight: 1.7,
                maxWidth: 200,
                margin: '0 auto',
              }}>
                {step.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>

      </div>
    </section>
  )
}
