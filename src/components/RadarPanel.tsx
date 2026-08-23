import { useEffect, useRef } from 'react'
import type { SignalSetup } from '@/lib/tradingEngine'

interface RadarPanelProps {
  scanning: boolean
  signals: SignalSetup[]
  scannedCount: number
  totalSymbols: number
  scanProgress: number
}

export default function RadarPanel({ scanning, signals, scannedCount, totalSymbols, scanProgress }: RadarPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const angleRef = useRef(0)
  const scanAngleRef = useRef(0)
  const fadeRef = useRef(1)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      const rect = canvas.parentElement!.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.scale(dpr, dpr)
    }
    resize()
    window.addEventListener('resize', resize)

    let lastTime = 0
    function draw(time: number) {
      const dt = lastTime ? (time - lastTime) / 1000 : 0.016
      lastTime = time

      const w = canvas.width / (window.devicePixelRatio || 1)
      const h = canvas.height / (window.devicePixelRatio || 1)
      const cx = w / 2
      const cy = h / 2
      const maxR = Math.min(cx, cy) - 20

      ctx.clearRect(0, 0, w, h)

      // Background gradient (subtle radial)
      const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR)
      bgGrad.addColorStop(0, 'rgba(16, 185, 129, 0.02)')
      bgGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, w, h)

      // Concentric rings
      for (let i = 1; i <= 5; i++) {
        const rr = (maxR / 5) * i
        ctx.beginPath()
        ctx.arc(cx, cy, rr, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(16, 185, 129, ${0.04 + i * 0.015})`
        ctx.lineWidth = 0.5
        ctx.stroke()
      }

      // Cross-hairs
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.06)'
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.moveTo(cx, cy - maxR)
      ctx.lineTo(cx, cy + maxR)
      ctx.moveTo(cx - maxR, cy)
      ctx.lineTo(cx + maxR, cy)
      ctx.stroke()

      // Diagonal lines
      ctx.beginPath()
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
        ctx.moveTo(cx, cy)
        ctx.lineTo(cx + Math.cos(a) * maxR, cy + Math.sin(a) * maxR)
      }
      ctx.stroke()

      // Main sweep beam
      const sweepSpeed = scanning ? 1.8 : 0.3
      angleRef.current += sweepSpeed * dt
      if (angleRef.current > Math.PI * 2) angleRef.current -= Math.PI * 2

      // Sweep glow trail
      const sweepGrad = ctx.createConicGradient(angleRef.current - Math.PI / 2, cx, cy)
      sweepGrad.addColorStop(0, 'rgba(16, 185, 129, 0)')
      sweepGrad.addColorStop(0.03, 'rgba(16, 185, 129, 0.08)')
      sweepGrad.addColorStop(0.12, 'rgba(16, 185, 129, 0.01)')
      sweepGrad.addColorStop(0.15, 'rgba(16, 185, 129, 0)')

      ctx.beginPath()
      ctx.arc(cx, cy, maxR, 0, Math.PI * 2)
      ctx.fillStyle = sweepGrad
      ctx.fill()

      // Sweep leading edge line
      const lx = cx + Math.cos(angleRef.current) * maxR
      const ly = cy + Math.sin(angleRef.current) * maxR
      const lineGrad = ctx.createLinearGradient(cx, cy, lx, ly)
      lineGrad.addColorStop(0, 'rgba(16, 185, 129, 0.0)')
      lineGrad.addColorStop(0.3, 'rgba(16, 185, 129, 0.15)')
      lineGrad.addColorStop(1, 'rgba(16, 185, 129, 0.5)')
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(lx, ly)
      ctx.strokeStyle = lineGrad
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Scan progress arc (when scanning)
      if (scanning) {
        scanAngleRef.current = scanProgress * Math.PI * 2
        ctx.beginPath()
        ctx.arc(cx, cy, maxR + 8, -Math.PI / 2, -Math.PI / 2 + scanAngleRef.current)
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.6)'
        ctx.lineWidth = 3
        ctx.lineCap = 'round'
        ctx.stroke()
        ctx.lineCap = 'butt'
      }

      // Draw signal dots
      const now = Date.now()
      signals.forEach((sig, i) => {
        // Position each signal in a unique spot on the radar
        const angle = ((i * 2.39996) + 0.5) % (Math.PI * 2) // golden angle distribution
        const dist = 0.2 + ((sig.confidence / 100) * 0.65) // closer to center = higher confidence
        const dotX = cx + Math.cos(angle) * maxR * dist
        const dotY = cy + Math.sin(angle) * maxR * dist

        const isLong = sig.direction === 'LONG'
        const baseColor = isLong ? [16, 185, 129] : [239, 68, 68]
        const pulse = 0.7 + 0.3 * Math.sin(now / 800 + i * 1.5)
        const glowSize = sig.confidence >= 80 ? 10 : 6

        // Glow
        const glowGrad = ctx.createRadialGradient(dotX, dotY, 0, dotX, dotY, glowSize * pulse)
        glowGrad.addColorStop(0, `rgba(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]}, ${0.5 * pulse})`)
        glowGrad.addColorStop(1, `rgba(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]}, 0)`)
        ctx.beginPath()
        ctx.arc(dotX, dotY, glowSize * pulse, 0, Math.PI * 2)
        ctx.fillStyle = glowGrad
        ctx.fill()

        // Core dot
        ctx.beginPath()
        ctx.arc(dotX, dotY, sig.confidence >= 80 ? 3.5 : 2.5, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]}, ${0.9 * pulse})`
        ctx.fill()

        // Ring for high confidence
        if (sig.confidence >= 80) {
          ctx.beginPath()
          ctx.arc(dotX, dotY, 7 * pulse, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]}, ${0.25 * pulse})`
          ctx.lineWidth = 1
          ctx.stroke()
        }

        // Label near the dot
        if (sig.confidence >= 75) {
          const labelX = dotX + (dotX > cx ? 8 : -8)
          const labelY = dotY - 8
          ctx.font = '9px monospace'
          ctx.textAlign = dotX > cx ? 'left' : 'right'
          ctx.fillStyle = `rgba(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]}, 0.7)`
          ctx.fillText(sig.symbol, labelX, labelY)
        }
      })

      // Scanning fly-through dots (random ambient particles while scanning)
      if (scanning) {
        for (let i = 0; i < 3; i++) {
          const a = Math.random() * Math.PI * 2
          const d = Math.random() * maxR * 0.9
          const px = cx + Math.cos(a) * d
          const py = cy + Math.sin(a) * d
          ctx.beginPath()
          ctx.arc(px, py, 1, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(16, 185, 129, 0.15)'
          ctx.fill()
        }
      }

      // Center dot
      const centerPulse = scanning ? 0.8 + 0.2 * Math.sin(now / 400) : 0.5
      ctx.beginPath()
      ctx.arc(cx, cy, 3, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(16, 185, 129, ${centerPulse})`
      ctx.fill()

      if (scanning) {
        ctx.beginPath()
        ctx.arc(cx, cy, 6, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(16, 185, 129, ${0.3 * centerPulse})`
        ctx.lineWidth = 1
        ctx.stroke()
      }

      // Stats overlay (top-left)
      ctx.textAlign = 'left'
      ctx.font = '10px monospace'
      ctx.fillStyle = 'rgba(16, 185, 129, 0.5)'
      if (scanning) {
        ctx.fillText(`SCANNING ${scannedCount}/${totalSymbols}`, 12, 18)
      } else {
        ctx.fillText(`${signals.length} SIGNALS DETECTED`, 12, 18)
      }

      // Legend (bottom-right)
      ctx.textAlign = 'right'
      ctx.font = '9px monospace'
      ctx.fillStyle = 'rgba(16, 185, 129, 0.4)'
      ctx.fillText('● LONG', w - 12, h - 24)
      ctx.fillStyle = 'rgba(239, 68, 68, 0.4)'
      ctx.fillText('● SHORT', w - 12, h - 12)

      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [scanning, signals, scannedCount, totalSymbols, scanProgress])

  return (
    <div className="relative w-full h-[280px] md:h-[320px] bg-[#080c14] rounded-2xl border border-gray-800/40 overflow-hidden mb-5">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      {/* Overlay corner decorations */}
      <div className="absolute top-3 right-3 flex items-center gap-2">
        {scanning && (
          <span className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[9px] text-emerald-400 font-medium">LIVE</span>
          </span>
        )}
      </div>
      {/* Gradient fade edges */}
      <div className="absolute inset-0 pointer-events-none rounded-2xl" style={{
        boxShadow: 'inset 0 0 60px rgba(8, 12, 20, 0.6)'
      }} />
    </div>
  )
}
