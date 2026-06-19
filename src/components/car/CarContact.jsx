import { useRef, useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import CarCanvas from './CarCanvas'

export default function CarContact() {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'start start'] })
  const headY = useTransform(scrollYProgress, [0, 1], [80, 0])
  const headOpacity = useTransform(scrollYProgress, [0, 0.7], [0, 1])
  const [sent, setSent] = useState(false)

  const inputStyle = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    padding: '1.1rem 1.5rem',
    color: '#fff',
    fontFamily: "'Inter', sans-serif",
    fontSize: '14px', fontWeight: 300,
    outline: 'none',
    width: '100%', boxSizing: 'border-box',
    transition: 'border-color 0.3s',
  }

  return (
    <section id="contact" ref={ref} style={{ position: 'relative', background: '#050505', padding: '12rem 0 10rem', overflow: 'hidden' }}>
      {/* Muted canvas bg */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.18, pointerEvents: 'none' }}>
        <CarCanvas />
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 2.5rem', position: 'relative', zIndex: 2 }}>

        <motion.div style={{ y: headY, opacity: headOpacity }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '1.5rem' }}>
            <div style={{ width: 40, height: 1, background: 'rgba(201,168,76,0.4)' }} />
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '10px', fontWeight: 700, letterSpacing: '0.4em', color: 'rgba(201,168,76,0.65)', textTransform: 'uppercase' }}>Book Now</span>
          </div>
          <h2 style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 'clamp(48px, 7vw, 100px)',
            fontWeight: 900, color: '#fff',
            letterSpacing: '-0.04em', lineHeight: 0.88,
            marginBottom: '4rem'
          }}>
            Your car<br />
            <span style={{ WebkitTextStroke: '1.5px rgba(201,168,76,0.5)', color: 'transparent' }}>deserves this.</span>
          </h2>
        </motion.div>

        {sent ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              padding: '5rem', border: '1px solid rgba(201,168,76,0.3)',
              textAlign: 'center', background: 'rgba(201,168,76,0.04)'
            }}
          >
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 'clamp(28px, 3vw, 42px)', fontWeight: 900, color: '#c9a84c', marginBottom: '1rem' }}>
              Received.
            </div>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '15px', color: 'rgba(160,175,190,0.6)', fontWeight: 300 }}>
              We will contact you within 2 hours to confirm your booking.
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <input placeholder="Your name"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = 'rgba(201,168,76,0.5)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                />
                <input placeholder="Phone number"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = 'rgba(201,168,76,0.5)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                />
              </div>
              <input placeholder="Vehicle — make, model, year (e.g. Porsche 911 2022)"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'rgba(201,168,76,0.5)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
              />
              <select defaultValue="" style={{ ...inputStyle, color: 'rgba(255,255,255,0.55)' }}>
                <option value="" disabled>Service required</option>
                <option value="correction">Paint Correction</option>
                <option value="ceramic">Ceramic Coating</option>
                <option value="interior">Interior Detail</option>
                <option value="ppf">Paint Protection Film</option>
                <option value="full">Full Package</option>
              </select>
              <textarea placeholder="Anything else we should know about the vehicle..."
                rows={4}
                style={{ ...inputStyle, resize: 'none' }}
                onFocus={e => e.target.style.borderColor = 'rgba(201,168,76,0.5)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
              />
              <motion.button
                whileHover={{ background: 'rgba(201,168,76,0.25)', borderColor: 'rgba(201,168,76,1)' }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setSent(true)}
                style={{
                  padding: '1.3rem', border: '1px solid rgba(201,168,76,0.55)',
                  background: 'rgba(201,168,76,0.08)', color: '#fff',
                  fontFamily: "'Inter', sans-serif", fontSize: '11px', fontWeight: 700,
                  letterSpacing: '0.3em', textTransform: 'uppercase',
                  cursor: 'pointer', transition: 'all 0.4s'
                }}
              >
                Submit Enquiry
              </motion.button>
            </div>

            <div style={{ marginTop: '3.5rem', display: 'flex', gap: '4rem', flexWrap: 'wrap' }}>
              {['0800 DETAIL', 'studio@velvetdetail.co.uk', 'Mon – Sun · 8am – 8pm'].map((t, i) => (
                <div key={i} style={{ fontFamily: "'Inter', sans-serif", fontSize: '12px', color: 'rgba(160,175,190,0.4)', letterSpacing: '0.08em' }}>{t}</div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </section>
  )
}
