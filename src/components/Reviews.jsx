import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

const reviews = [
  {
    stars: 5,
    quote: 'FlowMaster Pro saved us on Christmas morning — burst pipe, water everywhere. They arrived in 45 minutes, fixed it completely, and charged exactly what they quoted. I can\'t recommend them highly enough. These guys are the real deal.',
    initials: 'SJ',
    name: 'Sarah Johnson',
    location: 'Lincoln Park, Chicago',
    date: 'Dec 2024',
  },
  {
    stars: 5,
    quote: 'Absolutely outstanding. Quoted the job upfront, arrived on time, cleaned up perfectly. 5 stars without hesitation.',
    initials: 'MC',
    name: 'Mike Chen',
    location: 'Wicker Park',
    date: 'Nov 2024',
  },
  {
    stars: 5,
    quote: 'Called at 2am about a flooding basement. Plumber was here within an hour. Professional, kind, and efficient. Worth every penny.',
    initials: 'RA',
    name: 'Rebecca Adams',
    location: 'Oak Park',
    date: 'Oct 2024',
  },
  {
    stars: 5,
    quote: 'Best plumbers in Chicago. Have used them three times now — always punctual, always fair pricing. My go-to for everything.',
    initials: 'DM',
    name: 'David Martinez',
    location: 'Evanston',
    date: 'Sep 2024',
  },
  {
    stars: 5,
    quote: 'Installed a whole new water heater and softener system. Immaculate work, zero leaks, spotless cleanup. Highly recommended.',
    initials: 'TW',
    name: 'Tracy Wilson',
    location: 'River North',
    date: 'Aug 2024',
  },
]

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } }
}

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } }
}

function Stars({ count }) {
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {[...Array(count)].map((_, i) => (
        <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="#FBBF24" stroke="none" aria-hidden="true">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      ))}
    </div>
  )
}

export default function Reviews() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.1 })

  return (
    <section
      id="reviews"
      style={{ backgroundColor: '#06090F', padding: '100px 24px' }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          style={{ textAlign: 'center', marginBottom: 64 }}
        >
          <span style={{
            display: 'inline-block',
            background: 'rgba(251,191,36,0.12)',
            border: '1px solid rgba(251,191,36,0.3)',
            color: '#FBBF24',
            fontFamily: 'Open Sans, sans-serif',
            fontWeight: 700,
            fontSize: 12,
            padding: '5px 16px',
            borderRadius: 100,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: 16,
          }}>
            Customer Reviews
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
            2,400+ Happy <span style={{ color: '#EA580C' }}>Customers</span>
          </h2>
          <p style={{
            fontFamily: 'Open Sans, sans-serif',
            fontSize: 17,
            color: 'rgba(255,255,255,0.5)',
            maxWidth: 480,
            margin: '0 auto',
            lineHeight: 1.7,
          }}>
            Real reviews from real Chicago homeowners who trust FlowMaster Pro.
          </p>
        </motion.div>

        {/* Bento grid */}
        <motion.div
          ref={ref}
          variants={containerVariants}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gridTemplateRows: 'auto auto',
            gap: 20,
          }}
        >
          {/* Card 0 — spans 2 rows */}
          <motion.div
            variants={cardVariants}
            whileHover={{ y: -8 }}
            style={{
              gridRow: 'span 2',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16,
              padding: 32,
              display: 'flex',
              flexDirection: 'column',
              cursor: 'default',
            }}
          >
            <Stars count={reviews[0].stars} />
            <p style={{
              fontFamily: 'Open Sans, sans-serif',
              fontSize: 17,
              color: 'rgba(255,255,255,0.8)',
              lineHeight: 1.8,
              marginTop: 20,
              flex: 1,
            }}>
              "{reviews[0].quote}"
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 28 }}>
              <div style={{
                width: 44, height: 44,
                background: 'linear-gradient(135deg, #1E40AF, #2563EB)',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Poppins, sans-serif',
                fontWeight: 700,
                fontSize: 14,
                color: 'white',
                flexShrink: 0,
              }}>
                {reviews[0].initials}
              </div>
              <div>
                <div style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 14, color: 'white' }}>{reviews[0].name}</div>
                <div style={{ fontFamily: 'Open Sans, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{reviews[0].location} · {reviews[0].date}</div>
              </div>
            </div>
          </motion.div>

          {/* Cards 1-4 */}
          {reviews.slice(1).map((r) => (
            <motion.div
              key={r.name}
              variants={cardVariants}
              whileHover={{ y: -8 }}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 16,
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
                cursor: 'default',
              }}
            >
              <Stars count={r.stars} />
              <p style={{
                fontFamily: 'Open Sans, sans-serif',
                fontSize: 14,
                color: 'rgba(255,255,255,0.7)',
                lineHeight: 1.75,
                marginTop: 14,
                flex: 1,
              }}>
                "{r.quote}"
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 20 }}>
                <div style={{
                  width: 38, height: 38,
                  background: 'linear-gradient(135deg, #1E40AF, #EA580C)',
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Poppins, sans-serif',
                  fontWeight: 700,
                  fontSize: 12,
                  color: 'white',
                  flexShrink: 0,
                }}>
                  {r.initials}
                </div>
                <div>
                  <div style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 13, color: 'white' }}>{r.name}</div>
                  <div style={{ fontFamily: 'Open Sans, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>{r.location} · {r.date}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

      </div>

      <style>{`
        @media (max-width: 900px) {
          #reviews-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 600px) {
          #reviews-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  )
}
