import { useState, useEffect, useCallback, useRef } from 'react'
import {
  TrendingUp, TrendingDown, Zap, RefreshCw, Loader2,
  AlertCircle, Search, Radar, BarChart3, X, AlertTriangle,
  CheckCircle, XCircle, Info
} from 'lucide-react'
import { cn } from '@/lib/cn'
import {
  fetchFuturesTickerData, fetchKlines, fetchFunding,
  computeIndicators, analyzeMarketStructure, generateSignal,
  type FuturesTicker, type SignalSetup, type Candle, type FundingData
} from '@/lib/tradingEngine'
import SignalDetail from './SignalDetail'
import RadarPanel from './RadarPanel'

function fmt(p: number) {
  if (p >= 1000) return p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (p >= 1) return p.toFixed(2)
  if (p >= 0.01) return p.toFixed(4)
  return p.toFixed(6)
}

function fmtVol(v: number) {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`
  return `$${v.toFixed(0)}`
}

interface Diagnostics {
  tickersFetched: number
  candidatesTotal: number
  klinesOk: number
  klinesFailed: number
  analyzed: number
  rejectedNoCandles: number
  rejectedNoDirection: number
  rejectedNoScore: number
  passedLow: number
  passedHigh: number
  finalSignals: number
  errors: string[]
}

const emptyDiag = (): Diagnostics => ({
  tickersFetched: 0, candidatesTotal: 0, klinesOk: 0, klinesFailed: 0,
  analyzed: 0, rejectedNoCandles: 0, rejectedNoDirection: 0, rejectedNoScore: 0,
  passedLow: 0, passedHigh: 0, finalSignals: 0, errors: [],
})

export default function CryptoPilotDashboard() {
  const [allSignals, setAllSignals] = useState<SignalSetup[]>([])
  const [allTickers, setAllTickers] = useState<FuturesTicker[]>([])
  const [scanning, setScanning] = useState(false)
  const [scannedCount, setScannedCount] = useState(0)
  const [totalSymbols, setTotalSymbols] = useState(0)
  const [lastScan, setLastScan] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedSignal, setSelectedSignal] = useState<SignalSetup | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [directionFilter, setDirectionFilter] = useState<'all' | 'LONG' | 'SHORT'>('all')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [scanComplete, setScanComplete] = useState(false)
  const [diag, setDiag] = useState<Diagnostics>(emptyDiag())
  const [showDiag, setShowDiag] = useState(false)
  const scanRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const scanningRef = useRef(false)

  const runScanner = useCallback(async () => {
    if (scanningRef.current) return
    scanningRef.current = true
    setScanning(true)
    setError(null)
    const d = emptyDiag()

    try {
      setScannedCount(0)

      // STAGE 1: Fetch tickers
      const tickers = await fetchFuturesTickerData()
      d.tickersFetched = tickers.length
      setAllTickers(tickers)
      setTotalSymbols(tickers.length)

      const candidates = tickers.slice(0, 30)
      d.candidatesTotal = candidates.length
      const foundSignals: SignalSetup[] = []

      // STAGE 2-6: Analyze each candidate
      for (let i = 0; i < candidates.length; i++) {
        setScannedCount(i + 1)
        const sym = candidates[i]

        // STAGE 3: Fetch candle data
        let candles1h: Candle[] = []
        let candles4h: Candle[] = []
        let fundingData: FundingData | null = null

        try {
          candles1h = await fetchKlines(sym.symbol, '1H', 300)
        } catch (err: any) {
          d.klinesFailed++
          d.errors.push(`${sym.symbol} 1H: ${err.message}`)
          continue
        }
        d.klinesOk++

        try { candles4h = await fetchKlines(sym.symbol, '4H', 200) } catch { /* optional */ }
        try { fundingData = await fetchFunding(sym.symbol) } catch { /* optional */ }

        // STAGE 4: Validate candle data
        if (candles1h.length < 50) {
          d.rejectedNoCandles++
          continue
        }

        // STAGE 5-6: Run technical analysis and generate signal
        let signal: SignalSetup | null = null
        try {
          const ind1h = computeIndicators(candles1h)
          const struct1h = analyzeMarketStructure(candles1h)
          signal = generateSignal(sym, candles1h, ind1h, struct1h, fundingData)
        } catch (err: any) {
          d.errors.push(`${sym.symbol} analysis: ${err.message}`)
          continue
        }

        if (!signal) {
          d.rejectedNoDirection++
          continue
        }

        // 4H confluence bonus
        if (candles4h && candles4h.length >= 50) {
          const struct4h = analyzeMarketStructure(candles4h)
          const aligned4h = (signal.direction === 'LONG' && (struct4h.trend === 'Bullish' || struct4h.trend === 'Strong Bullish')) ||
                            (signal.direction === 'SHORT' && (struct4h.trend === 'Bearish' || struct4h.trend === 'Strong Bearish'))
          if (aligned4h) signal.confidence = Math.min(98, signal.confidence + 3)
        }

        d.analyzed++
        if (signal.confidence >= 80) { d.passedHigh++ } else { d.passedLow++ }
        foundSignals.push(signal)
        if (i < candidates.length - 1) await new Promise(r => setTimeout(r, 100))
      }

      // STAGE 7: Final output
      foundSignals.sort((a, b) => b.confidence - a.confidence)
      d.finalSignals = foundSignals.length
      setAllSignals(foundSignals)
      setDiag(d)
      setLastScan(new Date())
      setScanComplete(true)
    } catch (err: any) {
      setError(err.message || 'Scanner failed')
      setDiag(d)
    } finally {
      scanningRef.current = false
      setScanning(false)
    }
  }, [])

  useEffect(() => {
    runScanner()
    if (autoRefresh) scanRef.current = setInterval(runScanner, 30000)
    return () => { if (scanRef.current) clearInterval(scanRef.current) }
  }, [autoRefresh, runScanner])

  const filtered = allSignals.filter(s => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const matchesSymbol = s.symbol.toLowerCase().includes(q)
      const matchesDirection = s.direction.toLowerCase().includes(q)
      if (!matchesSymbol && !matchesDirection) return false
    }
    if (directionFilter !== 'all' && s.direction !== directionFilter) return false
    return true
  })

  const highConfidence = filtered.filter(s => s.confidence >= 80)
  const top3 = filtered.slice(0, 3)

  return (
    <div className="min-h-screen bg-[#080c14] text-white">
      {/* Header */}
      <header className="border-b border-gray-800/50 bg-[#0a0f1a]/90 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-5 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Radar className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold flex items-center gap-2">
                  <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">CRYPTOPILOT</span>
                  <span className="text-gray-600 font-normal text-xs">LITE AI</span>
                </h1>
                <div className="flex items-center gap-3 text-[10px] text-gray-500">
                  <span className={cn("flex items-center gap-1", scanning ? "text-emerald-400" : "text-gray-500")}>
                    {scanning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Radar className="w-3 h-3" />}
                    {scanning ? `Scanning ${scannedCount}/${totalSymbols}` : `${totalSymbols} symbols`}
                  </span>
                  {lastScan && <span>Last: {lastScan.toLocaleTimeString()}</span>}
                  <span className="text-gray-700">•</span>
                  <span>OKX Perpetual</span>
                  <span className="text-gray-700">•</span>
                  <span className="text-emerald-400">{highConfidence.length} high</span>
                  <span className="text-gray-600">/</span>
                  <span>{filtered.length} total</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowDiag(!showDiag)}
                className={cn("px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all border",
                  showDiag ? "bg-violet-500/20 text-violet-400 border-violet-500/30" : "bg-[#0d1321] text-gray-500 border-gray-800/50 hover:border-gray-700"
                )}>
                <Info className="w-3 h-3 inline mr-1" />Diag
              </button>
              <label className="flex items-center gap-1.5 text-[10px] text-gray-500 cursor-pointer select-none">
                <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)}
                  className="w-3 h-3 rounded border-gray-600 bg-gray-800 text-emerald-500" />
                Auto
              </label>
              <button onClick={() => runScanner()} disabled={scanning}
                className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  scanning ? "bg-gray-800 text-gray-500 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-500 text-white"
                )}>
                {scanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                {scanning ? 'Scanning...' : 'Scan Now'}
              </button>
            </div>
          </div>
          {scanning && (
            <div className="mt-2 h-0.5 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-300"
                style={{ width: `${totalSymbols > 0 ? (scannedCount / totalSymbols) * 100 : 0}%` }} />
            </div>
          )}
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-5 py-5">
        {/* ── Radar Panel ── */}
        <RadarPanel
          scanning={scanning}
          signals={allSignals}
          scannedCount={scannedCount}
          totalSymbols={totalSymbols}
          scanProgress={totalSymbols > 0 ? scannedCount / totalSymbols : 0}
        />

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-xs text-red-400 flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 text-xs hover:text-red-300">dismiss</button>
          </div>
        )}

        {/* ── Diagnostics Panel ── */}
        {showDiag && (
          <div className="mb-5 bg-[#0d1321] rounded-2xl border border-violet-500/20 p-4">
            <h3 className="text-xs font-semibold text-violet-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Info className="w-4 h-4" /> Pipeline Diagnostics
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <DiagStat label="Tickers Fetched" value={diag.tickersFetched} />
              <DiagStat label="Candidates Scanned" value={diag.candidatesTotal} />
              <DiagStat label="Klines OK" value={diag.klinesOk} ok />
              <DiagStat label="Klines Failed" value={diag.klinesFailed} warn={diag.klinesFailed > 0} />
              <DiagStat label="Fully Analyzed" value={diag.analyzed} />
              <DiagStat label="Rejected: No Candles" value={diag.rejectedNoCandles} warn={diag.rejectedNoCandles > 0} />
              <DiagStat label="Rejected: No Direction" value={diag.rejectedNoDirection} warn={diag.rejectedNoDirection > 0} />
              <DiagStat label="Rejected: No Score" value={diag.rejectedNoScore} warn={diag.rejectedNoScore > 0} />
              <DiagStat label="Passed (< 80%)" value={diag.passedLow} />
              <DiagStat label="Passed (≥ 80%)" value={diag.passedHigh} ok={diag.passedHigh > 0} />
              <DiagStat label="Final Signals" value={diag.finalSignals} ok={diag.finalSignals > 0} />
            </div>
            {diag.errors.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-700/30">
                <p className="text-[10px] text-gray-500 mb-1">Last errors (up to 5):</p>
                {diag.errors.slice(0, 5).map((e, i) => (
                  <p key={i} className="text-[10px] text-red-400/70 font-mono">{e}</p>
                ))}
              </div>
            )}
            {diag.finalSignals === 0 && diag.analyzed > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-700/30">
                <p className="text-[10px] text-amber-400">
                  Pipeline ran successfully on {diag.analyzed} symbols but scored all below minimum viable threshold.
                  This typically means: ADX too low (ranging market), EMAs flat (no clear trend), or conflicting indicator confirmations.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Market Status Bar */}
        {allTickers.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
            {allTickers.slice(0, 5).map(t => {
              const change = t.open24h > 0 ? ((t.price - t.open24h) / t.open24h) * 100 : 0
              return (
                <div key={t.instId} className="bg-[#0d1321] rounded-xl border border-gray-800/40 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-gray-400">{t.symbol}</span>
                    <span className={cn("text-[10px] font-medium flex items-center gap-0.5", change >= 0 ? "text-emerald-400" : "text-red-400")}>
                      {change >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                      {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                    </span>
                  </div>
                  <p className="font-mono font-bold text-sm text-white mt-1">${fmt(t.price)}</p>
                  <p className="text-[9px] text-gray-600 mt-0.5">Vol {fmtVol(t.volCcy24h)}</p>
                </div>
              )
            })}
          </div>
        )}

        {/* ━━━ SCANNING STATE ━━━ */}
        {scanning && !scanComplete && (
          <div className="text-center py-16">
            <Loader2 className="w-12 h-12 text-emerald-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-300 text-sm font-medium">Scanner is running. No validated opportunities found yet.</p>
            <p className="text-gray-600 text-xs mt-1">Analyzing {scannedCount}/{totalSymbols} perpetual futures...</p>
          </div>
        )}

        {/* ━━━ EMPTY STATE ━━━ */}
        {!scanning && scanComplete && filtered.length === 0 && (
          <div className="text-center py-16 bg-[#0d1321] rounded-2xl border border-gray-800/40">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gray-800/50 flex items-center justify-center mb-4">
              <Radar className="w-8 h-8 text-gray-600" />
            </div>
            {(searchQuery || directionFilter !== 'all') && allSignals.length > 0 ? (
              <>
                <p className="text-gray-300 text-sm font-medium mb-1">No signals match your filters</p>
                <p className="text-gray-500 text-xs max-w-md mx-auto">
                  {allSignals.length} signal{allSignals.length !== 1 ? 's' : ''} found. Try adjusting your search or direction filter.
                </p>
              </>
            ) : (
              <>
                <p className="text-gray-300 text-sm font-medium mb-1">No validated opportunities found yet</p>
                <p className="text-gray-500 text-xs max-w-md mx-auto">
                  Scanned {diag.klinesOk + diag.klinesFailed} symbols. {diag.klinesFailed > 0 && `${diag.klinesFailed} had data errors. `}
                  {diag.rejectedNoCandles > 0 && `${diag.rejectedNoCandles} had insufficient data. `}
                  {diag.rejectedNoDirection > 0 && `${diag.rejectedNoDirection} had conflicting indicators. `}
                  Scanning automatically every 30 seconds.
                </p>
              </>
            )}
            {(searchQuery || directionFilter !== 'all') && (
              <button onClick={() => { setDirectionFilter('all'); setSearchQuery('') }}
                className="mt-4 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs text-gray-400 hover:text-white transition-colors">
                Clear Filters
              </button>
            )}
          </div>
        )}

        {/* ━━━ SIGNALS EXIST ━━━ */}
        {filtered.length > 0 && (
          <>
            {highConfidence.length > 0 && (
              <div className="mb-6">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  High Confidence Signals (80%+)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {highConfidence.slice(0, 6).map((signal, idx) => (
                    <SignalCard key={idx} signal={signal} rank={idx} onClick={() => setSelectedSignal(signal)} />
                  ))}
                </div>
              </div>
            )}

            <div className="mb-6">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-amber-400" />
                {highConfidence.length > 0 ? 'All Active Setups' : 'Top 3 Opportunities'}
              </h2>
              {highConfidence.length === 0 && (
                <div className="mb-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-400">
                    <span className="font-semibold">No High Confidence setups available.</span> Showing the strongest current opportunities.
                  </p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {top3.map((signal, idx) => (
                  <SignalCard key={idx} signal={signal} rank={idx} onClick={() => setSelectedSignal(signal)} />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input type="text" placeholder="Search symbol or direction..."
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-[#0d1321] border border-gray-800/50 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-gray-700"
                />
                {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="w-3 h-3 text-gray-500" /></button>}
              </div>
              <div className="flex gap-1">
                {(['all', 'LONG', 'SHORT'] as const).map(f => (
                  <button key={f} onClick={() => setDirectionFilter(f)}
                    className={cn("px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all border",
                      directionFilter === f
                        ? f === 'LONG' ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                        : f === 'SHORT' ? "bg-red-500/20 text-red-400 border-red-500/30"
                        : "bg-gray-700/50 text-white border-gray-600"
                        : "bg-[#0d1321] text-gray-500 border-gray-800/50 hover:border-gray-700"
                    )}>
                    {f === 'all' ? 'All' : f}
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-gray-600 ml-auto">{filtered.length} signals</span>
            </div>

            <div className="bg-[#0d1321] rounded-2xl border border-gray-800/40 overflow-hidden">
              <div className="grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-gray-800/30 text-[9px] text-gray-500 uppercase tracking-wider font-medium">
                <div className="col-span-1">Symbol</div>
                <div className="col-span-2">Direction</div>
                <div className="col-span-1">Conf.</div>
                <div className="col-span-2">Entry</div>
                <div className="col-span-1">SL</div>
                <div className="col-span-1">TP2</div>
                <div className="col-span-1">R:R</div>
                <div className="col-span-1">Time</div>
                <div className="col-span-2">Reason</div>
              </div>
              {filtered.map((signal, idx) => (
                <div key={idx} onClick={() => setSelectedSignal(signal)}
                  className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-gray-800/20 hover:bg-gray-800/20 cursor-pointer transition-colors items-center">
                  <div className="col-span-1 text-xs font-semibold text-gray-300">{signal.symbol}</div>
                  <div className="col-span-2 flex items-center gap-2">
                    <span className={cn("text-xs font-bold", signal.direction === 'LONG' ? "text-emerald-400" : "text-red-400")}>
                      {signal.direction === 'LONG' ? '🟢' : '🔴'} {signal.direction}
                    </span>
                    {signal.confidence < 80 && <span className="text-[8px] text-amber-400 bg-amber-500/10 px-1 rounded">BELOW</span>}
                  </div>
                  <div className="col-span-1">
                    <span className={cn("text-xs font-bold",
                      signal.confidence >= 95 ? "text-emerald-400" : signal.confidence >= 80 ? "text-cyan-400" : "text-amber-400"
                    )}>{signal.confidence}%</span>
                  </div>
                  <div className="col-span-2 font-mono text-xs text-white">${fmt(signal.entryPrice)}</div>
                  <div className="col-span-1 font-mono text-xs text-red-400">${fmt(signal.stopLoss)}</div>
                  <div className="col-span-1 font-mono text-xs text-emerald-400">${fmt(signal.tp2)}</div>
                  <div className="col-span-1 font-mono text-xs text-amber-400">1:{signal.riskReward.toFixed(1)}</div>
                  <div className="col-span-1 text-[10px] text-gray-500">{signal.timeframe}</div>
                  <div className="col-span-2 text-[10px] text-gray-500 truncate">{signal.reason}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {scanning && scanComplete && (
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-500">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
            Re-scanning... {scannedCount}/{totalSymbols}
          </div>
        )}
      </main>

      {selectedSignal && <SignalDetail signal={selectedSignal} onClose={() => setSelectedSignal(null)} />}
    </div>
  )
}

function DiagStat({ label, value, ok, warn }: { label: string; value: number; ok?: boolean; warn?: boolean }) {
  return (
    <div className={cn("p-2.5 rounded-lg border text-center",
      ok ? "bg-emerald-500/5 border-emerald-500/20" :
      warn ? "bg-red-500/5 border-red-500/20" :
      "bg-gray-800/30 border-gray-700/30"
    )}>
      <p className="text-[9px] text-gray-500 mb-0.5">{label}</p>
      <p className={cn("text-sm font-bold",
        ok ? "text-emerald-400" : warn ? "text-red-400" : "text-gray-300"
      )}>{value}</p>
    </div>
  )
}

function SignalCard({ signal, rank, onClick }: { signal: SignalSetup; rank: number; onClick: () => void }) {
  const medals = ['🥇', '🥈', '🥉']
  const isHighConf = signal.confidence >= 80
  return (
    <div onClick={onClick}
      className={cn(
        "rounded-2xl border p-4 cursor-pointer transition-all hover:scale-[1.01]",
        signal.direction === 'LONG'
          ? "bg-gradient-to-br from-emerald-500/5 to-emerald-500/[0.02] border-emerald-500/20 hover:border-emerald-500/40"
          : "bg-gradient-to-br from-red-500/5 to-red-500/[0.02] border-red-500/20 hover:border-red-500/40"
      )}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {rank < 3 && <span className="text-lg">{medals[rank]}</span>}
          <span className="text-xs font-bold text-gray-300">{signal.symbol}</span>
          <span className="text-gray-600 text-xs">{signal.timeframe}</span>
          {!isHighConf && <span className="text-[9px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded font-medium">BELOW 80%</span>}
        </div>
        <span className={cn(
          "px-2.5 py-0.5 rounded-full text-xs font-bold border",
          signal.confidence >= 95 ? "text-emerald-400 bg-emerald-500/20 border-emerald-500/30" :
          signal.confidence >= 80 ? "text-cyan-400 bg-cyan-500/20 border-cyan-500/30" :
          "text-amber-400 bg-amber-500/20 border-amber-500/30"
        )}>{signal.confidence}%</span>
      </div>
      <div className="flex items-baseline gap-2 mb-2">
        <span className={cn("text-lg font-bold", signal.direction === 'LONG' ? "text-emerald-400" : "text-red-400")}>
          {signal.direction === 'LONG' ? '🟢' : '🔴'} {signal.direction}
        </span>
        <span className="text-gray-400 text-xs">R:R 1:{signal.riskReward.toFixed(1)}</span>
      </div>
      <p className="text-[11px] text-gray-400 leading-relaxed line-clamp-2 mb-3">{signal.reason}</p>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-1.5 bg-gray-800/30 rounded-lg">
          <p className="text-[8px] text-gray-500">ENTRY</p>
          <p className="font-mono text-[11px] font-bold text-white">${fmt(signal.entryPrice)}</p>
        </div>
        <div className="p-1.5 bg-emerald-500/5 rounded-lg">
          <p className="text-[8px] text-emerald-400">TP2</p>
          <p className="font-mono text-[11px] font-bold text-emerald-400">${fmt(signal.tp2)}</p>
        </div>
        <div className="p-1.5 bg-red-500/5 rounded-lg">
          <p className="text-[8px] text-red-400">SL</p>
          <p className="font-mono text-[11px] font-bold text-red-400">${fmt(signal.stopLoss)}</p>
        </div>
      </div>
    </div>
  )
}
