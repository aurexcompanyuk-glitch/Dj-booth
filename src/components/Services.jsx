import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

const services = [
  {
    num: '01',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
    ),
    title: 'Emergency Repairs',
    desc: 'Burst pipes, severe leaks, and flooding — we arrive within 60 minutes, 24 hours a day.',
    bullets: ['60-min response time', 'Available all holidays', 'No extra after-hours fee'],
  },
  {
    num: '02',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M12 8v4l3 3"/></svg>
    ),
    title: 'Drain Cleaning',
    desc: 'Professional hydro-jetting and snaking to clear even the most stubborn blockages fast.',
    bullets: ['Hydro-jet technology', 'Camera inspection included', 'Root removal specialists'],
  },
  {
    num: '03',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M5.34 5.34L3.93 6.75M19.07 19.07l-1.41-1.41M5.34 18.66l-1.41 1.41M21 12h-3M6 12H3M12 21v-3M12 6V3"/></svg>
    ),
    title: 'General Repairs',
    desc: 'Leaky faucets, running toilets, dripping showers — small problems fixed before they become big ones.',
    bullets: ['Faucet & fixture repairs', 'Toilet rebuilds', 'Pipe leak sealing'],
  },
  {
    num: '04',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="15" x2="13" y2="15"/></svg>
    ),
    title: 'Installations',
    desc: 'New water heaters, dishwashers, garbage disposals, and complete bathroom suite installations.',
    bullets: ['Water heater installation', 'Appliance hookups', 'Bathroom & kitchen fits'],
  },
  {
    num: '05',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2a10 10 0 0110 10 10 10 0 01-10 10A10 10 0 012 12 10 10 0 0112 2z"/><path d="M12 6v6l4 2"/></svg>
    ),
    title: 'Water Quality',
    desc: 'Whole-home filtration, water softeners, and reverse osmosis systems for cleaner, safer water.',
    bullets: ['Water softener systems', 'Whole-home filtration', 'RO system installation'],
  },
  {
    num: '06',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
    ),
    title: 'Re-Piping',
    desc: 'Complete whole-home repiping services using modern PEX and copper piping for decades of reliability.',
    bullets: ['PEX & copper piping', 'Galvanized pipe replacement', 'Whole-home solutions'],
  },
]

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } }
}

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
}

export default function Services() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.1 })

  return (
    <section
      id="services"
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
            marginBottom: 16,
          }}>
            What We Do
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
            Complete Plumbing <span style={{ color: '#EA580C' }}>Solutions</span>
          </h2>
          <p style={{
            fontFamily: 'Open Sans, sans-serif',
            fontSize: 17,
            color: 'rgba(255,255,255,0.55)',
            maxWidth: 560,
            margin: '0 auto',
            lineHeight: 1.7,
          }}>
            From emergency repairs to full repiping — expert plumbers handle every job with precision and care.
          </p>
        </motion.div>

        {/* Cards Grid */}
        <motion.div
          ref={ref}
          variants={containerVariants}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: 24,
          }}
        >
          {services.map((s) => (
            <motion.div
              key={s.num}
              variants={cardVariants}
              whileHover={{ y: -8, borderColor: '#EA580C' }}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 16,
                padding: 32,
                cursor: 'pointer',
                transition: 'border-color 0.25s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{
                  width: 52, height: 52,
                  background: 'rgba(30,64,175,0.15)',
                  border: '1px solid rgba(30,64,175,0.3)',
                  borderRadius: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#60A5FA',
                }}>
                  {s.icon}
                </div>
                <span style={{
                  fontFamily: 'Poppins, sans-serif',
                  fontWeight: 800,
                  fontSize: 36,
                  color: 'rgba(255,255,255,0.06)',
                  lineHeight: 1,
                }}>
                  {s.num}
                </span>
              </div>
              <h3 style={{
                fontFamily: 'Poppins, sans-serif',
                fontWeight: 700,
                fontSize: 20,
                color: 'white',
                marginBottom: 10,
                letterSpacing: '-0.3px',
              }}>
                {s.title}
              </h3>
              <p style={{
                fontFamily: 'Open Sans, sans-serif',
                fontSize: 14,
                color: 'rgba(255,255,255,0.55)',
                lineHeight: 1.7,
                marginBottom: 20,
              }}>
                {s.desc}
              </p>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {s.bullets.map((b, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EA580C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                    <span style={{ fontFamily: 'Open Sans, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>{b}</span>
                  </li>
                ))}
              </ul>
              <a
                href="#contact"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  marginTop: 24,
                  fontFamily: 'Open Sans, sans-serif',
                  fontWeight: 700,
                  fontSize: 13,
                  color: '#60A5FA',
                  textDecoration: 'none',
                  letterSpacing: '0.02em',
                  cursor: 'pointer',
                }}
              >
                Learn more
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
              </a>
            </motion.div>
          ))}
        </motion.div>

      </div>
    </section>
  )
}
