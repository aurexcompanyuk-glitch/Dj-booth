import { motion, AnimatePresence } from 'framer-motion'

export default function HUD({ thinking, connected }) {
  return (
    <div style={styles.wrap}>
      {/* Corner brackets */}
      {['tl', 'tr', 'bl', 'br'].map((pos) => (
        <div key={pos} style={{ ...styles.corner, ...cornerPos[pos] }} />
      ))}

      <div style={styles.inner}>
        <AnimatePresence mode="wait">
          {thinking ? (
            <motion.div
              key="thinking"
              style={styles.thinkingRow}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
              {Array.from({ length: 5 }).map((_, i) => (
                <motion.div
                  key={i}
                  style={styles.thinkBar}
                  animate={{ scaleY: [0.3, 1, 0.3] }}
                  transition={{ duration: 0.6, delay: i * 0.1, repeat: Infinity }}
                />
              ))}
              <span style={styles.thinkLabel}>PROCESSING QUERY</span>
              {Array.from({ length: 5 }).map((_, i) => (
                <motion.div
                  key={i + 10}
                  style={styles.thinkBar}
                  animate={{ scaleY: [0.3, 1, 0.3] }}
                  transition={{ duration: 0.6, delay: (4 - i) * 0.1, repeat: Infinity }}
                />
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              style={styles.idleRow}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
              <motion.div
                style={styles.scanLine}
                animate={{ scaleX: [0, 1, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              />
              <span style={styles.idleLabel}>
                {connected ? 'AWAITING INPUT' : 'ESTABLISHING CONNECTION'}
              </span>
              <motion.div
                style={{ ...styles.scanLine, transformOrigin: 'right' }}
                animate={{ scaleX: [0, 1, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

const CORNER_SIZE = 16
const cornerPos = {
  tl: { top: 0, left: 0, borderTop: '2px solid var(--cyan)', borderLeft: '2px solid var(--cyan)' },
  tr: { top: 0, right: 0, borderTop: '2px solid var(--cyan)', borderRight: '2px solid var(--cyan)' },
  bl: { bottom: 0, left: 0, borderBottom: '2px solid var(--cyan)', borderLeft: '2px solid var(--cyan)' },
  br: { bottom: 0, right: 0, borderBottom: '2px solid var(--cyan)', borderRight: '2px solid var(--cyan)' },
}

const styles = {
  wrap: {
    position: 'relative',
    height: '48px',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px 20px',
    zIndex: 1,
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    opacity: 0.7,
  },
  inner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  thinkingRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  thinkBar: {
    width: '3px',
    height: '20px',
    background: '#ff6d00',
    borderRadius: '2px',
    boxShadow: '0 0 6px #ff6d00',
  },
  thinkLabel: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: '11px',
    color: '#ff6d00',
    letterSpacing: '0.2em',
    margin: '0 8px',
    textShadow: '0 0 10px #ff6d0080',
  },
  idleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    width: '80%',
  },
  scanLine: {
    flex: 1,
    height: '1px',
    background: 'linear-gradient(90deg, transparent, #00e5ff, transparent)',
    transformOrigin: 'left',
  },
  idleLabel: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: '10px',
    color: '#4dd0e180',
    letterSpacing: '0.25em',
    whiteSpace: 'nowrap',
  },
}
