import { useEffect, useRef } from 'react'

// Cinematic light-streak canvas — simulates studio lights playing off polished car paint
export default function CarCanvas() {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let W = canvas.width = window.innerWidth
    let H = canvas.height = window.innerHeight
    let frame = 0
    let raf

    const onResize = () => {
      W = canvas.width = window.innerWidth
      H = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', onResize)

    // Light streaks — arcing bezier curves simulating body-panel reflections
    const streaks = Array.from({ length: 14 }, (_, i) => ({
      phase: (i / 14) * Math.PI * 2,
      speed: 0.0004 + Math.random() * 0.0003,
      width: 1.5 + Math.random() * 3.5,
      alpha: 0.04 + Math.random() * 0.12,
      color: Math.random() > 0.6 ? '#c9a84c' : Math.random() > 0.5 ? '#ffffff' : '#4488ff',
      yOffset: (Math.random() - 0.5) * H * 1.2,
      curve: (Math.random() - 0.5) * 300,
    }))

    // Dust particles
    const dust = Array.from({ length: 80 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.2,
      vx: (Math.random() - 0.5) * 0.15,
      vy: -0.05 - Math.random() * 0.15,
      alpha: Math.random() * 0.35,
    }))

    function drawStreak(s, t) {
      const progress = (Math.sin(t * s.speed * 1000 + s.phase) + 1) / 2
      const x0 = -W * 0.3 + progress * W * 1.6
      const y0 = H * 0.5 + s.yOffset * 0.3
      const cpX = x0 + W * 0.2
      const cpY = y0 + s.curve
      const x1 = x0 + W * 0.55
      const y1 = y0 + s.curve * 0.4

      const grad = ctx.createLinearGradient(x0, y0, x1, y1)
      grad.addColorStop(0, 'transparent')
      grad.addColorStop(0.2, s.color + Math.floor(s.alpha * 255).toString(16).padStart(2, '0'))
      grad.addColorStop(0.5, s.color + Math.floor(s.alpha * 1.8 * 255).toString(16).padStart(2, '0'))
      grad.addColorStop(0.8, s.color + Math.floor(s.alpha * 255).toString(16).padStart(2, '0'))
      grad.addColorStop(1, 'transparent')

      ctx.beginPath()
      ctx.moveTo(x0, y0)
      ctx.quadraticCurveTo(cpX, cpY, x1, y1)
      ctx.strokeStyle = grad
      ctx.lineWidth = s.width
      ctx.stroke()
    }

    function draw(ts) {
      raf = requestAnimationFrame(draw)
      ctx.clearRect(0, 0, W, H)

      // Deep dark base
      ctx.fillStyle = '#070707'
      ctx.fillRect(0, 0, W, H)

      // Subtle radial glow center — like a studio spotlight on a hood
      const glow = ctx.createRadialGradient(W * 0.5, H * 0.52, 0, W * 0.5, H * 0.52, W * 0.55)
      glow.addColorStop(0, 'rgba(201,168,76,0.045)')
      glow.addColorStop(0.5, 'rgba(201,168,76,0.015)')
      glow.addColorStop(1, 'transparent')
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, W, H)

      // Light streaks
      ctx.save()
      streaks.forEach(s => drawStreak(s, ts * 0.001))
      ctx.restore()

      // Dust
      dust.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        if (p.y < -2) { p.y = H + 2; p.x = Math.random() * W }
        if (p.x < -2) p.x = W + 2
        if (p.x > W + 2) p.x = -2
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${p.alpha})`
        ctx.fill()
      })

      // Horizontal scan line — like a studio light sweep
      const scanY = ((ts * 0.00008) % 1) * H
      const scanGrad = ctx.createLinearGradient(0, scanY - 60, 0, scanY + 60)
      scanGrad.addColorStop(0, 'transparent')
      scanGrad.addColorStop(0.5, 'rgba(201,168,76,0.025)')
      scanGrad.addColorStop(1, 'transparent')
      ctx.fillStyle = scanGrad
      ctx.fillRect(0, scanY - 60, W, 120)

      frame++
    }

    raf = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <canvas
      ref={ref}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
    />
  )
}
