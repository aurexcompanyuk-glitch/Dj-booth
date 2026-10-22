import { useRef } from 'react'
import { motion, useScroll, useTransform, useInView } from 'framer-motion'

const photos = [
  {
    src: 'https://picsum.photos/seed/copper-pipes-professional/800/600',
    label: 'Copper Pipe Installation',
    sub: 'Whole-home repiping project',
    tall: false,
  },
  {
    src: 'https://picsum.photos/seed/modern-bathroom-sink/600/900',
    label: 'Bathroom Renovation',
    sub: 'Complete fixture replacement',
    tall: true,
  },
  {
    src: 'https://picsum.photos/seed/water-heater-tank/800/600',
    label: 'Water Heater Install',
    sub: 'Same-day replacement guaranteed',
    tall: false,
  },
  {
    src: 'https://picsum.photos/seed/kitchen-plumber-faucet/800/600',
    label: 'Kitchen Faucet Repair',
    sub: 'Leak-free precision fitting',
    tall: false,
  },
  {
    src: 'https://picsum.photos/seed/drain-cleaning-sewer/600/900',
    label: 'Hydro-Jet Drain Clean',
    sub: 'Blockage removal at root level',
    tall: true,
  },
  {
    src: 'https://picsum.photos/seed/pipe-repair-wrench/800/600',
    label: 'Emergency Pipe Repair',
    sub: '60-minute response, 24/7',
    tall: false,
  },
]

function PhotoCard({ photo, index }) {
  const cardRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: cardRef, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [index % 2 === 0 ? 30 : -30, index % 2 === 0 ? -30 : 30])

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      whileHover="hover"
      style={{
        position: 'relative',
        borderRadius: 16,
        overflow: 'hidden',
        cursor: 'default',
        gridRow: photo.tall ? 'span 2' : 'span 1',
        background: '#0a1220',
      }}
    >
      {/* Parallax image */}
      <motion.div style={{ y, height: '100%', width: '100%', position: 'absolute', inset: 0 }}>
        <img
          src={photo.src}
          alt={photo.label}
          loading="lazy"
          style={{
            width: '100%',
            height: photo.tall ? '115%' : '115%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      </motion.div>

      {/* Gradient overlay — always visible at bottom */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(to top, rgba(3,5,10,0.92) 0%, rgba(3,5,10,0.3) 40%, transparent 70%)',
        zIndex: 1,
      }} />

      {/* Hover shimmer overlay */}
      <motion.div
        variants={{ hover: { opacity: 1 } }}
        initial={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(135deg, rgba(30,64,175,0.18) 0%, transparent 60%, rgba(234,88,12,0.12) 100%)',
          zIndex: 2,
        }}
      />

      {/* Border glow on hover */}
      <motion.div
        variants={{ hover: { opacity: 1 } }}
        initial={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 16,
          border: '1px solid rgba(96,165,250,0.4)',
          zIndex: 3,
          pointerEvents: 'none',
        }}
      />

      {/* Label */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 22px', zIndex: 4 }}>
        <motion.div
          variants={{ hover: { y: 0, opacity: 1 } }}
          initial={{ y: 8, opacity: 0.7 }}
          transition={{ duration: 0.3 }}
        >
          <div style={{
            fontFamily: 'Poppins, sans-serif',
            fontWeight: 700,
            fontSize: 15,
            color: 'white',
            marginBottom: 4,
            lineHeight: 1.3,
          }}>
            {photo.label}
          </div>
          <div style={{
            fontFamily: 'Open Sans, sans-serif',
            fontSize: 12,
            color: 'rgba(255,255,255,0.55)',
          }}>
            {photo.sub}
          </div>
        </motion.div>
      </div>

      {/* Top-right tag — reveals on hover */}
      <motion.div
        variants={{ hover: { opacity: 1, scale: 1 } }}
        initial={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.25 }}
        style={{
          position: 'absolute',
          top: 14,
          right: 14,
          background: 'rgba(6,9,15,0.85)',
          border: '1px solid rgba(96,165,250,0.3)',
          color: '#60A5FA',
          fontFamily: 'Open Sans, sans-serif',
          fontWeight: 700,
          fontSize: 11,
          padding: '5px 10px',
          borderRadius: 6,
          letterSpacing: '0.06em',
          zIndex: 4,
          backdropFilter: 'blur(6px)',
        }}
      >
        FlowMaster Pro
      </motion.div>
    </motion.div>
  )
}

export default function PhotoGallery() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.15 })

  return (
    <section
      id="gallery"
      style={{ backgroundColor: '#06090F', padding: '100px 24px', overflow: 'hidden' }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'flex-end', marginBottom: 56 }}
        >
          <div>
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
              marginBottom: 18,
            }}>
              Our Work
            </span>
            <h2 style={{
              fontFamily: 'Poppins, sans-serif',
              fontWeight: 800,
              fontSize: 'clamp(28px, 4vw, 48px)',
              color: 'white',
              letterSpacing: '-1px',
              lineHeight: 1.1,
            }}>
              Jobs Done <span style={{ color: '#EA580C' }}>Right</span>
            </h2>
          </div>
          <p style={{
            fontFamily: 'Open Sans, sans-serif',
            fontSize: 16,
            color: 'rgba(255,255,255,0.5)',
            lineHeight: 1.75,
            maxWidth: 420,
            marginLeft: 'auto',
          }}>
            From emergency repairs to full repiping, every project leaves your home cleaner than we found it.
          </p>
        </motion.div>

        {/* Masonry-style grid */}
        <div
          ref={ref}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gridAutoRows: '240px',
            gap: 16,
          }}
        >
          {photos.map((photo, i) => (
            <PhotoCard key={photo.label} photo={photo} index={i} />
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          style={{ textAlign: 'center', marginTop: 48 }}
        >
          <motion.a
            href="#contact"
            whileHover={{ scale: 1.04, boxShadow: '0 12px 40px rgba(30,64,175,0.5)' }}
            whileTap={{ scale: 0.97 }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              background: 'linear-gradient(135deg, #1E40AF, #2563EB)',
              color: 'white',
              fontFamily: 'Poppins, sans-serif',
              fontWeight: 700,
              fontSize: 15,
              padding: '15px 36px',
              borderRadius: 10,
              textDecoration: 'none',
              cursor: 'pointer',
              boxShadow: '0 8px 32px rgba(30,64,175,0.35)',
              transition: 'box-shadow 0.3s ease',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Book Your Free Estimate
          </motion.a>
        </motion.div>

      </div>
    </section>
  )
}
