import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

const STATUS_COLOR = {
  ONLINE: '#00e5ff',
  OFFLINE: '#ff1744',
  CONNECTING: '#ff6d00',
  RECONNECTING: '#ff6d00',
  INITIALIZING: '#ffd600',
}

export default function StatusBar({ status, connected }) {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const color = STATUS_COLOR[status] || '#00e5ff'

  return (
    <div style={styles.bar}>
      <div style={styles.left}>
        <span style={styles.logo}>J.A.R.V.I.S.</span>
        <span style={styles.sub}>JUST A RATHER VERY INTELLIGENT SYSTEM</span>
      </div>

      <div style={styles.center}>
        <motion.div
          style={{ ...styles.dot, background: color, boxShadow: `0 0 8px ${color}` }}
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
        <span style={{ ...styles.statusText, color }}>{status}</span>
      </div>

      <div style={styles.right}>
        <span style={styles.clock}>
          {time.toLocaleTimeString('en-US', { hour12: false })}
        </span>
        <span style={styles.date}>
          {time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </div>
    </div>
  )
}

const styles = {
  bar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 20px',
    borderBottom: '1px solid var(--panel-border)',
    background: 'linear-gradient(90deg, #000d1a 0%, #001528 50%, #000d1a 100%)',
    zIndex: 10,
    position: 'relative',
  },
  left: { display: 'flex', flexDirection: 'column' },
  logo: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: '20px',
    fontWeight: 900,
    color: '#00e5ff',
    textShadow: '0 0 20px #00e5ff80',
    letterSpacing: '0.2em',
  },
  sub: {
    fontSize: '9px',
    color: '#4dd0e180',
    letterSpacing: '0.2em',
    marginTop: '2px',
  },
  center: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  statusText: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.15em',
  },
  right: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  clock: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: '18px',
    color: '#00e5ff',
    letterSpacing: '0.1em',
  },
  date: {
    fontSize: '10px',
    color: '#4dd0e180',
    letterSpacing: '0.1em',
    marginTop: '2px',
  },
}
