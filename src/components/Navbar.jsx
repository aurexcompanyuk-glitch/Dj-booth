import { useState, useEffect } from 'react'
import { motion, useScroll, AnimatePresence } from 'framer-motion'

const navLinks = [
  { label: 'Services', href: '#services' },
  { label: 'Why Us', href: '#why-us' },
  { label: 'Process', href: '#process' },
  { label: 'Reviews', href: '#reviews' },
  { label: 'Contact', href: '#contact' },
]

export default function Navbar() {
  const { scrollY } = useScroll()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const unsub = scrollY.on('change', (v) => setScrolled(v > 40))
    return unsub
  }, [scrollY])

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: scrolled
          ? 'rgba(6,9,15,0.92)'
          : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.07)' : 'none',
        transition: 'background 0.4s ease, backdrop-filter 0.4s ease, border-bottom 0.4s ease',
      }}
    >
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 72 }}>
        {/* Logo */}
        <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <circle cx="16" cy="16" r="16" fill="#1E40AF" />
            <path d="M16 6C16 6 10 12 10 18a6 6 0 0 0 12 0c0-6-6-12-6-12z" fill="#60A5FA" />
            <path d="M16 14c0 0-3 3-3 6a3 3 0 0 0 6 0c0-3-3-6-3-6z" fill="white" />
          </svg>
          <span style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, fontSize: 20, color: 'white', letterSpacing: '-0.5px' }}>
            FlowMaster <span style={{ color: '#EA580C' }}>Pro</span>
          </span>
        </a>

        {/* Desktop Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 36 }} className="desktop-nav">
          {navLinks.map((l) => (
            <a
              key={l.label}
              href={l.href}
              style={{
                fontFamily: 'Open Sans, sans-serif',
                fontSize: 14,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.75)',
                textDecoration: 'none',
                transition: 'color 0.2s',
                letterSpacing: '0.02em',
              }}
              onMouseEnter={e => e.target.style.color = '#fff'}
              onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.75)'}
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* CTA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <motion.a
            href="tel:8005551234"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              backgroundColor: '#EA580C',
              color: 'white',
              fontFamily: 'Poppins, sans-serif',
              fontWeight: 700,
              fontSize: 14,
              padding: '10px 20px',
              borderRadius: 8,
              textDecoration: 'none',
              cursor: 'pointer',
              letterSpacing: '0.01em',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8 19.79 19.79 0 01.22 2.22 2 2 0 012.18 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.18 6.18l1.27-.55a2 2 0 012.11.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
            </svg>
            (800) 555-1234
          </motion.a>

          {/* Hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
            style={{
              display: 'none',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'white',
              padding: 8,
            }}
            className="hamburger-btn"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              {menuOpen
                ? <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
                : <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>
              }
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              background: 'rgba(6,9,15,0.97)',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '16px 24px 24px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {navLinks.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  style={{
                    fontFamily: 'Open Sans, sans-serif',
                    fontSize: 16,
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.8)',
                    textDecoration: 'none',
                    padding: '12px 0',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  {l.label}
                </a>
              ))}
              <a
                href="tel:8005551234"
                style={{
                  marginTop: 12,
                  backgroundColor: '#EA580C',
                  color: 'white',
                  fontFamily: 'Poppins, sans-serif',
                  fontWeight: 700,
                  fontSize: 16,
                  padding: '14px 20px',
                  borderRadius: 8,
                  textDecoration: 'none',
                  textAlign: 'center',
                }}
              >
                Call (800) 555-1234
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .hamburger-btn { display: block !important; }
        }
      `}</style>
    </motion.nav>
  )
}
