import { useState, useRef } from 'react'
import { motion, AnimatePresence, useInView, LayoutGroup } from 'framer-motion'

// Dark purple pricing page — animated billing toggle, comparison table, FAQ accordion
const PURPLE = '#7c3aed'
const LIGHT_PURPLE = '#a78bfa'
const BG = '#06030f'

const PLANS = {
  monthly: [
    { name:'Starter', price:9,  period:'mo', color:'#1e1b4b', border:'#312e81', accent:'#818cf8',
      features:['5 projects','10GB storage','Basic analytics','Email support'], featured:false },
    { name:'Pro',     price:29, period:'mo', color:'#2e1065', border:'#7c3aed', accent:'#a78bfa',
      features:['Unlimited projects','100GB storage','Advanced analytics','Priority support','Custom domain','API access'], featured:true },
    { name:'Team',    price:79, period:'mo', color:'#1e1b4b', border:'#312e81', accent:'#818cf8',
      features:['Everything in Pro','Unlimited storage','Team collaboration','SSO','Dedicated manager','SLA'], featured:false },
  ],
  annual: [
    { name:'Starter', price:7,  period:'mo', color:'#1e1b4b', border:'#312e81', accent:'#818cf8',
      features:['5 projects','10GB storage','Basic analytics','Email support'], featured:false },
    { name:'Pro',     price:23, period:'mo', color:'#2e1065', border:'#7c3aed', accent:'#a78bfa',
      features:['Unlimited projects','100GB storage','Advanced analytics','Priority support','Custom domain','API access'], featured:true },
    { name:'Team',    price:63, period:'mo', color:'#1e1b4b', border:'#312e81', accent:'#818cf8',
      features:['Everything in Pro','Unlimited storage','Team collaboration','SSO','Dedicated manager','SLA'], featured:false },
  ],
}

const COMPARE_ROWS = [
  { feature:'Projects',       starter:'5',         pro:'Unlimited', team:'Unlimited' },
  { feature:'Storage',        starter:'10 GB',     pro:'100 GB',    team:'Unlimited' },
  { feature:'Analytics',      starter:'Basic',     pro:'Advanced',  team:'Advanced' },
  { feature:'API Access',     starter:'✕',         pro:'✓',         team:'✓' },
  { feature:'Custom Domain',  starter:'✕',         pro:'✓',         team:'✓' },
  { feature:'SSO',            starter:'✕',         pro:'✕',         team:'✓' },
  { feature:'Team Members',   starter:'1',         pro:'5',         team:'Unlimited' },
  { feature:'SLA',            starter:'✕',         pro:'✕',         team:'✓' },
  { feature:'Support',        starter:'Email',     pro:'Priority',  team:'Dedicated' },
]

const FAQS = [
  { q:'Can I switch plans later?',              a:'Yes, you can upgrade or downgrade your plan at any time. Changes take effect on your next billing cycle.' },
  { q:'Is there a free trial?',                 a:'All plans come with a 14-day free trial. No credit card required to get started.' },
  { q:'What payment methods do you accept?',    a:'We accept all major credit cards, PayPal, and wire transfers for annual enterprise plans.' },
  { q:'Can I cancel my subscription?',          a:'You can cancel anytime. Your access continues until the end of the billing period you paid for.' },
  { q:'Do you offer discounts for nonprofits?', a:'Yes — we offer 40% off for registered nonprofits and educational institutions. Contact us to apply.' },
]

// ─── ANIMATED PRICE NUMBER ────────────────────────────────────────────────────
function PriceNum({ value }) {
  return (
    <AnimatePresence mode="wait">
      <motion.span key={value}
        initial={{ y:-20, opacity:0 }}
        animate={{ y:0,   opacity:1 }}
        exit={{    y: 20, opacity:0 }}
        transition={{ type:'spring', stiffness:300, damping:25 }}>
        {value}
      </motion.span>
    </AnimatePresence>
  )
}

// ─── PLAN CARD ────────────────────────────────────────────────────────────────
function PlanCard({ plan, index }) {
  return (
    <motion.div
      initial={{ opacity:0, y:40 }}
      whileInView={{ opacity:1, y:0 }}
      viewport={{ once:true, margin:'-40px' }}
      transition={{ delay: index * 0.12, type:'spring', stiffness:100, damping:16 }}
      whileHover={{ y:-8, boxShadow: plan.featured
        ? `0 32px 80px ${PURPLE}55`
        : '0 24px 60px rgba(0,0,0,0.4)' }}
      style={{ background: plan.color, borderRadius:16, padding:'36px 32px',
        border:`1px solid ${plan.border}`,
        boxShadow: plan.featured ? `0 0 0 1px ${PURPLE}, 0 20px 60px ${PURPLE}33` : 'none',
        position:'relative', overflow:'hidden', cursor:'default' }}>

      {plan.featured && (
        <div style={{ position:'absolute', top:0, left:0, right:0, height:3,
          background:`linear-gradient(90deg, ${PURPLE}, ${LIGHT_PURPLE})` }} />
      )}
      {plan.featured && (
        <div style={{ position:'absolute', top:18, right:20, background:PURPLE,
          color:'#fff', fontFamily:'Inter,sans-serif', fontWeight:800, fontSize:9,
          letterSpacing:'0.22em', padding:'4px 14px', borderRadius:100 }}>
          MOST POPULAR
        </div>
      )}

      <div style={{ fontFamily:'Inter,sans-serif', fontWeight:700, fontSize:14,
        color: plan.accent, letterSpacing:'0.1em', marginBottom:20 }}>
        {plan.name.toUpperCase()}
      </div>

      <div style={{ display:'flex', alignItems:'baseline', gap:4, marginBottom:8 }}>
        <span style={{ fontFamily:'Inter,sans-serif', fontSize:18, color:'#888', fontWeight:500 }}>£</span>
        <span style={{ fontFamily:'Inter,sans-serif', fontWeight:900, fontSize:52,
          color:'#fff', lineHeight:1 }}>
          <PriceNum value={plan.price} />
        </span>
        <span style={{ fontFamily:'Inter,sans-serif', fontSize:14, color:'#555' }}>/{plan.period}</span>
      </div>
      <div style={{ fontFamily:'Inter,sans-serif', fontSize:12, color:'#555',
        marginBottom:32 }}>billed monthly</div>

      <div style={{ display:'flex', flexDirection:'column', gap:13, marginBottom:36 }}>
        {plan.features.map(f => (
          <div key={f} style={{ display:'flex', gap:10, alignItems:'center' }}>
            <div style={{ width:16, height:16, borderRadius:'50%',
              background:`${plan.accent}22`, border:`1px solid ${plan.accent}55`,
              display:'flex', alignItems:'center', justifyContent:'center',
              flexShrink:0, fontSize:9, color:plan.accent }}>✓</div>
            <span style={{ fontFamily:'Inter,sans-serif', fontSize:14, color:'#bbb' }}>{f}</span>
          </div>
        ))}
      </div>

      <motion.button
        whileHover={{ background: plan.featured ? LIGHT_PURPLE : plan.accent,
          scale:1.02 }}
        whileTap={{ scale:0.97 }}
        style={{ width:'100%', padding:'14px 0', borderRadius:10,
          background: plan.featured ? PURPLE : 'transparent',
          border: plan.featured ? 'none' : `1px solid ${plan.accent}55`,
          color: plan.featured ? '#fff' : plan.accent,
          fontFamily:'Inter,sans-serif', fontWeight:700, fontSize:13,
          letterSpacing:'0.08em', cursor:'pointer',
          transition:'background 0.2s' }}>
        {plan.featured ? 'Get started' : 'Choose plan'}
      </motion.button>
    </motion.div>
  )
}

// ─── COMPARE TABLE ────────────────────────────────────────────────────────────
function CompareTable() {
  const ref = useRef()
  const inView = useInView(ref, { once:true, margin:'-80px' })
  return (
    <section style={{ padding:'120px 60px', background:'#04020a' }}>
      <div style={{ maxWidth:900, margin:'0 auto' }}>
        <motion.div style={{ textAlign:'center', marginBottom:60 }}
          initial={{ opacity:0, y:30 }}
          whileInView={{ opacity:1, y:0 }}
          viewport={{ once:true }}
          transition={{ duration:0.7 }}>
          <h2 style={{ fontFamily:'Inter,sans-serif', fontWeight:900, fontSize:'clamp(1.8rem,4vw,3rem)',
            color:'#fff', margin:'0 0 12px' }}>Compare plans</h2>
          <p style={{ fontFamily:'Inter,sans-serif', fontSize:16, color:'#555', margin:0 }}>
            Everything you need to pick the right plan.
          </p>
        </motion.div>

        <div ref={ref} style={{ borderRadius:16, overflow:'hidden', border:'1px solid #1a1030' }}>
          {/* header */}
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr',
            background:'#0d0820', padding:'20px 28px', borderBottom:'1px solid #1a1030' }}>
            <div />
            {['Starter','Pro','Team'].map(n => (
              <div key={n} style={{ fontFamily:'Inter,sans-serif', fontWeight:700, fontSize:13,
                color: n === 'Pro' ? LIGHT_PURPLE : '#777', textAlign:'center',
                letterSpacing:'0.08em' }}>{n}</div>
            ))}
          </div>
          {COMPARE_ROWS.map((row, i) => (
            <motion.div key={row.feature}
              initial={{ opacity:0, x:-20 }}
              animate={inView ? { opacity:1, x:0 } : {}}
              transition={{ delay: i * 0.06, duration:0.5 }}
              style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr',
                padding:'17px 28px', borderBottom:'1px solid #0f0820',
                background: i % 2 === 0 ? 'transparent' : '#060318',
                alignItems:'center' }}>
              <div style={{ fontFamily:'Inter,sans-serif', fontSize:14, color:'#888' }}>
                {row.feature}
              </div>
              {[row.starter, row.pro, row.team].map((val, j) => (
                <div key={j} style={{ textAlign:'center', fontFamily:'Inter,sans-serif',
                  fontSize:13, fontWeight:600,
                  color: val === '✓' ? '#4ade80' : val === '✕' ? '#374151' :
                         j === 1 ? LIGHT_PURPLE : '#ccc' }}>
                  {val}
                </div>
              ))}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── FAQ ─────────────────────────────────────────────────────────────────────
function FAQ() {
  const [open, setOpen] = useState(null)
  return (
    <section style={{ padding:'0 60px 120px', background:'#04020a' }}>
      <div style={{ maxWidth:700, margin:'0 auto' }}>
        <motion.h2
          initial={{ opacity:0, y:24 }} whileInView={{ opacity:1, y:0 }}
          viewport={{ once:true }} transition={{ duration:0.7 }}
          style={{ fontFamily:'Inter,sans-serif', fontWeight:900,
            fontSize:'clamp(1.8rem,4vw,2.8rem)', color:'#fff',
            textAlign:'center', margin:'0 0 56px' }}>
          Common questions
        </motion.h2>
        <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
          {FAQS.map((faq, i) => (
            <motion.div key={i}
              initial={{ opacity:0, y:16 }}
              whileInView={{ opacity:1, y:0 }}
              viewport={{ once:true }}
              transition={{ delay: i * 0.08 }}
              style={{ borderRadius:12, overflow:'hidden',
                border:'1px solid #1a1030',
                background: open === i ? '#0d0820' : 'transparent' }}>
              <button onClick={() => setOpen(open === i ? null : i)}
                style={{ width:'100%', padding:'20px 24px', background:'transparent',
                  border:'none', cursor:'pointer', display:'flex',
                  justifyContent:'space-between', alignItems:'center', gap:16 }}>
                <span style={{ fontFamily:'Inter,sans-serif', fontSize:15, fontWeight:600,
                  color:'#ddd', textAlign:'left' }}>{faq.q}</span>
                <motion.span
                  animate={{ rotate: open === i ? 45 : 0 }}
                  transition={{ type:'spring', stiffness:300, damping:20 }}
                  style={{ color:LIGHT_PURPLE, fontSize:20, flexShrink:0, lineHeight:1 }}>+</motion.span>
              </button>
              <AnimatePresence>
                {open === i && (
                  <motion.div
                    initial={{ height:0, opacity:0 }}
                    animate={{ height:'auto', opacity:1 }}
                    exit={{ height:0, opacity:0 }}
                    transition={{ duration:0.3, ease:[0.16,1,0.3,1] }}
                    style={{ overflow:'hidden' }}>
                    <div style={{ padding:'0 24px 20px', fontFamily:'Inter,sans-serif',
                      fontSize:14, color:'#888', lineHeight:1.75 }}>
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function AppPricing() {
  const [billing, setBilling] = useState('monthly')
  const plans = PLANS[billing]

  return (
    <div style={{ background:BG, color:'#fff', minHeight:'100vh',
      fontFamily:'Inter,sans-serif', overflowX:'hidden' }}>

      {/* Nav */}
      <motion.nav
        initial={{ y:-50, opacity:0 }} animate={{ y:0, opacity:1 }}
        transition={{ duration:0.7 }}
        style={{ position:'fixed', top:0, left:0, right:0, zIndex:100,
          padding:'18px 48px', display:'flex', justifyContent:'space-between',
          alignItems:'center', background:'rgba(6,3,15,0.9)',
          backdropFilter:'blur(16px)', borderBottom:'1px solid #1a1030' }}>
        <div style={{ fontFamily:'Inter,sans-serif', fontWeight:800, fontSize:18, color:'#fff' }}>
          acme<span style={{ color:PURPLE }}>.</span>
        </div>
        <div style={{ display:'flex', gap:32 }}>
          {['Product','Docs','Pricing','Blog'].map(l => (
            <span key={l} style={{ fontSize:13, color:'#666', letterSpacing:'0.05em',
              fontWeight:500, cursor:'pointer' }}>{l}</span>
          ))}
        </div>
        <motion.button whileHover={{ scale:1.04 }} whileTap={{ scale:0.96 }}
          style={{ background:PURPLE, color:'#fff', border:'none', padding:'10px 24px',
            borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer' }}>
          Start free trial
        </motion.button>
      </motion.nav>

      {/* Hero + Plans */}
      <section style={{ paddingTop:140, paddingBottom:100,
        paddingLeft:60, paddingRight:60,
        background:`radial-gradient(ellipse 80% 60% at 50% -10%, ${PURPLE}22 0%, transparent 60%)` }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <motion.div style={{ textAlign:'center', marginBottom:64 }}
            initial={{ opacity:0, y:40 }} animate={{ opacity:1, y:0 }}
            transition={{ duration:0.85, ease:[0.16,1,0.3,1] }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:8,
              background:'#1a0f2e', border:'1px solid #3b1f6e', borderRadius:100,
              padding:'6px 16px', marginBottom:24 }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'#4ade80' }} />
              <span style={{ fontSize:12, color:LIGHT_PURPLE, fontWeight:600,
                letterSpacing:'0.1em' }}>SIMPLE PRICING</span>
            </div>
            <h1 style={{ fontWeight:900, fontSize:'clamp(2.5rem,7vw,5.5rem)',
              color:'#fff', lineHeight:0.9, margin:'0 0 24px', letterSpacing:'-0.03em' }}>
              Pay for what<br/>
              <span style={{ color:LIGHT_PURPLE }}>you actually use.</span>
            </h1>
            <p style={{ fontSize:18, color:'#888', maxWidth:480,
              margin:'0 auto 40px', lineHeight:1.7 }}>
              No hidden fees. No surprises. Cancel anytime.
            </p>

            {/* Billing toggle */}
            <LayoutGroup>
              <div style={{ display:'inline-flex', background:'#0d0820',
                border:'1px solid #1a1030', borderRadius:100, padding:4, gap:0 }}>
                {['monthly','annual'].map(b => (
                  <button key={b} onClick={() => setBilling(b)}
                    style={{ position:'relative', padding:'9px 26px', borderRadius:100,
                      border:'none', background:'transparent', cursor:'pointer',
                      fontSize:13, fontWeight:700, letterSpacing:'0.05em',
                      color: billing === b ? '#fff' : '#555',
                      transition:'color 0.2s', zIndex:1 }}>
                    {billing === b && (
                      <motion.div layoutId="billingPill"
                        style={{ position:'absolute', inset:0, background:PURPLE,
                          borderRadius:100, zIndex:-1 }}
                        transition={{ type:'spring', stiffness:300, damping:26 }} />
                    )}
                    {b.charAt(0).toUpperCase() + b.slice(1)}
                    {b === 'annual' && (
                      <span style={{ marginLeft:8, fontSize:10, color:'#4ade80',
                        fontWeight:800 }}>-20%</span>
                    )}
                  </button>
                ))}
              </div>
            </LayoutGroup>
          </motion.div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:24 }}>
            {plans.map((plan, i) => <PlanCard key={plan.name} plan={plan} index={i} />)}
          </div>
        </div>
      </section>

      <CompareTable />
      <FAQ />

      {/* CTA */}
      <section style={{ padding:'100px 60px', textAlign:'center',
        background:`linear-gradient(180deg, #04020a 0%, #0d0820 50%, #04020a 100%)` }}>
        <motion.div
          initial={{ opacity:0, y:30 }}
          whileInView={{ opacity:1, y:0 }}
          viewport={{ once:true }}
          transition={{ duration:0.8 }}>
          <h2 style={{ fontWeight:900, fontSize:'clamp(2rem,5vw,4rem)',
            color:'#fff', margin:'0 0 16px', lineHeight:0.9 }}>
            Start building today.
          </h2>
          <p style={{ fontSize:16, color:'#666', marginBottom:40 }}>
            14-day free trial. No credit card required.
          </p>
          <div style={{ display:'flex', gap:16, justifyContent:'center' }}>
            <motion.button whileHover={{ scale:1.04, background:LIGHT_PURPLE }}
              whileTap={{ scale:0.96 }}
              style={{ background:PURPLE, color:'#fff', border:'none',
                padding:'16px 44px', borderRadius:10, fontSize:15,
                fontWeight:700, cursor:'pointer', transition:'background 0.2s' }}>
              Get started free
            </motion.button>
            <motion.button whileHover={{ scale:1.04, borderColor:LIGHT_PURPLE,
              color:LIGHT_PURPLE }}
              style={{ background:'transparent', color:'#888',
                border:'1px solid #2a2a40', padding:'16px 44px', borderRadius:10,
                fontSize:15, fontWeight:600, cursor:'pointer', transition:'all 0.2s' }}>
              Talk to sales
            </motion.button>
          </div>
        </motion.div>
      </section>

      <footer style={{ padding:'40px 60px', borderTop:'1px solid #1a1030',
        display:'flex', justifyContent:'space-between', alignItems:'center',
        flexWrap:'wrap', gap:16 }}>
        <div style={{ fontSize:16, fontWeight:800, color:'#fff' }}>
          acme<span style={{ color:PURPLE }}>.</span>
        </div>
        <div style={{ fontSize:12, color:'#444', letterSpacing:'0.1em' }}>
          © 2024 Acme Inc.
        </div>
        <div style={{ display:'flex', gap:28 }}>
          {['Privacy','Terms','Status'].map(l => (
            <span key={l} style={{ fontSize:12, color:'#555', cursor:'pointer' }}>{l}</span>
          ))}
        </div>
      </footer>
    </div>
  )
}
