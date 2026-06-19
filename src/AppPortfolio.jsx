import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const ACCENT = '#f5c518'
const BLACK = '#000'
const WHITE = '#fff'

const projects = [
  {
    id: 1,
    title: 'Orbital CRM',
    tags: ['React', 'Node.js', 'PostgreSQL'],
    color: '#1a1a2e',
    accent: '#6366f1',
    year: '2024',
    desc: 'A relationship intelligence platform that maps customer interactions across 50+ touchpoints. Built for scale — handles 10M events/day with sub-100ms query times.',
    role: 'Lead Engineer',
    duration: '8 months',
  },
  {
    id: 2,
    title: 'Wavefront Audio',
    tags: ['Web Audio API', 'WebGL', 'TypeScript'],
    color: '#0a1628',
    accent: '#14b8a6',
    year: '2024',
    desc: 'Browser-based DAW with real-time collaboration and procedural audio visualization. Launched to 40,000 beta users in the first week.',
    role: 'Full Stack',
    duration: '6 months',
  },
  {
    id: 3,
    title: 'Lens Design System',
    tags: ['Figma', 'React', 'Storybook'],
    color: '#1a0a0a',
    accent: '#ec4899',
    year: '2023',
    desc: 'Component library adopted across 12 product teams. 200+ components, full a11y coverage, and automated visual regression tests.',
    role: 'Design Engineer',
    duration: '4 months',
  },
  {
    id: 4,
    title: 'Terrain Maps',
    tags: ['Three.js', 'WebGPU', 'GLSL'],
    color: '#0a1a0a',
    accent: '#10b981',
    year: '2023',
    desc: 'Procedurally generated 3D terrain explorer with real satellite elevation data. Renders 100km² at 60fps in the browser.',
    role: 'Solo Dev',
    duration: '3 months',
  },
  {
    id: 5,
    title: 'Pulse Analytics',
    tags: ['D3.js', 'Python', 'FastAPI'],
    color: '#1a1500',
    accent: '#f59e0b',
    year: '2023',
    desc: 'Real-time analytics dashboard for e-commerce. Reduced decision latency by 60% with live cohort funnel visualization.',
    role: 'Frontend Lead',
    duration: '5 months',
  },
  {
    id: 6,
    title: 'Ghost Protocol',
    tags: ['Rust', 'WebAssembly', 'Crypto'],
    color: '#1a0a1a',
    accent: '#8b5cf6',
    year: '2022',
    desc: 'End-to-end encrypted messaging app with zero-knowledge proofs. Open source, 8K GitHub stars.',
    role: 'Systems Engineer',
    duration: '10 months',
  },
]

const skills = ['React', 'TypeScript', 'Node.js', 'Rust', 'WebGL/Three.js', 'PostgreSQL', 'Redis', 'Kubernetes', 'AWS', 'Figma', 'Web Audio API', 'WebAssembly', 'GraphQL', 'Python', 'GLSL', 'D3.js']

function ProjectCard({ project, index, onClick }) {
  const [hovered, setHovered] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
      onClick={() => onClick(project)}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileHover={{ scale: 1.02, y: -4 }}
      style={{
        cursor: 'pointer',
        border: hovered ? `2px solid ${ACCENT}` : '2px solid #111',
        borderRadius: 0,
        overflow: 'hidden',
        background: BLACK,
        transition: 'border-color 0.2s',
      }}
    >
      {/* Image placeholder */}
      <div style={{
        height: 200,
        background: project.color,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <motion.div
          animate={hovered ? { scale: 1.08 } : { scale: 1 }}
          transition={{ duration: 0.4 }}
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: project.accent,
            opacity: 0.6,
          }}
        />
        <div style={{
          position: 'absolute',
          bottom: 12,
          right: 12,
          fontSize: 12,
          fontWeight: 700,
          color: 'rgba(255,255,255,0.4)',
          fontFamily: 'Georgia, serif',
          letterSpacing: '0.1em',
        }}>
          {project.year}
        </div>
        {hovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(245,197,24,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 700,
              color: ACCENT,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
            }}
          >
            View Project →
          </motion.div>
        )}
      </div>
      <div style={{ padding: '20px 24px' }}>
        <h3 style={{ margin: '0 0 10px', fontSize: 22, fontWeight: 700, fontFamily: 'Georgia, serif', color: WHITE }}>{project.title}</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {project.tags.map(tag => (
            <span key={tag} style={{
              fontSize: 11,
              fontWeight: 700,
              fontFamily: 'monospace',
              color: 'rgba(255,255,255,0.5)',
              background: '#111',
              padding: '3px 8px',
              border: '1px solid #222',
            }}>
              {tag}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

function HomeView({ onProjectClick }) {
  return (
    <motion.div
      key="home"
      initial={{ opacity: 0, x: -40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {/* Hero */}
      <section style={{ padding: '120px 48px 80px', maxWidth: 1200, margin: '0 auto' }}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.2em', color: ACCENT, textTransform: 'uppercase', marginBottom: 24 }}
        >
          Available for work — 2025
        </motion.div>
        <h1 style={{ fontSize: 'clamp(56px, 10vw, 140px)', fontWeight: 900, margin: 0, lineHeight: 0.9, letterSpacing: '-0.04em', fontFamily: 'Georgia, serif' }}>
          {'Alex\nMoore.'.split('\n').map((line, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -60 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.15, duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
              style={{ display: 'block', color: i === 1 ? ACCENT : WHITE }}
            >
              {line}
            </motion.div>
          ))}
        </h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          style={{ fontSize: 20, lineHeight: 1.6, color: 'rgba(255,255,255,0.5)', maxWidth: 540, margin: '40px 0 0', fontFamily: 'Georgia, serif' }}
        >
          Full-stack engineer specializing in high-performance interfaces, creative coding, and systems that scale.
        </motion.p>
      </section>

      {/* Projects grid */}
      <section style={{ padding: '0 48px 80px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 24, marginBottom: 40 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', margin: 0, fontFamily: 'Georgia, serif' }}>Selected Work</h2>
          <div style={{ flex: 1, height: 1, background: '#222' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 24 }}>
          {projects.map((p, i) => (
            <ProjectCard key={p.id} project={p} index={i} onClick={onProjectClick} />
          ))}
        </div>
      </section>

      {/* About / Skills */}
      <section style={{ padding: '80px 48px', borderTop: '1px solid #111', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80 }}>
          <div>
            <h2 style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 900, margin: '0 0 24px', letterSpacing: '-0.03em', fontFamily: 'Georgia, serif' }}>
              About <span style={{ color: ACCENT }}>me</span>
            </h2>
            <p style={{ fontSize: 16, lineHeight: 1.8, color: 'rgba(255,255,255,0.55)', margin: 0 }}>
              10 years building products that reach millions. Former staff engineer at Stripe, early engineer at Vercel. Now independent — taking on projects where craft meets impact.
            </p>
            <p style={{ fontSize: 16, lineHeight: 1.8, color: 'rgba(255,255,255,0.55)', margin: '16px 0 0' }}>
              I care about the details: animation timing, render budgets, API ergonomics. The invisible stuff that makes an app feel alive.
            </p>
          </div>
          <div>
            <h3 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', margin: '0 0 24px' }}>Skills & Tools</h3>
            <div style={{ display: 'flex', flexWrap: 'nowrap', overflowX: 'auto', gap: 10, paddingBottom: 12 }}>
              {skills.map((s, i) => (
                <motion.span
                  key={s}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.04 }}
                  whileHover={{ background: ACCENT, color: BLACK }}
                  style={{
                    flexShrink: 0,
                    display: 'inline-block',
                    padding: '8px 16px',
                    border: '1px solid #333',
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: 'monospace',
                    color: WHITE,
                    background: '#0a0a0a',
                    cursor: 'default',
                    transition: 'background 0.2s, color 0.2s',
                  }}
                >
                  {s}
                </motion.span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section style={{ padding: '80px 48px', borderTop: '1px solid #111', maxWidth: 1200, margin: '0 auto' }}>
        <h2 style={{ fontSize: 'clamp(40px, 8vw, 100px)', fontWeight: 900, margin: '0 0 40px', letterSpacing: '-0.05em', fontFamily: 'Georgia, serif', lineHeight: 0.9 }}>
          Let's<br /><span style={{ color: ACCENT }}>talk.</span>
        </h2>
        <motion.a
          href="mailto:alex@example.com"
          whileHover={{ x: 8, color: ACCENT }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 18,
            fontWeight: 600,
            color: WHITE,
            textDecoration: 'none',
            borderBottom: `2px solid ${ACCENT}`,
            paddingBottom: 4,
            transition: 'color 0.2s, x 0.2s',
          }}
        >
          alex@example.com →
        </motion.a>
      </section>
    </motion.div>
  )
}

function ProjectDetailView({ project, onBack }) {
  return (
    <motion.div
      key="detail"
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 60 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {/* Back button */}
      <div style={{ padding: '40px 48px 0', maxWidth: 1200, margin: '0 auto' }}>
        <motion.button
          onClick={onBack}
          whileHover={{ x: -4, color: ACCENT }}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.5)',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'Georgia, serif',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'color 0.2s',
          }}
        >
          ← Back to work
        </motion.button>
      </div>

      {/* Hero area */}
      <div style={{
        height: 400,
        background: project.color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '40px 0',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.4 }}
          transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{ width: 200, height: 200, borderRadius: '50%', background: project.accent }}
        />
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          style={{
            position: 'absolute',
            fontSize: 'clamp(40px, 8vw, 96px)',
            fontWeight: 900,
            fontFamily: 'Georgia, serif',
            color: WHITE,
            margin: 0,
            letterSpacing: '-0.04em',
          }}
        >
          {project.title}
        </motion.h1>
      </div>

      {/* Content */}
      <div style={{ padding: '0 48px 120px', maxWidth: 800, margin: '0 auto' }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <div style={{ display: 'flex', gap: 40, marginBottom: 48 }}>
            {[['Role', project.role], ['Duration', project.duration], ['Year', project.year]].map(([label, val]) => (
              <div key={label}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: WHITE, fontFamily: 'Georgia, serif' }}>{val}</div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 20, lineHeight: 1.8, color: 'rgba(255,255,255,0.7)', margin: '0 0 40px', fontFamily: 'Georgia, serif' }}>
            {project.desc}
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {project.tags.map(tag => (
              <span key={tag} style={{
                fontSize: 12,
                fontWeight: 700,
                fontFamily: 'monospace',
                color: project.accent,
                background: 'rgba(255,255,255,0.05)',
                padding: '6px 14px',
                border: `1px solid ${project.accent}33`,
              }}>
                {tag}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}

export default function AppPortfolio() {
  const [view, setView] = useState('home')
  const [activeProject, setActiveProject] = useState(null)

  function handleProjectClick(project) {
    setActiveProject(project)
    setView('detail')
  }

  function handleBack() {
    setView('home')
    setActiveProject(null)
  }

  return (
    <div style={{ minHeight: '100vh', background: BLACK, color: WHITE, overflowX: 'hidden' }}>
      {/* Fixed nav */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        padding: '20px 48px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(0,0,0,0.9)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #111',
      }}>
        <motion.div
          whileHover={{ color: ACCENT }}
          onClick={handleBack}
          style={{ fontSize: 18, fontWeight: 900, fontFamily: 'Georgia, serif', cursor: 'pointer', letterSpacing: '-0.02em', transition: 'color 0.2s' }}
        >
          AM.
        </motion.div>
        <div style={{ display: 'flex', gap: 32, fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>
          {['Work', 'About', 'Contact'].map(item => (
            <motion.span key={item} whileHover={{ color: WHITE }} style={{ cursor: 'pointer', transition: 'color 0.2s' }}>{item}</motion.span>
          ))}
        </div>
      </nav>

      <AnimatePresence mode="wait">
        {view === 'home' ? (
          <HomeView onProjectClick={handleProjectClick} />
        ) : (
          <ProjectDetailView project={activeProject} onBack={handleBack} />
        )}
      </AnimatePresence>
    </div>
  )
}
