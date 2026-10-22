import { motion, useScroll, useTransform } from 'framer-motion'

export default function CarNav() {
  const { scrollY } = useScroll()
  const bg = useTransform(scrollY, [0, 100], ['rgba(7,7,7,0)', 'rgba(7,7,7,0.95)'])
  const borderOpacity = useTransform(scrollY, [0, 100], [0, 0.1])

  return (
    <motion.nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      padding: '1.6rem 2.5rem',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      background: bg,
      borderBottom: '1px solid rgba(201,168,76,0.1)',
      backdropFilter: 'blur(12px)'
    }}>
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1, delay: 2.8 }}
        style={{ fontFamily: "'Inter', sans-serif", fontSize: '15px', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}
      >
        VELVET<span style={{ color: 'rgba(201,168,76,0.85)' }}>.</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 3 }}
        style={{ display: 'flex', alignItems: 'center', gap: '2.5rem' }}
      >
        {['Services', 'Process', 'Portfolio'].map(item => (
          <a key={item} href={`#${item.toLowerCase()}`} style={{
            fontFamily: "'Inter', sans-serif", fontSize: '10px', fontWeight: 700,
            letterSpacing: '0.2em', textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.4)', textDecoration: 'none',
            transition: 'color 0.2s'
          }}
            onMouseEnter={e => e.target.style.color = '#fff'}
            onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.4)'}
          >{item}</a>
        ))}
        <a href="#contact" style={{
          fontFamily: "'Inter', sans-serif", fontSize: '10px', fontWeight: 700,
          letterSpacing: '0.2em', textTransform: 'uppercase',
          color: 'rgba(201,168,76,0.9)', textDecoration: 'none',
          border: '1px solid rgba(201,168,76,0.35)', padding: '0.6rem 1.4rem',
          transition: 'all 0.3s'
        }}
          onMouseEnter={e => { e.target.style.background = 'rgba(201,168,76,0.12)'; e.target.style.borderColor = 'rgba(201,168,76,0.7)' }}
          onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.borderColor = 'rgba(201,168,76,0.35)' }}
        >Book Now</a>
      </motion.div>
    </motion.nav>
  )
}
