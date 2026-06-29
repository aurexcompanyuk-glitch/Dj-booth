import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const ROLE_STYLES = {
  user: {
    align: 'flex-end',
    bg: 'linear-gradient(135deg, #001f3f, #001528)',
    border: '1px solid #00e5ff30',
    label: 'YOU',
    labelColor: '#4dd0e1',
    textColor: '#e0f7fa',
  },
  jarvis: {
    align: 'flex-start',
    bg: 'linear-gradient(135deg, #001a0d, #000d1a)',
    border: '1px solid #00e5ff50',
    label: 'J.A.R.V.I.S.',
    labelColor: '#00e5ff',
    textColor: '#b2ebf2',
  },
  system: {
    align: 'center',
    bg: 'transparent',
    border: 'none',
    label: 'SYSTEM',
    labelColor: '#ff6d00',
    textColor: '#ff6d00a0',
  },
}

export default function ChatWindow({ messages, thinking }) {
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div style={styles.wrap}>
      <div style={styles.inner}>
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const s = ROLE_STYLES[msg.role] || ROLE_STYLES.system
            return (
              <motion.div
                key={msg.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                style={{ display: 'flex', justifyContent: s.align }}
              >
                <div style={{
                  ...styles.bubble,
                  background: s.bg,
                  border: s.border,
                  maxWidth: msg.role === 'system' ? '100%' : '80%',
                }}>
                  <span style={{ ...styles.roleLabel, color: s.labelColor }}>{s.label}</span>
                  <p style={{ ...styles.text, color: s.textColor }}>{msg.text}</p>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {thinking && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ ...styles.bubble, background: ROLE_STYLES.jarvis.bg, border: ROLE_STYLES.jarvis.border }}>
              <span style={{ ...styles.roleLabel, color: '#00e5ff' }}>J.A.R.V.I.S.</span>
              <div style={styles.dots}>
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    style={styles.dot}
                    animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
                    transition={{ duration: 0.8, delay: i * 0.2, repeat: Infinity }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>
    </div>
  )
}

const styles = {
  wrap: {
    flex: 1,
    overflow: 'hidden',
    background: 'var(--panel-bg)',
    border: '1px solid var(--panel-border)',
    borderRadius: '8px',
    zIndex: 1,
    position: 'relative',
  },
  inner: {
    height: '100%',
    overflowY: 'auto',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  bubble: {
    padding: '10px 14px',
    borderRadius: '6px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  roleLabel: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: '9px',
    letterSpacing: '0.2em',
    marginBottom: '2px',
  },
  text: {
    fontSize: '13px',
    lineHeight: '1.7',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  dots: {
    display: 'flex',
    gap: '5px',
    padding: '4px 0',
    alignItems: 'center',
  },
  dot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: '#00e5ff',
    boxShadow: '0 0 6px #00e5ff',
  },
}
