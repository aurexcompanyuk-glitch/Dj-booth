import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

const METRICS = [
  { key: 'arc',   label: 'ARC REACTOR', unit: 'TW' },
  { key: 'cpu',   label: 'CPU LOAD',    unit: '%'  },
  { key: 'mem',   label: 'MEMORY',      unit: '%'  },
  { key: 'net',   label: 'NET I/O',     unit: 'Mb/s'},
]

export default function SystemStats({ mirror }) {
  const [vals, setVals] = useState({ arc: 3.2, cpu: 12, mem: 34, net: 1.1 })

  useEffect(() => {
    const id = setInterval(() => {
      setVals({
        arc: +(3.0 + Math.random() * 0.4).toFixed(1),
        cpu: Math.floor(5 + Math.random() * 40),
        mem: Math.floor(25 + Math.random() * 20),
        net: +(0.5 + Math.random() * 3).toFixed(1),
      })
    }, 1800)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={{ ...styles.wrap, transform: mirror ? 'scaleX(-1)' : 'none' }}>
      <span style={styles.header}>SYS STATUS</span>
      {METRICS.map(({ key, label, unit }) => (
        <div key={key} style={styles.row}>
          <span style={styles.label}>{label}</span>
          <div style={styles.barTrack}>
            <motion.div
              style={styles.barFill}
              animate={{ width: `${Math.min((vals[key] / (key === 'arc' ? 4 : key === 'net' ? 4 : 100)) * 100, 100)}%` }}
              transition={{ duration: 0.8, ease: 'easeInOut' }}
            />
          </div>
          <span style={styles.val}>{vals[key]}{unit}</span>
        </div>
      ))}
    </div>
  )
}

const styles = {
  wrap: {
    background: 'var(--panel-bg)',
    border: '1px solid var(--panel-border)',
    borderRadius: '8px',
    padding: '12px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    flex: 1,
  },
  header: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: '9px',
    color: '#4dd0e1a0',
    letterSpacing: '0.2em',
    marginBottom: '2px',
  },
  row: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
  },
  label: {
    fontSize: '9px',
    color: '#4dd0e1',
    letterSpacing: '0.1em',
  },
  barTrack: {
    height: '4px',
    background: '#00e5ff12',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #00e5ff, #00bcd4)',
    borderRadius: '2px',
    boxShadow: '0 0 6px #00e5ff80',
  },
  val: {
    fontSize: '10px',
    color: '#00e5ff',
    fontFamily: 'Share Tech Mono, monospace',
  },
}
