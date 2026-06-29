export default function GridOverlay() {
  return (
    <div style={styles.overlay}>
      <svg width="100%" height="100%" style={styles.svg}>
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--grid)" strokeWidth="1"/>
          </pattern>
          <radialGradient id="vignette" cx="50%" cy="50%" r="50%">
            <stop offset="40%" stopColor="transparent"/>
            <stop offset="100%" stopColor="#000d1a"/>
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)"/>
        <rect width="100%" height="100%" fill="url(#vignette)"/>
      </svg>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    zIndex: 0,
  },
  svg: {
    position: 'absolute',
    inset: 0,
  },
}
