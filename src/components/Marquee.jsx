const items = [
  'Licensed & Insured',
  '24/7 Emergency Service',
  'Upfront Pricing',
  '2-Year Guarantee',
  '4.9★ Google Rating',
  'BBB A+ Accredited',
  'Same-Day Service',
  'Free Quotes',
  'Master Plumbers',
  'Chicago\'s #1 Choice',
]

const Separator = () => (
  <span style={{ color: 'rgba(255,255,255,0.4)', margin: '0 20px', fontSize: 18 }}>·</span>
)

const Item = ({ text }) => (
  <span style={{
    fontFamily: 'Poppins, sans-serif',
    fontWeight: 700,
    fontSize: 13,
    color: 'white',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
  }}>
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle', opacity: 0.8 }} aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
    {text}
  </span>
)

export default function Marquee() {
  return (
    <div style={{ backgroundColor: '#EA580C', overflow: 'hidden', padding: '14px 0' }} aria-label="Trust signals">
      <div className="marquee-track" style={{ display: 'flex', alignItems: 'center', width: 'max-content' }}>
        {[...items, ...items].map((item, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center' }}>
            <Item text={item} />
            <Separator />
          </span>
        ))}
      </div>
    </div>
  )
}
