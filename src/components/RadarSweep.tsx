import { useEffect, useRef } from 'react'

interface RadarSweepProps {
  scanning: boolean
  size?: number
}

export default function RadarSweep({ scanning, size = 42 }: RadarSweepProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const angleRef = useRef(0)
  const dotsRef = useRef<{ x: number; y: number; alpha: number; age: number }[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.scale(dpr, dpr)

    const cx = size / 2
    const cy = size / 2
    const r = size / 2 - 2

    function spawnDot() {
      const a = Math.random() * Math.PI * 2
      const dist = 0.2 + Math.random() * 0.7
      dotsRef.current.push({
        x: cx + Math.cos(a) * r * dist,
        y: cy + Math.sin(a) * r * dist,
        alpha: 1,
        age: 0,
      })
    }

    let lastTime = 0
    function draw(time: number) {
      const dt = lastTime ? (time - lastTime) / 1000 : 0.016
      lastTime = time

      ctx.clearRect(0, 0, size, size)

      // Outer ring
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.15)'
      ctx.lineWidth = 1
      ctx.stroke()

      // Inner rings
      ctx.beginPath()
      ctx.arc(cx, cy, r * 0.66, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.08)'
      ctx.stroke()

      ctx.beginPath()
      ctx.arc(cx, cy, r * 0.33, 0, Math.PI * 2)
      ctx.stroke()

      // Cross lines
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.06)'
      ctx.beginPath()
      ctx.moveTo(cx, cy - r)
      ctx.lineTo(cx, cy + r)
      ctx.moveTo(cx - r, cy)
      ctx.lineTo(cx + r, cy)
      ctx.stroke()

      // Sweep
      const speed = scanning ? 2.5 : 0.4
      angleRef.current += speed * dt
      if (angleRef.current > Math.PI * 2) angleRef.current -= Math.PI * 2

      const grad = ctx.createConicGradient(angleRef.current - Math.PI / 2, cx, cy)
      grad.addColorStop(0, 'rgba(16, 185, 129, 0.0)')
      grad.addColorStop(0.08, 'rgba(16, 185, 129, 0.25)')
      grad.addColorStop(0.15, 'rgba(16, 185, 129, 0.0)')

      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fillStyle = grad
      ctx.fill()

      // Sweep leading line
      const lx = cx + Math.cos(angleRef.current) * r
      const ly = cy + Math.sin(angleRef.current) * r
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(lx, ly)
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)'
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Dots
      if (scanning && Math.random() < 0.15) spawnDot()

      for (let i = dotsRef.current.length - 1; i >= 0; i--) {
        const dot = dotsRef.current[i]
        dot.age += dt
        dot.alpha = Math.max(0, 1 - dot.age / (scanning ? 3 : 1.5))

        if (dot.alpha <= 0) {
          dotsRef.current.splice(i, 1)
          continue
        }

        // Check if sweep is near the dot
        const dotAngle = Math.atan2(dot.y - cy, dot.x - cx)
        let angleDiff = angleRef.current - dotAngle
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2
        const glow = Math.abs(angleDiff) < 0.3 ? 1.2 : 0.6

        ctx.beginPath()
        ctx.arc(dot.x, dot.y, 1.8 * glow, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(16, 185, 129, ${dot.alpha * glow * 0.8})`
        ctx.fill()
      }

      // Center dot
      ctx.beginPath()
      ctx.arc(cx, cy, 2.5, 0, Math.PI * 2)
      ctx.fillStyle = scanning ? 'rgba(16, 185, 129, 0.9)' : 'rgba(16, 185, 129, 0.4)'
      ctx.fill()

      if (scanning) {
        ctx.beginPath()
        ctx.arc(cx, cy, 4, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)'
        ctx.lineWidth = 1
        ctx.stroke()
      }

      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animRef.current)
  }, [scanning, size])

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      className="flex-shrink-0"
    />
  )
}
