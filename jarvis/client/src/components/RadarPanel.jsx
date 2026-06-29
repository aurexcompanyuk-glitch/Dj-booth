import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

export default function RadarPanel({ active, reverse }) {
  const canvasRef = useRef(null)
  const angleRef = useRef(0)
  const dotsRef = useRef([])
  const rafRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const size = canvas.width
    const cx = size / 2, cy = size / 2, r = size / 2 - 6

    function spawnDot(angle) {
      if (Math.random() > 0.92) {
        const dist = (0.3 + Math.random() * 0.6) * r
        const spread = (Math.random() - 0.5) * 0.3
        dotsRef.current.push({
          x: cx + dist * Math.cos(angle + spread),
          y: cy + dist * Math.sin(angle + spread),
          opacity: 1,
          size: 2 + Math.random() * 3,
        })
      }
    }

    function draw() {
      ctx.clearRect(0, 0, size, size)
      const dir = reverse ? -1 : 1

      // Grid rings
      for (let i = 1; i <= 4; i++) {
        ctx.beginPath()
        ctx.arc(cx, cy, (r / 4) * i, 0, Math.PI * 2)
        ctx.strokeStyle = '#00e5ff12'
        ctx.lineWidth = 1
        ctx.stroke()
      }

      // Cross hairs
      ctx.strokeStyle = '#00e5ff10'
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy); ctx.stroke()

      if (!active) { rafRef.current = requestAnimationFrame(draw); return }

      // Sweep
      const sweepAngle = angleRef.current
      const gradient = ctx.createConicalGradient
        ? null
        : (() => {
            const g = ctx.createConicGradient(sweepAngle - Math.PI * 0.5, cx, cy)
            g.addColorStop(0, '#00e5ff30')
            g.addColorStop(0.15, '#00e5ff00')
            g.addColorStop(1, '#00e5ff00')
            return g
          })()

      // Sweep wedge fallback
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, r, sweepAngle - Math.PI * 0.35, sweepAngle)
      ctx.closePath()
      ctx.fillStyle = gradient || '#00e5ff15'
      ctx.fill()
      ctx.restore()

      // Sweep line
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(cx + r * Math.cos(sweepAngle), cy + r * Math.sin(sweepAngle))
      ctx.strokeStyle = '#00e5ffcc'
      ctx.lineWidth = 1.5
      ctx.shadowColor = '#00e5ff'
      ctx.shadowBlur = 6
      ctx.stroke()
      ctx.shadowBlur = 0

      spawnDot(sweepAngle)

      // Dots
      dotsRef.current = dotsRef.current.filter((d) => d.opacity > 0.02)
      for (const d of dotsRef.current) {
        ctx.beginPath()
        ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(0,229,255,${d.opacity})`
        ctx.shadowColor = '#00e5ff'
        ctx.shadowBlur = 4
        ctx.fill()
        ctx.shadowBlur = 0
        d.opacity *= 0.97
      }

      angleRef.current += dir * 0.025
      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [active, reverse])

  return (
    <div style={styles.wrap}>
      <span style={styles.label}>RADAR SCAN</span>
      <canvas ref={canvasRef} width={180} height={180} style={styles.canvas} />
    </div>
  )
}

const styles = {
  wrap: {
    background: 'var(--panel-bg)',
    border: '1px solid var(--panel-border)',
    borderRadius: '8px',
    padding: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    alignItems: 'center',
  },
  label: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: '9px',
    color: '#4dd0e1a0',
    letterSpacing: '0.2em',
  },
  canvas: {
    borderRadius: '50%',
    display: 'block',
  },
}
