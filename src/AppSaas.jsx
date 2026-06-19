import React, { useEffect, useRef } from 'react'
import { motion, useInView, useAnimation, AnimatePresence } from 'framer-motion'

const STYLE_TAG = `
@keyframes meshMove1 {
  0%   { transform: translate(0%, 0%) scale(1); }
  33%  { transform: translate(5%, -8%) scale(1.1); }
  66%  { transform: translate(-4%, 6%) scale(0.95); }
  100% { transform: translate(0%, 0%) scale(1); }
}
@keyframes meshMove2 {
  0%   { transform: translate(0%, 0%) scale(1); }
  33%  { transform: translate(-6%, 4%) scale(1.08); }
  66%  { transform: translate(8%, -5%) scale(0.97); }
  100% { transform: translate(0%, 0%) scale(1); }
}
@keyframes meshMove3 {
  0%   { transform: translate(0%, 0%) scale(1); }
  50%  { transform: translate(4%, 7%) scale(1.05); }
  100% { transform: translate(0%, 0%) scale(1); }
}
@keyframes floatNav {
  0%,100% { transform: translateY(0px); }
  50%      { transform: translateY(-2px); }
}
* { box-sizing: border-box; }
body { font-family: 'Inter', sans-serif; }
`

function injectStyles() {
  if (typeof document !== 'undefined' && !document.getElementById('saas-styles')) {
    const s = document.createElement('style')
    s.id = 'saas-styles'
    s.textContent = STYLE_TAG
    document.head.appendChild(s)
  }
}

const features = [
  {
    icon: '⚡',
    title: 'Lightning Fast',
    desc: 'Sub-50ms response times globally with our edge-first architecture and intelligent caching layer.',
    color: '#f59e0b',
  },
  {
    icon: '🛡️',
    title: 'Enterprise Security',
    desc: 'SOC2 Type II certified with end-to-end encryption, SSO, and granular role-based access control.',
    color: '#6366f1',
  },
  {
    icon: '📊',
    title: 'Real-time Analytics',
    desc: 'Live dashboards with custom metrics, cohort analysis, and AI-powered anomaly detection.',
    color: '#10b981',
  },
  {
    icon: '🔗',
    title: '200+ Integrations',
    desc: 'Connect your stack instantly — Slack, Salesforce, HubSpot, and 200 more with one click.',
    color: '#ec4899',
  },
  {
    icon: '🤖',
    title: 'AI Automation',
    desc: 'Let our AI handle repetitive workflows so your team focuses on what actually matters.',
    color: '#8b5cf6',
  },
  {
    icon: '🌍',
    title: 'Global Scale',
    desc: '99.99% uptime SLA backed by 28 data centers across 6 continents. Always on.',
    color: '#14b8a6',
  },
]

const plans = [
  {
    name: 'Starter',
    price: '$29',
    desc: 'Perfect for small teams getting started.',
    features: ['Up to 5 users', '10GB storage', 'Basic analytics', 'Email support', 'API access'],
    cta: 'Get Started',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$79',
    desc: 'For growing teams that need more power.',
    features: ['Up to 50 users', '100GB storage', 'Advanced analytics', 'Priority support', 'Webhooks & API', 'Custom domains', 'SSO'],
    cta: 'Start Free Trial',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: '$199',
    desc: 'For organizations at scale.',
    features: ['Unlimited users', '1TB storage', 'AI analytics', 'Dedicated support', 'Full API access', 'Custom SLA', 'On-premise option'],
    cta: 'Contact Sales',
    highlight: false,
  },
]

const testimonials = [
  { name: 'Sarah Chen', role: 'CTO, Nexus Labs', quote: 'Cut our infrastructure costs by 40% in the first month. The migration was effortless.', avatar: '#6366f1' },
  { name: 'Marcus Rivera', role: 'VP Engineering, Bloom', quote: 'The analytics alone are worth the price. We can see exactly what\'s happening in real time.', avatar: '#ec4899' },
  { name: 'Priya Patel', role: 'Founder, Stackr', quote: 'Scaled from 100 to 10,000 users without touching our infra. That\'s incredible.', avatar: '#10b981' },
  { name: 'James Okonkwo', role: 'Head of Ops, Vanta', quote: 'Security compliance used to take weeks. Now it\'s automated and always up to date.', avatar: '#f59e0b' },
  { name: 'Elena Vasquez', role: 'Product Lead, Drift AI', quote: 'The AI workflow automation saved us 20 hours per week. Game changer.', avatar: '#8b5cf6' },
  { name: 'Tom Bergmann', role: 'CEO, Clearfield', quote: 'Best SaaS investment we\'ve made. The ROI was visible in the first sprint.', avatar: '#14b8a6' },
]

function FeatureCard({ feature, index }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        padding: '32px',
        backdropFilter: 'blur(10px)',
        cursor: 'default',
      }}
    >
      <div style={{ fontSize: 36, marginBottom: 16 }}>{feature.icon}</div>
      <h3 style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 700, color: '#fff' }}>{feature.title}</h3>
      <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: 'rgba(255,255,255,0.55)' }}>{feature.desc}</p>
      <div style={{ marginTop: 20, height: 2, width: 40, background: feature.color, borderRadius: 2 }} />
    </motion.div>
  )
}

function PricingCard({ plan, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay: index * 0.15 }}
      whileHover={{
        y: -8,
        boxShadow: plan.highlight
          ? '0 30px 80px rgba(99,102,241,0.4)'
          : '0 20px 60px rgba(0,0,0,0.5)',
        transition: { duration: 0.25 },
      }}
      style={{
        background: plan.highlight
          ? 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.15))'
          : 'rgba(255,255,255,0.03)',
        border: plan.highlight ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20,
        padding: '40px 32px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {plan.highlight && (
        <div style={{
          position: 'absolute',
          top: 20,
          right: 20,
          background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
          color: '#fff',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.08em',
          padding: '4px 12px',
          borderRadius: 999,
          textTransform: 'uppercase',
        }}>Most Popular</div>
      )}
      <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{plan.name}</div>
      <div style={{ fontSize: 52, fontWeight: 800, color: '#fff', lineHeight: 1, marginBottom: 8 }}>{plan.price}<span style={{ fontSize: 18, fontWeight: 400, color: 'rgba(255,255,255,0.4)' }}>/mo</span></div>
      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', margin: '0 0 28px' }}>{plan.desc}</p>
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px' }}>
        {plan.features.map(f => (
          <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'rgba(255,255,255,0.75)', marginBottom: 12 }}>
            <span style={{ color: '#6366f1', fontSize: 16 }}>✓</span> {f}
          </li>
        ))}
      </ul>
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: 10,
          border: 'none',
          cursor: 'pointer',
          fontSize: 15,
          fontWeight: 700,
          fontFamily: 'Inter, sans-serif',
          background: plan.highlight ? 'linear-gradient(90deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.07)',
          color: '#fff',
          letterSpacing: '0.02em',
        }}
      >
        {plan.cta}
      </motion.button>
    </motion.div>
  )
}

function TestimonialCard({ t, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 16,
        padding: '28px',
      }}
    >
      <p style={{ fontSize: 15, lineHeight: 1.75, color: 'rgba(255,255,255,0.7)', margin: '0 0 24px', fontStyle: 'italic' }}>"{t.quote}"</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: t.avatar, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#fff' }}>
          {t.name[0]}
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{t.name}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{t.role}</div>
        </div>
      </div>
    </motion.div>
  )
}

export default function AppSaas() {
  useEffect(() => {
    injectStyles()
  }, [])

  const words = ['Ship', 'faster.', 'Scale', 'smarter.', 'Win', 'bigger.']

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#fff', overflowX: 'hidden' }}>
      {/* Gradient mesh background */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <motion.div
          animate={{ x: [0, 60, -40, 0], y: [0, -80, 50, 0], scale: [1, 1.1, 0.95, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            top: '-20%',
            left: '-10%',
            width: '60%',
            height: '60%',
            background: 'radial-gradient(ellipse, rgba(99,102,241,0.25) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />
        <motion.div
          animate={{ x: [0, -50, 70, 0], y: [0, 60, -40, 0], scale: [1, 0.9, 1.12, 1] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
          style={{
            position: 'absolute',
            top: '10%',
            right: '-15%',
            width: '55%',
            height: '55%',
            background: 'radial-gradient(ellipse, rgba(139,92,246,0.2) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />
        <motion.div
          animate={{ x: [0, 40, -60, 0], y: [0, -50, 80, 0] }}
          transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut', delay: 6 }}
          style={{
            position: 'absolute',
            bottom: '-20%',
            left: '20%',
            width: '50%',
            height: '50%',
            background: 'radial-gradient(ellipse, rgba(16,185,129,0.15) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />
      </div>

      {/* Nav */}
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
        style={{
          position: 'fixed',
          top: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100,
          width: 'calc(100% - 48px)',
          maxWidth: 1100,
          background: 'rgba(10,10,15,0.7)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16,
          padding: '14px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>
          <span style={{ color: '#6366f1' }}>Flux</span>
          <span style={{ color: '#fff' }}>OS</span>
        </div>
        <div style={{ display: 'flex', gap: 32, fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.6)' }}>
          {['Features', 'Pricing', 'Docs', 'Blog'].map(item => (
            <motion.span key={item} whileHover={{ color: '#fff' }} style={{ cursor: 'pointer', transition: 'color 0.2s' }}>{item}</motion.span>
          ))}
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{
            background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
            border: 'none',
            color: '#fff',
            padding: '10px 22px',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          Get Started →
        </motion.button>
      </motion.nav>

      {/* Hero */}
      <section style={{ position: 'relative', zIndex: 1, paddingTop: 180, paddingBottom: 120, textAlign: 'center', maxWidth: 900, margin: '0 auto', padding: '180px 24px 120px' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(99,102,241,0.15)',
            border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: 999,
            padding: '6px 16px',
            fontSize: 13,
            fontWeight: 600,
            color: '#a5b4fc',
            marginBottom: 40,
          }}
        >
          <span style={{ width: 6, height: 6, background: '#6366f1', borderRadius: '50%', display: 'inline-block' }} />
          Now in public beta — join 12,000+ teams
        </motion.div>

        <h1 style={{ fontSize: 'clamp(48px, 8vw, 92px)', fontWeight: 900, lineHeight: 1.05, margin: '0 0 28px', letterSpacing: '-0.04em' }}>
          {words.map((word, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 + i * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
              style={{
                display: 'inline-block',
                marginRight: '0.25em',
                color: i % 2 === 1 ? 'transparent' : '#fff',
                backgroundClip: i % 2 === 1 ? 'text' : undefined,
                WebkitBackgroundClip: i % 2 === 1 ? 'text' : undefined,
                backgroundImage: i % 2 === 1 ? 'linear-gradient(90deg, #6366f1, #ec4899)' : undefined,
              }}
            >
              {word}
            </motion.span>
          ))}
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1.1 }}
          style={{ fontSize: 20, lineHeight: 1.7, color: 'rgba(255,255,255,0.5)', maxWidth: 580, margin: '0 auto 48px' }}
        >
          The all-in-one platform that replaces five tools, automates your workflow, and scales to billions of events — without the DevOps headache.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1.3 }}
          style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}
        >
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: '0 20px 60px rgba(99,102,241,0.4)' }}
            whileTap={{ scale: 0.97 }}
            style={{
              background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
              border: 'none',
              color: '#fff',
              padding: '16px 36px',
              borderRadius: 12,
              fontSize: 16,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            Start free — no card needed
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05, background: 'rgba(255,255,255,0.1)' }}
            whileTap={{ scale: 0.97 }}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#fff',
              padding: '16px 36px',
              borderRadius: 12,
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
              transition: 'background 0.2s',
            }}
          >
            Watch demo ▶
          </motion.button>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6, duration: 0.8 }}
          style={{ display: 'flex', gap: 48, justifyContent: 'center', marginTop: 80, flexWrap: 'wrap' }}
        >
          {[['12K+', 'Teams using FluxOS'], ['99.99%', 'Uptime SLA'], ['40%', 'Avg cost reduction'], ['<50ms', 'Global latency']].map(([stat, label]) => (
            <div key={stat} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 800, background: 'linear-gradient(135deg, #fff, rgba(255,255,255,0.6))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{stat}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Features */}
      <section style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '80px 24px' }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          style={{ textAlign: 'center', marginBottom: 64 }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.15em', color: '#6366f1', textTransform: 'uppercase', marginBottom: 16 }}>Everything you need</div>
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 800, margin: 0, letterSpacing: '-0.03em' }}>Built for teams who move fast</h2>
        </motion.div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          {features.map((f, i) => <FeatureCard key={f.title} feature={f} index={i} />)}
        </div>
      </section>

      {/* Pricing */}
      <section style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '80px 24px' }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          style={{ textAlign: 'center', marginBottom: 64 }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.15em', color: '#6366f1', textTransform: 'uppercase', marginBottom: 16 }}>Simple pricing</div>
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 800, margin: 0, letterSpacing: '-0.03em' }}>No surprises. Ever.</h2>
        </motion.div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
          {plans.map((plan, i) => <PricingCard key={plan.name} plan={plan} index={i} />)}
        </div>
      </section>

      {/* Testimonials */}
      <section style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '80px 24px' }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          style={{ textAlign: 'center', marginBottom: 64 }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.15em', color: '#6366f1', textTransform: 'uppercase', marginBottom: 16 }}>Social proof</div>
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 800, margin: 0, letterSpacing: '-0.03em' }}>Loved by engineers</h2>
        </motion.div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          {testimonials.map((t, i) => <TestimonialCard key={t.name} t={t} index={i} />)}
        </div>
      </section>

      {/* CTA */}
      <section style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto 80px', padding: '0 24px' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(139,92,246,0.2), rgba(236,72,153,0.15))',
            border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: 24,
            padding: '80px 48px',
            textAlign: 'center',
          }}
        >
          <h2 style={{ fontSize: 'clamp(28px, 5vw, 52px)', fontWeight: 800, margin: '0 0 20px', letterSpacing: '-0.03em' }}>
            Ready to ship faster?
          </h2>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)', margin: '0 auto 40px', maxWidth: 480 }}>
            Join 12,000 teams already building on FluxOS. Set up in minutes, scale to millions.
          </p>
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: '0 20px 60px rgba(99,102,241,0.5)' }}
            whileTap={{ scale: 0.97 }}
            style={{
              background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
              border: 'none',
              color: '#fff',
              padding: '18px 44px',
              borderRadius: 12,
              fontSize: 17,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            Start your free trial →
          </motion.button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer style={{ position: 'relative', zIndex: 1, borderTop: '1px solid rgba(255,255,255,0.06)', padding: '40px 24px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
        © 2025 FluxOS Inc. · Privacy · Terms · Status
      </footer>
    </div>
  )
}
