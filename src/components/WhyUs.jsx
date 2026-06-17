import { useRef } from 'react'
import { motion, useMotionValue, useTransform, useInView } from 'framer-motion'

const features = [
  {
    num: '01',
    title: 'Same-Day Service',
    desc: 'We dispatch a licensed plumber to your door within 60 minutes — guaranteed, no excuses.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
    ),
  },
  {
    num: '02',
    title: 'Upfront Pricing',
    desc: 'You receive a full written quote before any work starts — zero hidden fees, ever.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
    ),
  },
  {
    num: '03',
    title: '2-Year Guarantee',
    desc: 'Every repair and installation is backed by our industry-leading 2-year parts & labor warranty.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
    ),
  },
  {
    num: '04',
    title: 'Background Checked',
    desc: 'Every technician passes thorough background checks and drug screening before joining our team.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
    ),
  },
]

function AwardCard() {
  const cardRef = useRef(null)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const rotateX = useTransform(mouseY, [-100, 100], [8, -8])
  const rotateY = useTransform(mouseX, [-100, 100], [-8, 8])

  function handleMouseMove(e) {
    const rect = cardRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left - rect.width / 2
    const y = e.clientY - rect.top - rect.height / 2
    mouseX.set(x)
    mouseY.set(y)
  }

  function handleMouseLeave() {
    mouseX.set(0)
    mouseY.set(0)
  }

  return (
    <div style={{ position: 'relative' }}>
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
          perspective: 800,
          background: 'linear-gradient(135deg, #1E3A8A 0%, #1E40AF 50%, #2563EB 100%)',
          border: '1px solid rgba(96,165,250,0.3)',
          borderRadius: 20,
          padding: '40px 36px',
          cursor: 'default',
          transformOrigin: 'center center',
        }}
      >
        {/* Stars */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
          {[...Array(5)].map((_, i) => (
            <svg key={i} width="20" height="20" viewBox="0 0 24 24" fill="#FBBF24" stroke="none" aria-hidden="true">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          ))}
        </div>

        <div style={{
          fontFamily: 'Poppins, sans-serif',
          fontWeight: 900,
          fontSize: 48,
          color: 'white',
          lineHeight: 1,
          marginBottom: 4,
        }}>
          #1 Rated
        </div>
        <div style={{
          fontFamily: 'Open Sans, sans-serif',
          fontSize: 14,
          color: 'rgba(255,255,255,0.7)',
          marginBottom: 28,
        }}>
          Chicago Plumbing Service 2024
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, fontSize: 22, color: 'white' }}>4.9★</div>
            <div style={{ fontFamily: 'Open Sans, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>Google Rating</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, fontSize: 22, color: 'white' }}>2,400+</div>
            <div style={{ fontFamily: 'Open Sans, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>Reviews</div>
          </div>
        </div>

        {/* BBB Badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'rgba(255,255,255,0.1)',
          borderRadius: 10,
          padding: '12px 16px',
        }}>
          <div style={{
            width: 36, height: 36,
            background: 'white',
            borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Poppins, sans-serif',
            fontWeight: 900,
            fontSize: 14,
            color: '#1E3A8A',
          }}>
            BBB
          </div>
          <div>
            <div style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 14, color: 'white' }}>BBB Accredited</div>
            <div style={{ fontFamily: 'Open Sans, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>A+ Rating Since 2003</div>
          </div>
        </div>
      </motion.div>

      {/* Floating pills */}
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          top: -20,
          right: -20,
          background: '#EA580C',
          color: 'white',
          fontFamily: 'Poppins, sans-serif',
          fontWeight: 700,
          fontSize: 13,
          padding: '10px 18px',
          borderRadius: 100,
          boxShadow: '0 8px 24px rgba(234,88,12,0.5)',
          whiteSpace: 'nowrap',
          display: 'flex', alignItems: 'center', gap: 6,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
        60 Min Response
      </motion.div>

      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
        style={{
          position: 'absolute',
          bottom: -20,
          left: -20,
          background: 'rgba(6,9,15,0.95)',
          border: '1px solid rgba(255,255,255,0.15)',
          color: 'white',
          fontFamily: 'Poppins, sans-serif',
          fontWeight: 700,
          fontSize: 13,
          padding: '10px 18px',
          borderRadius: 100,
          whiteSpace: 'nowrap',
          display: 'flex', alignItems: 'center', gap: 6,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EA580C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
        Free Quotes
      </motion.div>
    </div>
  )
}

export default function WhyUs() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.2 })

  return (
    <section
      id="why-us"
      style={{ backgroundColor: '#06090F', padding: '100px 24px' }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 80,
          alignItems: 'center',
        }}>

          {/* Left */}
          <motion.div
            ref={ref}
            initial={{ opacity: 0, x: -40 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            <span style={{
              display: 'inline-block',
              background: 'rgba(30,64,175,0.15)',
              border: '1px solid rgba(30,64,175,0.4)',
              color: '#60A5FA',
              fontFamily: 'Open Sans, sans-serif',
              fontWeight: 700,
              fontSize: 12,
              padding: '5px 16px',
              borderRadius: 100,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: 20,
            }}>
              Why Choose Us
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
              The Standard Others <span style={{ color: '#EA580C' }}>Can't Match</span>
            </h2>

            <p style={{
              fontFamily: 'Open Sans, sans-serif',
              fontSize: 16,
              color: 'rgba(255,255,255,0.55)',
              lineHeight: 1.75,
              marginBottom: 40,
              maxWidth: 480,
            }}>
              With over 25 years serving the Chicago metro area, we've built our reputation on reliability, transparency, and craftsmanship that lasts.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {features.map((f) => (
                <motion.div
                  key={f.num}
                  whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)', paddingLeft: 20 }}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 16,
                    padding: '16px 16px',
                    borderRadius: 12,
                    transition: 'background 0.2s ease, padding-left 0.2s ease',
                    cursor: 'default',
                  }}
                >
                  <div style={{
                    width: 40, height: 40, flexShrink: 0,
                    background: 'rgba(30,64,175,0.15)',
                    border: '1px solid rgba(30,64,175,0.35)',
                    borderRadius: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#60A5FA',
                  }}>
                    {f.icon}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400, fontSize: 11, color: '#EA580C', letterSpacing: '0.08em' }}>{f.num}</span>
                      <h3 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 16, color: 'white' }}>{f.title}</h3>
                    </div>
                    <p style={{ fontFamily: 'Open Sans, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right — Award Card */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
            style={{ display: 'flex', justifyContent: 'center', padding: '40px 20px' }}
          >
            <div style={{ width: '100%', maxWidth: 380 }}>
              <AwardCard />
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  )
}
