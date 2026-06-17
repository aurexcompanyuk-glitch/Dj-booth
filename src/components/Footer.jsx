const services = [
  'Emergency Repairs',
  'Drain Cleaning',
  'General Repairs',
  'Installations',
  'Water Quality',
  'Re-Piping',
]

const company = [
  'About Us',
  'Our Team',
  'Careers',
  'Blog',
  'Press',
  'Contact',
]

const contact = [
  { label: '(800) 555-1234', href: 'tel:8005551234' },
  { label: 'hello@flowmasterpro.com', href: 'mailto:hello@flowmasterpro.com' },
  { label: 'Chicago Metro Area, IL', href: null },
  { label: 'Open 24/7 · 365 Days', href: null },
]

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer style={{ backgroundColor: '#03050A', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '72px 24px 32px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 48,
          marginBottom: 60,
        }}>

          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                <circle cx="16" cy="16" r="16" fill="#1E40AF" />
                <path d="M16 6C16 6 10 12 10 18a6 6 0 0 0 12 0c0-6-6-12-6-12z" fill="#60A5FA" />
                <path d="M16 14c0 0-3 3-3 6a3 3 0 0 0 6 0c0-3-3-6-3-6z" fill="white" />
              </svg>
              <span style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, fontSize: 18, color: 'white' }}>
                FlowMaster <span style={{ color: '#EA580C' }}>Pro</span>
              </span>
            </div>
            <p style={{
              fontFamily: 'Open Sans, sans-serif',
              fontSize: 14,
              color: 'rgba(255,255,255,0.45)',
              lineHeight: 1.75,
              maxWidth: 260,
              marginBottom: 24,
            }}>
              Chicago's most trusted plumbing service since 1999. Licensed, insured, and available 24/7 for all your plumbing needs.
            </p>
            {/* Social */}
            <div style={{ display: 'flex', gap: 12 }}>
              {[
                { label: 'Facebook', path: 'M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z' },
                { label: 'Instagram', path: 'M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37zm1.5-4.87h.01M6.5 19.5h11a3 3 0 003-3v-11a3 3 0 00-3-3h-11a3 3 0 00-3 3v11a3 3 0 003 3z' },
                { label: 'X/Twitter', path: 'M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z' },
              ].map((s) => (
                <a
                  key={s.label}
                  href="#"
                  aria-label={s.label}
                  style={{
                    width: 36, height: 36,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'rgba(255,255,255,0.5)',
                    textDecoration: 'none',
                    transition: 'background 0.2s ease, color 0.2s ease',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(30,64,175,0.3)'; e.currentTarget.style.color = '#60A5FA' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={s.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 14, color: 'white', marginBottom: 20, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Services</h4>
            <ul style={{ listStyle: 'none' }}>
              {services.map((s) => (
                <li key={s} style={{ marginBottom: 10 }}>
                  <a href="#services" style={{
                    fontFamily: 'Open Sans, sans-serif',
                    fontSize: 14,
                    color: 'rgba(255,255,255,0.45)',
                    textDecoration: 'none',
                    transition: 'color 0.2s ease',
                    cursor: 'pointer',
                  }}
                    onMouseEnter={e => e.target.style.color = 'white'}
                    onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.45)'}
                  >
                    {s}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 14, color: 'white', marginBottom: 20, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Company</h4>
            <ul style={{ listStyle: 'none' }}>
              {company.map((c) => (
                <li key={c} style={{ marginBottom: 10 }}>
                  <a href="#" style={{
                    fontFamily: 'Open Sans, sans-serif',
                    fontSize: 14,
                    color: 'rgba(255,255,255,0.45)',
                    textDecoration: 'none',
                    transition: 'color 0.2s ease',
                    cursor: 'pointer',
                  }}
                    onMouseEnter={e => e.target.style.color = 'white'}
                    onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.45)'}
                  >
                    {c}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 14, color: 'white', marginBottom: 20, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Contact</h4>
            <ul style={{ listStyle: 'none' }}>
              {contact.map((c) => (
                <li key={c.label} style={{ marginBottom: 12 }}>
                  {c.href
                    ? <a href={c.href} style={{ fontFamily: 'Open Sans, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.45)', textDecoration: 'none', transition: 'color 0.2s ease', cursor: 'pointer' }}
                        onMouseEnter={e => e.target.style.color = 'white'}
                        onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.45)'}
                      >{c.label}</a>
                    : <span style={{ fontFamily: 'Open Sans, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.45)' }}>{c.label}</span>
                  }
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* Bottom bar */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          paddingTop: 24,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <p style={{ fontFamily: 'Open Sans, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>
            &copy; {year} FlowMaster Pro. All rights reserved. Licensed & Insured — Illinois License #PL-2024-7834.
          </p>
          <div style={{ display: 'flex', gap: 24 }}>
            {['Privacy Policy', 'Terms of Service', 'Sitemap'].map((l) => (
              <a key={l} href="#" style={{ fontFamily: 'Open Sans, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.3)', textDecoration: 'none', transition: 'color 0.2s ease', cursor: 'pointer' }}
                onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.6)'}
                onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.3)'}
              >
                {l}
              </a>
            ))}
          </div>
        </div>

      </div>
    </footer>
  )
}
