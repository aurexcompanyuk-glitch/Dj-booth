import { motion } from 'framer-motion'

export default function ArcReactor({ active, thinking, size = 140 }) {
  const c = size / 2
  const pulseColor = thinking ? '#ff6d00' : '#00e5ff'

  return (
    <div style={{ ...styles.wrap, width: size, height: size, alignSelf: 'center' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Outer glow ring */}
        <motion.circle
          cx={c} cy={c} r={c - 4}
          fill="none" stroke={pulseColor} strokeWidth="1"
          style={{ filter: `drop-shadow(0 0 8px ${pulseColor})` }}
          animate={{ opacity: active ? [0.4, 1, 0.4] : 0.15 }}
          transition={{ duration: 2, repeat: Infinity }}
        />

        {/* Rotating outer ring */}
        <motion.g
          style={{ transformOrigin: `${c}px ${c}px` }}
          animate={{ rotate: 360 }}
          transition={{ duration: thinking ? 1.5 : 8, repeat: Infinity, ease: 'linear' }}
        >
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <rect
              key={deg}
              x={c - 1} y={8}
              width={2} height={10}
              fill={pulseColor}
              opacity={0.8}
              transform={`rotate(${deg} ${c} ${c})`}
            />
          ))}
        </motion.g>

        {/* Middle ring — counter-rotate */}
        <motion.g
          style={{ transformOrigin: `${c}px ${c}px` }}
          animate={{ rotate: -360 }}
          transition={{ duration: thinking ? 2 : 12, repeat: Infinity, ease: 'linear' }}
        >
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <rect
              key={deg}
              x={c - 0.75} y={c - size * 0.32}
              width={1.5} height={8}
              fill={pulseColor}
              opacity={0.5}
              transform={`rotate(${deg} ${c} ${c})`}
            />
          ))}
        </motion.g>

        {/* Inner hexagonal frame */}
        <polygon
          points={hexPoints(c, c, size * 0.22)}
          fill="none"
          stroke={pulseColor}
          strokeWidth="1.5"
          opacity={0.6}
          style={{ filter: `drop-shadow(0 0 4px ${pulseColor})` }}
        />

        {/* Core circle */}
        <motion.circle
          cx={c} cy={c} r={size * 0.12}
          fill={active ? pulseColor + '30' : '#00000000'}
          stroke={pulseColor}
          strokeWidth="2"
          style={{ filter: `drop-shadow(0 0 12px ${pulseColor})` }}
          animate={thinking
            ? { r: [size * 0.12, size * 0.16, size * 0.12], opacity: [1, 0.6, 1] }
            : { opacity: active ? [0.8, 1, 0.8] : 0.4 }}
          transition={{ duration: 0.8, repeat: Infinity }}
        />

        {/* Core highlight */}
        <circle cx={c - size * 0.04} cy={c - size * 0.04} r={size * 0.03}
          fill="white" opacity={active ? 0.6 : 0.15} />
      </svg>
    </div>
  )
}

function hexPoints(cx, cy, r) {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 6
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`
  }).join(' ')
}

const styles = {
  wrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px',
    background: 'var(--panel-bg)',
    border: '1px solid var(--panel-border)',
    borderRadius: '8px',
  },
}
