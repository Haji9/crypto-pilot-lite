// CryptoPilot Lite AI — Technical Analysis Engine
// Full institutional-grade analysis with 15+ indicators

export interface Candle {
  ts: number; open: number; high: number; low: number; close: number; vol: number; volCcy: number
}

export interface FuturesTicker {
  symbol: string; instId: string; price: number; open24h: number; high24h: number; low24h: number
  volCcy24h: number; vol24h: number; bidPx: number; askPx: number; ts: string
}

export interface FundingData { instId: string; fundingRate: number; nextFundingRate: number | null; nextFundingTime: string }

export interface TechnicalIndicators {
  ema9: number; ema21: number; ema50: number; ema200: number
  rsi: number; rsiDivergence: string
  macd: { macd: number; signal: number; histogram: number }
  bbands: { upper: number; middle: number; lower: number; squeeze: boolean }
  stochRsi: { k: number; d: number }
  atr: number; atrPct: number
  adx: number; plusDI: number; minusDI: number
  vwap: number
  ichimoku: { tenkan: number; kijun: number; senkouA: number; senkouB: number; chikou: number }
  obv: number; obvTrend: 'up' | 'down'
  volumeRatio: number
  supportLevels: number[]
  resistanceLevels: number[]
}

export interface MarketStructure {
  trend: 'Strong Bullish' | 'Bullish' | 'Neutral' | 'Bearish' | 'Strong Bearish'
  bos: 'bullish' | 'bearish' | null
  choch: 'bullish' | 'bearish' | null
  swingHighs: number[]; swingLows: number[]
  higherHighs: boolean; higherLows: boolean; lowerHighs: boolean; lowerLows: boolean
  orderBlock: { type: 'bullish' | 'bearish'; price: number } | null
  fvg: { type: 'bullish' | 'bearish'; top: number; bottom: number } | null
  liquidityZone: { type: 'buy' | 'sell'; price: number } | null
}

export interface SignalSetup {
  symbol: string
  direction: 'LONG' | 'SHORT'
  confidence: number
  entryPrice: number; stopLoss: number; tp1: number; tp2: number; tp3: number
  riskReward: number; timeframe: string; estimatedDuration: string
  reason: string; trendSummary: string; indicatorSummary: string
  marketStructureSummary: string; riskSummary: string
  technical: TechnicalIndicators; structure: MarketStructure; fundingRate: number | null
}

// ─── Data Fetching ───────────────────────────────────────────

export async function fetchFuturesTickerData(): Promise<FuturesTicker[]> {
  const res = await fetch('/api/futures/tickers')
  if (!res.ok) throw new Error(`Tickers: ${res.status}`)
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data.tickers || []
}

export async function fetchKlines(symbol: string, bar: string = '1H', limit: number = 300): Promise<Candle[]> {
  const res = await fetch(`/api/futures/klines?symbol=${encodeURIComponent(symbol)}&bar=${bar}&limit=${limit}`)
  if (!res.ok) throw new Error(`Klines: ${res.status}`)
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data.candles || []
}

export async function fetchFunding(symbol: string): Promise<FundingData | null> {
  try {
    const res = await fetch(`/api/futures/funding?symbol=${encodeURIComponent(symbol)}`)
    if (!res.ok) return null
    const data = await res.json()
    return data.error ? null : data
  } catch { return null }
}

// ─── Indicator Calculations ─────────────────────────────────

function ema(data: number[], period: number): number[] {
  if (data.length === 0) return []
  const k = 2 / (period + 1)
  const result = [data[0]]
  for (let i = 1; i < data.length; i++) result.push(data[i] * k + result[i - 1] * (1 - k))
  return result
}

function sma(data: number[], period: number): number {
  const s = data.slice(-period)
  return s.reduce((a, b) => a + b, 0) / s.length
}

function calcRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50
  let gains = 0, losses = 0
  for (let i = closes.length - period; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1]
    if (d > 0) gains += d; else losses -= d
  }
  if (losses === 0) return 100
  return 100 - 100 / (1 + gains / losses)
}

function calcRSISeries(closes: number[], period = 14): number[] {
  const result: number[] = []
  for (let i = period + 1; i <= closes.length; i++) {
    let g = 0, l = 0
    for (let j = i - period; j < i; j++) {
      const d = closes[j] - closes[j - 1]
      if (d > 0) g += d; else l -= d
    }
    result.push(l === 0 ? 100 : 100 - 100 / (1 + g / l))
  }
  return result
}

function calcStochRSI(closes: number[], rsiPeriod = 14, stochPeriod = 14, kSmooth = 3): { k: number; d: number } {
  const rsiSeries = calcRSISeries(closes, rsiPeriod)
  if (rsiSeries.length < stochPeriod + kSmooth) return { k: 50, d: 50 }
  const stochK: number[] = []
  for (let i = stochPeriod - 1; i < rsiSeries.length; i++) {
    const window = rsiSeries.slice(i - stochPeriod + 1, i + 1)
    const min = Math.min(...window), max = Math.max(...window)
    stochK.push(max === min ? 50 : ((rsiSeries[i] - min) / (max - min)) * 100)
  }
  const k = sma(stochK, kSmooth)
  const d = sma(stochK.slice(-kSmooth), kSmooth)
  return { k, d }
}

function calcMACD(closes: number[]) {
  const ema12 = ema(closes, 12), ema26 = ema(closes, 26)
  const macdLine = ema12.map((v, i) => v - (ema26[i] || v))
  const signalLine = ema(macdLine, 9)
  const last = macdLine[macdLine.length - 1] || 0
  const sig = signalLine[signalLine.length - 1] || 0
  return { macd: last, signal: sig, histogram: last - sig }
}

function calcBBands(closes: number[], period = 20, mult = 2) {
  const mid = sma(closes, period)
  const slice = closes.slice(-period)
  const variance = slice.reduce((s, p) => s + (p - mid) ** 2, 0) / period
  const std = Math.sqrt(variance)
  const upper = mid + mult * std, lower = mid - mult * std
  const range = upper - lower
  const squeeze = range / mid < 0.015
  return { upper, middle: mid, lower, squeeze }
}

function calcATR(candles: Candle[], period = 14): number {
  if (candles.length < period + 1) return candles[0]?.high - candles[0]?.low || 0
  let sum = 0
  for (let i = candles.length - period; i < candles.length; i++) {
    const tr = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close)
    )
    sum += tr
  }
  return sum / period
}

function calcADX(candles: Candle[], period = 14): { adx: number; plusDI: number; minusDI: number } {
  if (candles.length < period * 2) return { adx: 25, plusDI: 0, minusDI: 0 }
  const trs: number[] = [], plusDMs: number[] = [], minusDMs: number[] = []
  for (let i = 1; i < candles.length; i++) {
    const tr = Math.max(candles[i].high - candles[i].low, Math.abs(candles[i].high - candles[i - 1].close), Math.abs(candles[i].low - candles[i - 1].close))
    const upMove = candles[i].high - candles[i - 1].high
    const downMove = candles[i - 1].low - candles[i].low
    trs.push(tr)
    plusDMs.push(upMove > downMove && upMove > 0 ? upMove : 0)
    minusDMs.push(downMove > upMove && downMove > 0 ? downMove : 0)
  }
  let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period
  let plusDM = plusDMs.slice(0, period).reduce((a, b) => a + b, 0) / period
  let minusDM = minusDMs.slice(0, period).reduce((a, b) => a + b, 0) / period
  const dxs: number[] = []
  for (let i = period; i < trs.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period
    plusDM = (plusDM * (period - 1) + plusDMs[i]) / period
    minusDM = (minusDM * (period - 1) + minusDMs[i]) / period
    const plusDI = atr > 0 ? (plusDM / atr) * 100 : 0
    const minusDI = atr > 0 ? (minusDM / atr) * 100 : 0
    const dxSum = plusDI + minusDI
    dxs.push(dxSum > 0 ? (Math.abs(plusDI - minusDI) / dxSum) * 100 : 0)
  }
  const adx = dxs.length >= period ? sma(dxs, period) : dxs[dxs.length - 1] || 0
  const lastPlusDI = trs.length > 0 ? (plusDM / atr) * 100 : 0
  const lastMinusDI = trs.length > 0 ? (minusDM / atr) * 100 : 0
  return { adx, plusDI: lastPlusDI, minusDI: lastMinusDI }
}

function calcVWAP(candles: Candle[]): number {
  let cumVol = 0, cumTP = 0
  for (const c of candles) {
    const tp = (c.high + c.low + c.close) / 3
    cumTP += tp * c.vol
    cumVol += c.vol
  }
  return cumVol > 0 ? cumTP / cumVol : candles[candles.length - 1]?.close || 0
}

function calcIchimoku(candles: Candle[]) {
  const high = (arr: Candle[], s: number, e: number) => Math.max(...arr.slice(s, e).map(c => c.high))
  const low = (arr: Candle[], s: number, e: number) => Math.min(...arr.slice(s, e).map(c => c.low))
  const n = candles.length
  const tenkan = n >= 9 ? (high(candles, n - 9, n) + low(candles, n - 9, n)) / 2 : candles[n - 1]?.close || 0
  const kijun = n >= 26 ? (high(candles, n - 26, n) + low(candles, n - 26, n)) / 2 : tenkan
  const senkouA = (tenkan + kijun) / 2
  const senkouB = n >= 52 ? (high(candles, n - 52, n) + low(candles, n - 52, n)) / 2 : senkouA
  const chikou = n >= 26 ? candles[n - 26].close : candles[n - 1]?.close || 0
  return { tenkan, kijun, senkouA, senkouB, chikou }
}

function calcOBV(candles: Candle[]): { obv: number; trend: 'up' | 'down' } {
  let obv = 0
  const values: number[] = [0]
  for (let i = 1; i < candles.length; i++) {
    if (candles[i].close > candles[i - 1].close) obv += candles[i].vol
    else if (candles[i].close < candles[i - 1].close) obv -= candles[i].vol
    values.push(obv)
  }
  const recent = values.slice(-20)
  const trend = recent[recent.length - 1] > recent[0] ? 'up' : 'down'
  return { obv, trend: trend as 'up' | 'down' }
}

function calcSRS(candles: Candle[]): { support: number[]; resistance: number[] } {
  const n = candles.length
  const pivots: { price: number; type: 'high' | 'low' }[] = []
  for (let i = 2; i < n - 2; i++) {
    if (candles[i].high > candles[i - 1].high && candles[i].high > candles[i - 2].high &&
        candles[i].high > candles[i + 1].high && candles[i].high > candles[i + 2].high)
      pivots.push({ price: candles[i].high, type: 'high' })
    if (candles[i].low < candles[i - 1].low && candles[i].low < candles[i - 2].low &&
        candles[i].low < candles[i + 1].low && candles[i].low < candles[i + 2].low)
      pivots.push({ price: candles[i].low, type: 'low' })
  }
  const price = candles[n - 1].close
  const resistance = [...new Set(pivots.filter(p => p.type === 'high' && p.price > price).map(p => p.price))].sort((a, b) => a - b).slice(0, 3)
  const support = [...new Set(pivots.filter(p => p.type === 'low' && p.price < price).map(p => p.price))].sort((a, b) => b - a).slice(0, 3)
  return { support, resistance }
}

export function analyzeMarketStructure(candles: Candle[]): MarketStructure {
  const n = candles.length
  if (n < 52) return {
    trend: 'Neutral', bos: null, choch: null, swingHighs: [], swingLows: [],
    higherHighs: false, higherLows: false, lowerHighs: false, lowerLows: false,
    orderBlock: null, fvg: null, liquidityZone: null
  }

  const swingHighs: number[] = [], swingLows: number[] = []
  for (let i = 3; i < n - 3; i++) {
    if (candles[i].high > candles[i - 1].high && candles[i].high > candles[i - 2].high &&
        candles[i].high > candles[i + 1].high && candles[i].high > candles[i + 2].high)
      swingHighs.push(candles[i].high)
    if (candles[i].low < candles[i - 1].low && candles[i].low < candles[i - 2].low &&
        candles[i].low < candles[i + 1].low && candles[i].low < candles[i + 2].low)
      swingLows.push(candles[i].low)
  }

  const recentHighs = swingHighs.slice(-3), recentLows = swingLows.slice(-3)
  const higherHighs = recentHighs.length >= 2 && recentHighs[recentHighs.length - 1] > recentHighs[recentHighs.length - 2]
  const higherLows = recentLows.length >= 2 && recentLows[recentLows.length - 1] > recentLows[recentLows.length - 2]
  const lowerHighs = recentHighs.length >= 2 && recentHighs[recentHighs.length - 1] < recentHighs[recentHighs.length - 2]
  const lowerLows = recentLows.length >= 2 && recentLows[recentLows.length - 1] < recentLows[recentLows.length - 2]

  let trend: MarketStructure['trend'] = 'Neutral'
  if (higherHighs && higherLows) trend = 'Bullish'
  if (higherHighs && higherLows && candles[n - 1].close > candles[n - 26]?.close) trend = 'Strong Bullish'
  if (lowerHighs && lowerLows) trend = 'Bearish'
  if (lowerHighs && lowerLows && candles[n - 1].close < candles[n - 26]?.close) trend = 'Strong Bearish'

  let bos: 'bullish' | 'bearish' | null = null, choch: 'bullish' | 'bearish' | null = null
  if (swingHighs.length >= 2 && candles[n - 1].close > swingHighs[swingHighs.length - 2]) bos = 'bullish'
  if (swingLows.length >= 2 && candles[n - 1].close < swingLows[swingLows.length - 2]) bos = 'bearish'
  if (trend === 'Bearish' && higherHighs) choch = 'bullish'
  if (trend === 'Bullish' && lowerLows) choch = 'bearish'

  let orderBlock: MarketStructure['orderBlock'] = null
  for (let i = n - 10; i < n - 1; i++) {
    const isBullOB = candles[i].close < candles[i].open && candles[i + 1].close > candles[i + 1].open && (candles[i + 1].close - candles[i + 1].open) > (candles[i].open - candles[i].close) * 2
    const isBearOB = candles[i].close > candles[i].open && candles[i + 1].close < candles[i + 1].open && (candles[i + 1].open - candles[i + 1].close) > (candles[i].close - candles[i].open) * 2
    if (isBullOB) { orderBlock = { type: 'bullish', price: candles[i].low }; break }
    if (isBearOB) { orderBlock = { type: 'bearish', price: candles[i].high }; break }
  }

  let fvg: MarketStructure['fvg'] = null
  for (let i = n - 10; i <= n - 3; i++) {
    if (candles[i + 2].low > candles[i].high) { fvg = { type: 'bullish', top: candles[i + 2].low, bottom: candles[i].high }; break }
    if (candles[i].low > candles[i + 2].high) { fvg = { type: 'bearish', top: candles[i].low, bottom: candles[i + 2].high }; break }
  }

  let liquidityZone: MarketStructure['liquidityZone'] = null
  if (swingHighs.length > 0) {
    const avgHigh = swingHighs.reduce((a, b) => a + b, 0) / swingHighs.length
    if (Math.abs(avgHigh - candles[n - 1].close) / candles[n - 1].close < 0.02) liquidityZone = { type: 'sell', price: avgHigh }
  }

  return { trend, bos, choch, swingHighs, swingLows, higherHighs, higherLows, lowerHighs, lowerLows, orderBlock, fvg, liquidityZone }
}

export function computeIndicators(candles: Candle[]): TechnicalIndicators {
  const closes = candles.map(c => c.close), n = closes.length
  const ema9a = ema(closes, 9), ema21a = ema(closes, 21), ema50a = ema(closes, 50), ema200a = ema(closes, 200)
  const bb = calcBBands(closes), atr = calcATR(candles), adxData = calcADX(candles)
  const vwap = calcVWAP(candles), ichi = calcIchimoku(candles), obvData = calcOBV(candles), sr = calcSRS(candles), stochRsi = calcStochRSI(closes)
  const rsi = calcRSI(closes)
  const rsiSeries = calcRSISeries(closes, 14)
  let rsiDivergence = 'none'
  if (rsiSeries.length > 10) {
    const recent = rsiSeries.slice(-10), priceRecent = closes.slice(-10)
    if (priceRecent[priceRecent.length - 1] > priceRecent[0] && recent[recent.length - 1] < recent[0]) rsiDivergence = 'bearish'
    if (priceRecent[priceRecent.length - 1] < priceRecent[0] && recent[recent.length - 1] > recent[0]) rsiDivergence = 'bullish'
  }
  const volRecent = candles.slice(-1).reduce((s, c) => s + c.vol, 0)
  const volAvg = candles.slice(-20).reduce((s, c) => s + c.vol, 0) / 20
  const volumeRatio = volAvg > 0 ? volRecent / volAvg : 1

  return {
    ema9: ema9a[n - 1] || closes[n - 1], ema21: ema21a[n - 1] || closes[n - 1],
    ema50: ema50a[n - 1] || closes[n - 1], ema200: ema200a[n - 1] || closes[n - 1],
    rsi, rsiDivergence, macd: calcMACD(closes), bbands: bb, stochRsi,
    atr, atrPct: closes[n - 1] > 0 ? (atr / closes[n - 1]) * 100 : 0,
    adx: adxData.adx, plusDI: adxData.plusDI, minusDI: adxData.minusDI,
    vwap, ichimoku: ichi, obv: obvData.obv, obvTrend: obvData.trend,
    volumeRatio, supportLevels: sr.support, resistanceLevels: sr.resistance,
  }
}

export function generateSignal(
  ticker: FuturesTicker, candles: Candle[], ind: TechnicalIndicators, structure: MarketStructure,
  funding: FundingData | null
): SignalSetup | null {
  if (candles.length < 50) return null

  const price = ticker.price
  const atr = ind.atr
  if (atr <= 0 || price <= 0) return null

  let score = 0
  const reasons: string[] = []
  let direction: 'LONG' | 'SHORT' = 'LONG'

  if (ind.ema9 > ind.ema21 && ind.ema21 > ind.ema50) { score += 15; reasons.push(`EMA bullish alignment: 9 > 21 > 50`); direction = 'LONG' }
  else if (ind.ema9 > ind.ema21) { score += 8; reasons.push(`EMA short-term bullish: 9 > 21`); direction = 'LONG' }
  else if (ind.ema9 < ind.ema21 && ind.ema21 < ind.ema50) { score += 15; reasons.push(`EMA bearish alignment: 9 < 21 < 50`); direction = 'SHORT' }
  else if (ind.ema9 < ind.ema21) { score += 8; reasons.push(`EMA short-term bearish: 9 < 21`); direction = 'SHORT' }
  else { return null }

  if (direction === 'LONG' && price > ind.ema200) { score += 10; reasons.push('Above EMA200 — macro uptrend') }
  else if (direction === 'SHORT' && price < ind.ema200) { score += 10; reasons.push('Below EMA200 — macro downtrend') }
  else if (direction === 'LONG' && price < ind.ema200) { score -= 5; reasons.push('Below EMA200 — counter-trend risk') }
  else if (direction === 'SHORT' && price > ind.ema200) { score -= 5; reasons.push('Above EMA200 — counter-trend risk') }

  if (direction === 'LONG' && ind.rsi > 40 && ind.rsi < 70) { score += 12; reasons.push(`RSI ${ind.rsi.toFixed(1)} — bullish momentum, not overbought`) }
  else if (direction === 'LONG' && ind.rsi < 30) { score += 8; reasons.push(`RSI ${ind.rsi.toFixed(1)} — oversold bounce potential`) }
  else if (direction === 'SHORT' && ind.rsi > 30 && ind.rsi < 60) { score += 12; reasons.push(`RSI ${ind.rsi.toFixed(1)} — bearish momentum`) }
  else if (direction === 'SHORT' && ind.rsi > 70) { score += 8; reasons.push(`RSI ${ind.rsi.toFixed(1)} — overbought reversal potential`) }
  else { reasons.push(`RSI ${ind.rsi.toFixed(1)} — neutral`) }

  if (ind.rsiDivergence === 'bullish' && direction === 'LONG') { score += 5; reasons.push('Bullish RSI divergence') }
  if (ind.rsiDivergence === 'bearish' && direction === 'SHORT') { score += 5; reasons.push('Bearish RSI divergence') }

  if (direction === 'LONG' && ind.macd.histogram > 0 && ind.macd.macd > ind.macd.signal) { score += 10; reasons.push('MACD bullish crossover') }
  else if (direction === 'SHORT' && ind.macd.histogram < 0 && ind.macd.macd < ind.macd.signal) { score += 10; reasons.push('MACD bearish crossover') }
  else if ((direction === 'LONG' && ind.macd.histogram > 0) || (direction === 'SHORT' && ind.macd.histogram < 0)) { score += 5; reasons.push(`MACD histogram ${direction === 'LONG' ? 'positive' : 'negative'}`) }

  const bbRange = ind.bbands.upper - ind.bbands.lower
  const bbPos = bbRange > 0 ? (price - ind.bbands.lower) / bbRange : 0.5
  if (direction === 'LONG' && bbPos < 0.3) { score += 8; reasons.push(`BB ${(bbPos * 100).toFixed(0)}% — bounce zone`) }
  else if (direction === 'SHORT' && bbPos > 0.7) { score += 8; reasons.push(`BB ${(bbPos * 100).toFixed(0)}% — rejection zone`) }
  else if (ind.bbands.squeeze) { score += 5; reasons.push('BB squeeze — breakout imminent') }

  if (ind.adx > 25) { score += 10; reasons.push(`ADX ${ind.adx.toFixed(1)} — strong trend`) }
  else if (ind.adx > 20) { score += 5; reasons.push(`ADX ${ind.adx.toFixed(1)} — moderate trend`) }
  else { reasons.push(`ADX ${ind.adx.toFixed(1)} — weak/ranging`) }

  if ((direction === 'LONG' && ind.plusDI > ind.minusDI) || (direction === 'SHORT' && ind.minusDI > ind.plusDI)) score += 3

  if ((direction === 'LONG' && price > ind.vwap) || (direction === 'SHORT' && price < ind.vwap)) { score += 5; reasons.push('VWAP alignment') }

  if (direction === 'LONG' && price > ind.ichimoku.senkouA && price > ind.ichimoku.senkouB && ind.ichimoku.tenkan > ind.ichimoku.kijun) { score += 8; reasons.push('Above Ichimoku cloud') }
  else if (direction === 'SHORT' && price < ind.ichimoku.senkouA && price < ind.ichimoku.senkouB && ind.ichimoku.tenkan < ind.ichimoku.kijun) { score += 8; reasons.push('Below Ichimoku cloud') }

  if (ind.volumeRatio > 1.5) { score += 5; reasons.push(`Volume ${ind.volumeRatio.toFixed(1)}x avg`) }
  else if (ind.volumeRatio > 1.0) { score += 2 }

  if ((direction === 'LONG' && ind.obvTrend === 'up') || (direction === 'SHORT' && ind.obvTrend === 'down')) score += 3

  if ((direction === 'LONG' && (structure.trend === 'Bullish' || structure.trend === 'Strong Bullish')) ||
      (direction === 'SHORT' && (structure.trend === 'Bearish' || structure.trend === 'Strong Bearish'))) { score += 8; reasons.push(`Structure: ${structure.trend}`) }
  if (structure.bos) { score += 3; reasons.push(`BOS ${structure.bos}`) }
  if (structure.choch) { score += 5; reasons.push(`CHOCH ${structure.choch}`) }
  if (structure.orderBlock) { score += 3; reasons.push(`OB ${structure.orderBlock.type}`) }
  if (structure.fvg) { score += 3; reasons.push(`FVG ${structure.fvg.type}`) }

  if (direction === 'LONG' && ind.stochRsi.k < 30) { score += 5; reasons.push(`StochRSI oversold`) }
  else if (direction === 'SHORT' && ind.stochRsi.k > 70) { score += 5; reasons.push(`StochRSI overbought`) }
  else if ((direction === 'LONG' && ind.stochRsi.k > ind.stochRsi.d) || (direction === 'SHORT' && ind.stochRsi.k < ind.stochRsi.d)) score += 3

  if (funding) {
    if (direction === 'LONG' && funding.fundingRate < 0) { score += 3; reasons.push(`Negative funding`) }
    else if (direction === 'SHORT' && funding.fundingRate > 0.0005) { score += 3; reasons.push(`High positive funding`) }
  }

  const maxPossible = 117
  const confidence = Math.min(98, Math.max(10, Math.round((score / maxPossible) * 100)))

  if (score <= 0) return null

  const slDistance = atr * 2
  const entry = price
  const stopLoss = direction === 'LONG' ? price - slDistance : price + slDistance
  const tp1 = direction === 'LONG' ? price + atr * 3 : price - atr * 3
  const tp2 = direction === 'LONG' ? price + atr * 5 : price - atr * 5
  const tp3 = direction === 'LONG' ? price + atr * 8 : price - atr * 8
  const riskReward = Math.abs(tp2 - entry) / Math.abs(entry - stopLoss)

  let timeframe = '1H', estimatedDuration = '4-12 hours'
  if (confidence >= 95) { timeframe = '4H'; estimatedDuration = '12-48 hours' }
  else if (confidence >= 80) { timeframe = '1H'; estimatedDuration = '4-24 hours' }
  else { timeframe = '15m-1H'; estimatedDuration = '2-8 hours' }

  return {
    symbol: ticker.symbol, direction, confidence, entryPrice: entry, stopLoss, tp1, tp2, tp3, riskReward,
    timeframe, estimatedDuration,
    reason: reasons.slice(0, 5).join('. ') + '.',
    trendSummary: `${structure.trend} trend. ${structure.higherHighs ? 'HH ' : ''}${structure.higherLows ? 'HL ' : ''}${structure.lowerHighs ? 'LH ' : ''}${structure.lowerLows ? 'LL ' : ''}EMA ${ind.ema9 > ind.ema21 ? 'bullish' : 'bearish'}.`,
    indicatorSummary: `RSI ${ind.rsi.toFixed(1)}. MACD ${ind.macd.histogram > 0 ? 'bullish' : 'bearish'}. ADX ${ind.adx.toFixed(1)}. BB ${ind.bbands.squeeze ? 'squeeze' : 'normal'}.`,
    marketStructureSummary: `${structure.trend}. ${structure.bos ? `BOS ${structure.bos}` : 'No BOS'}. ${structure.choch ? `CHOCH ${structure.choch}` : ''}. ${structure.orderBlock ? `OB at ${structure.orderBlock.price.toFixed(2)}` : ''}. ${structure.fvg ? `FVG ${structure.fvg.type}` : ''}.`,
    riskSummary: `ATR ${ind.atr.toFixed(2)} (${ind.atrPct.toFixed(2)}%). SL 2x ATR. Risk ${((Math.abs(entry - stopLoss) / entry) * 100).toFixed(2)}%. ${funding ? `Funding ${(funding.fundingRate * 100).toFixed(4)}%.` : ''}`,
    technical: ind, structure, fundingRate: funding?.fundingRate ?? null,
  }
}
