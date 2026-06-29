import { useEffect, useRef } from 'react'

// Three.js-free Canvas2D holographic orb — audio-reactive
export default function HolographicOrb({ listening, thinking, speaking, audioLevel = 0, size }) {
  const canvasRef = useRef(null)
  const stateRef = useRef({ listening, thinking, speaking, audioLevel })

  useEffect(() => {
    stateRef.current = { listening, thinking, speaking, audioLevel }
  }, [listening, thinking, speaking, audioLevel])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let raf
    let t = 0

    // ── Geodesic sphere: UV-sphere projected points ──────────────────────────
    const LATS = 14, LONS = 20
    let spherePoints = []
    let sphereEdges  = []
    ;(() => {
      for (let la = 0; la <= LATS; la++) {
        for (let lo = 0; lo < LONS; lo++) {
          const theta = (la / LATS) * Math.PI
          const phi   = (lo / LONS) * Math.PI * 2
          spherePoints.push([
            Math.sin(theta) * Math.cos(phi),
            Math.cos(theta),
            Math.sin(theta) * Math.sin(phi),
          ])
        }
      }
      // Horizontal rings
      for (let la = 0; la <= LATS; la++) {
        for (let lo = 0; lo < LONS; lo++) {
          const a = la * LONS + lo
          const b = la * LONS + (lo + 1) % LONS
          if (a < spherePoints.length && b < spherePoints.length)
            sphereEdges.push([a, b])
        }
      }
      // Vertical lines
      for (let la = 0; la < LATS; la++) {
        for (let lo = 0; lo < LONS; lo++) {
          const a = la * LONS + lo
          const b = (la + 1) * LONS + lo
          if (b < spherePoints.length) sphereEdges.push([a, b])
        }
      }
    })()

    function project3D(x, y, z, rotX, rotY) {
      // rotate Y
      let nx = x * Math.cos(rotY) + z * Math.sin(rotY)
      let nz = -x * Math.sin(rotY) + z * Math.cos(rotY)
      // rotate X
      let ny = y * Math.cos(rotX) - nz * Math.sin(rotX)
      let nz2 = y * Math.sin(rotX) + nz * Math.cos(rotX)
      return { x: nx, y: ny, z: nz2 }
    }

    // ── Organic ring: sum of sine harmonics ──────────────────────────────────
    function ringPoints(cx, cy, baseR, amp, time, phaseOffset = 0, harmonics = 6) {
      const N = 256
      const pts = []
      for (let i = 0; i <= N; i++) {
        const angle = (i / N) * Math.PI * 2
        let d = 0
        for (let h = 1; h <= harmonics; h++) {
          const freq = h * 2 + 1
          const spd  = 0.18 / h
          d += Math.sin(angle * freq + time * spd + phaseOffset + h) * (amp / (h * 1.1))
        }
        const r = baseR + d
        pts.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)])
      }
      return pts
    }

    function drawRing(pts, color, lineWidth = 1.2, blur = 12) {
      ctx.save()
      ctx.beginPath()
      pts.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y))
      ctx.closePath()
      ctx.strokeStyle = color
      ctx.lineWidth = lineWidth
      ctx.shadowColor = color
      ctx.shadowBlur = blur
      ctx.stroke()
      ctx.restore()
    }

    function draw() {
      const { listening, thinking, speaking, audioLevel } = stateRef.current
      const W = canvas.width, H = canvas.height
      const cx = W / 2, cy = H / 2
      const baseSize = Math.min(W, H) * 0.38

      ctx.clearRect(0, 0, W, H)

      // ── Background radial glow ───────────────────────────────────────────
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseSize * 1.4)
      bg.addColorStop(0,   'rgba(0,180,160,0.07)')
      bg.addColorStop(0.5, 'rgba(0,100,120,0.04)')
      bg.addColorStop(1,   'rgba(0,0,0,0)')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, W, H)

      // ── Audio/state-driven parameters ────────────────────────────────────
      const AL = Math.max(audioLevel, thinking ? 0.35 : 0, speaking ? 0.5 : 0, listening ? 0.25 : 0)
      const pulse = 1 + AL * 0.3 + Math.sin(t * (thinking ? 4 : 1.5)) * 0.04
      const tealA = thinking ? '#00ffd0' : speaking ? '#00e5ff' : '#00c8b4'
      const tealB = 'rgba(0,200,180,'

      // ── OUTER organic ring (most dramatic, like the image) ───────────────
      const outerAmp = baseSize * (0.12 + AL * 0.2)
      const outerR   = baseSize * 1.05 * pulse
      const outer = ringPoints(cx, cy, outerR, outerAmp, t, 0, 8)
      drawRing(outer, tealA, 1.5, 20)

      // Second outer ring (slightly smaller, phase-shifted)
      const outer2 = ringPoints(cx, cy, outerR * 0.93, outerAmp * 0.7, t, Math.PI, 6)
      drawRing(outer2, `rgba(0,200,180,0.35)`, 0.8, 10)

      // ── MIDDLE concentric organic rings ──────────────────────────────────
      const midAmps  = [0.06, 0.045, 0.03]
      const midRadii = [0.72, 0.58, 0.46]
      midRadii.forEach((rf, i) => {
        const mpts = ringPoints(cx, cy, baseSize * rf * pulse, baseSize * midAmps[i] * (1 + AL), t, i * 1.3, 4)
        drawRing(mpts, `rgba(0,210,185,${0.5 - i * 0.1})`, 0.9, 8)
      })

      // ── INNER SPHERE (geodesic projection) ───────────────────────────────
      const sphereR = baseSize * 0.22 * pulse
      const rotY = t * 0.25
      const rotX = t * 0.12

      // Project all points
      const proj = spherePoints.map(([x, y, z]) => {
        const p = project3D(x, y, z, rotX, rotY)
        return { x: cx + p.x * sphereR, y: cy + p.y * sphereR, z: p.z, visible: p.z > -0.1 }
      })

      // Draw edges
      ctx.save()
      sphereEdges.forEach(([a, b]) => {
        if (!proj[a] || !proj[b]) return
        const pA = proj[a], pB = proj[b]
        const avgZ = (pA.z + pB.z) / 2
        if (avgZ < -0.05) return
        const alpha = 0.15 + avgZ * 0.55
        ctx.beginPath()
        ctx.moveTo(pA.x, pA.y)
        ctx.lineTo(pB.x, pB.y)
        ctx.strokeStyle = `rgba(0,210,200,${alpha})`
        ctx.lineWidth = 0.6
        ctx.shadowColor = tealA
        ctx.shadowBlur = 3
        ctx.stroke()
      })

      // Draw vertex dots
      proj.forEach(({ x, y, z, visible }) => {
        if (!visible || z < 0) return
        const alpha = 0.3 + z * 0.7
        const r = 0.8 + z * 1.5
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(180,255,245,${alpha})`
        ctx.shadowColor = '#00ffee'
        ctx.shadowBlur = 4
        ctx.fill()
      })
      ctx.restore()

      // ── CORE glow ────────────────────────────────────────────────────────
      const coreR  = sphereR * 0.35
      const coreGl = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 2.5)
      coreGl.addColorStop(0,   `rgba(200,255,248,${0.9 + AL * 0.1})`)
      coreGl.addColorStop(0.3, `rgba(0,220,200,0.6)`)
      coreGl.addColorStop(1,   'rgba(0,0,0,0)')
      ctx.beginPath()
      ctx.arc(cx, cy, coreR * 2.5, 0, Math.PI * 2)
      ctx.fillStyle = coreGl
      ctx.fill()

      // ── WAVEFORM band (audio reactive) ───────────────────────────────────
      if (AL > 0.05) {
        ctx.save()
        ctx.globalAlpha = AL * 0.6
        const waveR = baseSize * 0.33
        const segments = 80
        ctx.beginPath()
        for (let i = 0; i <= segments; i++) {
          const angle = (i / segments) * Math.PI * 2
          const wave  = Math.sin(i * 12 + t * 8) * waveR * AL * 0.15
          const r = waveR + wave
          const x = cx + r * Math.cos(angle)
          const y = cy + r * Math.sin(angle)
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        }
        ctx.strokeStyle = tealA
        ctx.lineWidth = 1
        ctx.shadowColor = tealA
        ctx.shadowBlur = 8
        ctx.stroke()
        ctx.restore()
      }

      // ── Listening/speaking state ring ─────────────────────────────────────
      if (listening || speaking) {
        const stateColor = listening ? '#ff6d00' : '#00e5ff'
        const stateR = baseSize * 1.18 * pulse
        const bR = stateR + Math.sin(t * 3) * baseSize * 0.03
        ctx.beginPath()
        ctx.arc(cx, cy, bR, 0, Math.PI * 2)
        ctx.strokeStyle = stateColor
        ctx.lineWidth = 1.5
        ctx.shadowColor = stateColor
        ctx.shadowBlur = 20
        ctx.stroke()
      }

      t += 0.012
      raf = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ display: 'block', width: size, height: size }}
    />
  )
}
