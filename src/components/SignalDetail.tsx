import { useState } from 'react'
import {
  TrendingUp, TrendingDown, X, Copy, Check, Clock, AlertTriangle,
  BarChart3, Activity, Brain, Shield, Target, ChevronDown, ChevronUp
} from 'lucide-react'
import { cn } from '@/lib/cn'
import type { SignalSetup } from '@/lib/tradingEngine'

function fmt(p: number) {
  if (p >= 1000) return p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (p >= 1) return p.toFixed(2)
  if (p >= 0.01) return p.toFixed(4)
  return p.toFixed(6)
}

function Section({ title, icon, children, defaultOpen = false }: { title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-gray-700/40 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-3 hover:bg-gray-800/30 transition-colors">
        <div className="flex items-center gap-2">{icon}<span className="text-xs font-semibold text-white">{title}</span></div>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-gray-500" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-500" />}
      </button>
      {open && <div className="px-3 pb-3 space-y-2 border-t border-gray-700/30 pt-2 text-xs text-gray-400 leading-relaxed">{children}</div>}
    </div>
  )
}

export default function SignalDetail({ signal, onClose }: { signal: SignalSetup; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const { technical: t, structure: s } = signal

  const copySignal = () => {
    const text = [
      `📈 ${signal.symbol} ${signal.direction} ${signal.timeframe} | Confidence: ${signal.confidence}%`,
      `Entry: $${fmt(signal.entryPrice)} | SL: $${fmt(signal.stopLoss)}`,
      `TP1: $${fmt(signal.tp1)} | TP2: $${fmt(signal.tp2)} | TP3: $${fmt(signal.tp3)}`,
      `R:R: 1:${signal.riskReward.toFixed(1)} | Duration: ${signal.estimatedDuration}`,
      ``,
      `REASON: ${signal.reason}`,
      `TREND: ${signal.trendSummary}`,
      `INDICATORS: ${signal.indicatorSummary}`,
      `STRUCTURE: ${signal.marketStructureSummary}`,
      `RISK: ${signal.riskSummary}`,
    ].join('\n')
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-[#0d1220] rounded-2xl border border-gray-700/50 w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={cn("p-4 border-b", signal.direction === 'LONG' ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20")}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-gray-300">{signal.symbol}</span>
                <span className={cn("text-xl font-bold", signal.direction === 'LONG' ? "text-emerald-400" : "text-red-400")}>
                  {signal.direction === 'LONG' ? '🟢' : '🔴'} {signal.direction}
                </span>
                <span className={cn("px-2 py-0.5 rounded-full text-xs font-bold border",
                  signal.confidence >= 90 ? "text-emerald-400 bg-emerald-500/20 border-emerald-500/30" :
                  "text-amber-400 bg-amber-500/20 border-amber-500/30"
                )}>{signal.confidence}%</span>
              </div>
              <div className="flex items-center gap-4 mt-1 text-[10px] text-gray-500">
                <span>Timeframe: {signal.timeframe}</span>
                <span>Est: {signal.estimatedDuration}</span>
                {signal.fundingRate !== null && <span>Funding: {(signal.fundingRate * 100).toFixed(4)}%</span>}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={copySignal} className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {/* Levels */}
          <div className={cn("p-3 rounded-xl border", signal.direction === 'LONG' ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20")}>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
              <div><p className="text-[9px] text-gray-500">ENTRY</p><p className="font-mono font-bold text-white">${fmt(signal.entryPrice)}</p></div>
              <div><p className="text-[9px] text-gray-500">STOP LOSS</p><p className="font-mono font-bold text-red-400">${fmt(signal.stopLoss)}</p></div>
              <div><p className="text-[9px] text-gray-500">TP1</p><p className="font-mono font-bold text-emerald-400">${fmt(signal.tp1)}</p></div>
              <div><p className="text-[9px] text-gray-500">TP2</p><p className="font-mono font-bold text-emerald-400">${fmt(signal.tp2)}</p></div>
              <div><p className="text-[9px] text-gray-500">TP3</p><p className="font-mono font-bold text-emerald-400">${fmt(signal.tp3)}</p></div>
            </div>
            <div className="mt-2 pt-2 border-t border-gray-700/30 grid grid-cols-2 gap-3 text-center text-xs">
              <div><p className="text-[9px] text-gray-500">RISK:REWARD</p><p className="font-bold text-amber-400">1:{signal.riskReward.toFixed(1)}</p></div>
              <div><p className="text-[9px] text-gray-500">DURATION</p><p className="font-bold text-blue-400">{signal.estimatedDuration}</p></div>
            </div>
          </div>

          {/* Reason */}
          <div className="p-3 bg-gray-800/30 rounded-xl border border-gray-700/40">
            <h3 className="text-[10px] font-semibold text-amber-400 mb-1 flex items-center gap-1.5"><Target className="w-3 h-3" />WHY THIS TRADE</h3>
            <p className="text-xs text-gray-300 leading-relaxed">{signal.reason}</p>
          </div>

          {/* Indicator Summary */}
          <Section title="Trend Summary" icon={<BarChart3 className="w-3.5 h-3.5 text-violet-400" />} defaultOpen>
            <p>{signal.trendSummary}</p>
            <div className="grid grid-cols-3 gap-2 mt-2 text-center">
              <div className="p-2 bg-gray-800/30 rounded-lg"><p className="text-[9px] text-gray-500">EMA9</p><p className={cn("font-mono font-bold text-xs", t.ema9 > t.ema21 ? "text-emerald-400" : "text-red-400")}>${fmt(t.ema9)}</p></div>
              <div className="p-2 bg-gray-800/30 rounded-lg"><p className="text-[9px] text-gray-500">EMA21</p><p className="font-mono font-bold text-xs text-gray-300">${fmt(t.ema21)}</p></div>
              <div className="p-2 bg-gray-800/30 rounded-lg"><p className="text-[9px] text-gray-500">EMA50</p><p className="font-mono font-bold text-xs text-gray-300">${fmt(t.ema50)}</p></div>
            </div>
          </Section>

          <Section title="Indicator Summary" icon={<Activity className="w-3.5 h-3.5 text-blue-400" />}>
            <p>{signal.indicatorSummary}</p>
            <div className="grid grid-cols-3 gap-2 mt-2 text-center">
              <div className="p-2 bg-gray-800/30 rounded-lg"><p className="text-[9px] text-gray-500">RSI</p><p className={cn("font-mono font-bold text-xs", t.rsi > 70 ? "text-red-400" : t.rsi < 30 ? "text-emerald-400" : "text-gray-300")}>{t.rsi.toFixed(1)}</p></div>
              <div className="p-2 bg-gray-800/30 rounded-lg"><p className="text-[9px] text-gray-500">MACD</p><p className={cn("font-mono font-bold text-xs", t.macd.histogram > 0 ? "text-emerald-400" : "text-red-400")}>{t.macd.histogram > 0 ? '↑' : '↓'}</p></div>
              <div className="p-2 bg-gray-800/30 rounded-lg"><p className="text-[9px] text-gray-500">ADX</p><p className={cn("font-mono font-bold text-xs", t.adx > 25 ? "text-amber-400" : "text-gray-400")}>{t.adx.toFixed(1)}</p></div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2 text-center">
              <div className="p-2 bg-gray-800/30 rounded-lg"><p className="text-[9px] text-gray-500">STOCH RSI</p><p className="font-mono font-bold text-xs text-gray-300">{t.stochRsi.k.toFixed(1)}</p></div>
              <div className="p-2 bg-gray-800/30 rounded-lg"><p className="text-[9px] text-gray-500">VWAP</p><p className="font-mono font-bold text-xs text-gray-300">${fmt(t.vwap)}</p></div>
              <div className="p-2 bg-gray-800/30 rounded-lg"><p className="text-[9px] text-gray-500">BB</p><p className={cn("font-mono font-bold text-xs", t.bbands.squeeze ? "text-amber-400" : "text-gray-400")}>{t.bbands.squeeze ? 'Squeeze' : 'Normal'}</p></div>
            </div>
          </Section>

          <Section title="Market Structure" icon={<Brain className="w-3.5 h-3.5 text-emerald-400" />}>
            <p>{signal.marketStructureSummary}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {s.bos && <span className="px-2 py-0.5 bg-violet-500/20 text-violet-400 rounded-full text-[10px] font-medium">BOS {s.bos}</span>}
              {s.choch && <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full text-[10px] font-medium">CHOCH {s.choch}</span>}
              {s.orderBlock && <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full text-[10px] font-medium">OB {s.orderBlock.type} @ {fmt(s.orderBlock.price)}</span>}
              {s.fvg && <span className="px-2 py-0.5 bg-pink-500/20 text-pink-400 rounded-full text-[10px] font-medium">FVG {s.fvg.type}</span>}
              {s.higherHighs && <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full text-[10px]">HH</span>}
              {s.higherLows && <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full text-[10px]">HL</span>}
              {s.lowerHighs && <span className="px-2 py-0.5 bg-red-500/10 text-red-400 rounded-full text-[10px]">LH</span>}
              {s.lowerLows && <span className="px-2 py-0.5 bg-red-500/10 text-red-400 rounded-full text-[10px]">LL</span>}
            </div>
          </Section>

          <Section title="Risk Summary" icon={<Shield className="w-3.5 h-3.5 text-amber-400" />}>
            <p>{signal.riskSummary}</p>
          </Section>

          {/* Disclaimer */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-[10px] text-amber-400/70 leading-relaxed">
                AI-generated trading signal for informational purposes only. Always do your own research and use proper risk management. Never risk more than you can afford to lose.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
