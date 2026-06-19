import CarNav from './components/car/CarNav'
import CarHero from './components/car/CarHero'
import CarReel from './components/car/CarReel'
import CarCinemaScroll from './components/car/CarCinemaScroll'
import CarStats from './components/car/CarStats'
import CarGallery from './components/car/CarGallery'
import CarContact from './components/car/CarContact'
import { motion } from 'framer-motion'

// Ticker
function Ticker() {
  const items = ['Paint Correction', 'Ceramic Coating', 'PPF', 'Interior Detail', 'Engine Bay', 'Wheel Refurb', 'Headlight Restore', 'Odour Treatment']
  const row = [...items, ...items, ...items]
  return (
    <div style={{ overflow: 'hidden', background: '#0a0a0a', borderTop: '1px solid rgba(201,168,76,0.08)', borderBottom: '1px solid rgba(201,168,76,0.08)', padding: '1rem 0' }}>
      <motion.div
        animate={{ x: ['0%', '-33.33%'] }}
        transition={{ repeat: Infinity, duration: 32, ease: 'linear' }}
        style={{ display: 'flex', whiteSpace: 'nowrap', gap: '5rem' }}
      >
        {row.map((item, i) => (
          <span key={i} style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '10px', fontWeight: 700, letterSpacing: '0.32em',
            textTransform: 'uppercase',
            color: i % 2 === 0 ? 'rgba(255,255,255,0.3)' : 'rgba(201,168,76,0.5)'
          }}>
            {item}
            <span style={{ color: 'rgba(201,168,76,0.25)', marginLeft: '5rem' }}>◆</span>
          </span>
        ))}
      </motion.div>
    </div>
  )
}

// Footer
function Footer() {
  return (
    <footer style={{
      background: '#030303',
      borderTop: '1px solid rgba(255,255,255,0.04)',
      padding: '3.5rem 2.5rem'
    }}>
      <div style={{ maxWidth: 1320, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '15px', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>
          VELVET<span style={{ color: 'rgba(201,168,76,0.85)' }}>.</span>
        </div>
        <div style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap' }}>
          {['Privacy', 'Terms', 'Instagram', 'Google Reviews'].map(t => (
            <a key={t} href="#" style={{ fontFamily: "'Inter', sans-serif", fontSize: '10px', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.15em', textTransform: 'uppercase', textDecoration: 'none' }}>{t}</a>
          ))}
        </div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '10px', color: 'rgba(255,255,255,0.15)', letterSpacing: '0.1em' }}>
          © 2024 Velvet Detail Studio
        </div>
      </div>
    </footer>
  )
}

export default function AppCar() {
  return (
    <div style={{ background: '#070707', color: '#fff', overflowX: 'hidden' }}>
      <CarNav />
      <CarHero />
      <Ticker />
      <CarReel />
      <CarCinemaScroll />
      <CarStats />
      <CarGallery />
      <CarContact />
      <Footer />
    </div>
  )
}
