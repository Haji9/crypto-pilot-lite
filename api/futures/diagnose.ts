import { okxFetch, jsonResponse } from '../lib/okx'

export const config = { runtime: 'nodejs', maxDuration: 30 }

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return jsonResponse({}, 204)

  const log: string[] = []
  const stageStats: Record<string, number> = {}
  const tick = (stage: string) => { log.push(`[${new Date().toISOString().slice(11, 19)}] ${stage}`) }
  const count = (key: string, n = 1) => { stageStats[key] = (stageStats[key] || 0) + n }

  tick('STAGE 1: Fetching tickers from OKX...')
  let tickers: any[] = []
  try {
    const raw = await okxFetch('/api/v5/market/tickers?instType=SWAP')
    tickers = raw
      .filter((t: any) => t.instId.endsWith('-USDT-SWAP'))
      .map((t: any) => {
        const price = parseFloat(t.last) || 0
        const volCcy = parseFloat(t.volCcy24h) || 0
        return {
          symbol: t.instId.replace('-USDT-SWAP', ''),
          instId: t.instId, price,
          open24h: parseFloat(t.open24h) || 0,
          high24h: parseFloat(t.high24h) || 0,
          low24h: parseFloat(t.low24h) || 0,
          volCcy24h: volCcy * price,
          vol24h: parseFloat(t.vol24h) || 0,
          bidPx: parseFloat(t.bidPx) || 0,
          askPx: parseFloat(t.askPx) || 0,
          ts: t.ts,
        }
      })
      .filter((t: any) => t.volCcy24h > 500000 && t.price > 0)
      .sort((a: any, b: any) => b.volCcy24h - a.volCcy24h)
    tick(`STAGE 1: OK - ${tickers.length} USDT perpetual swaps loaded`)
    stageStats.totalTickers = tickers.length
  } catch (err: any) {
    tick(`STAGE 1: FAILED - ${err.message}`)
    return jsonResponse({ error: `Stage 1 failed: ${err.message}`, log, stageStats }, 502)
  }

  const candidates = tickers.slice(0, 10)
  tick(`STAGE 2: Selected top ${candidates.length} candidates by volume`)
  stageStats.candidates = candidates.length

  const signals: any[] = []
  const rejectionReasons: Record<string, number> = {}

  for (let i = 0; i < candidates.length; i++) {
    const sym = candidates[i]
    tick(`--- [${i + 1}/${candidates.length}] ${sym.symbol} ---`)

    let candles1h: any[] = []
    try {
      const raw = await okxFetch(`/api/v5/market/candles?instId=${sym.instId}&bar=1H&limit=300`)
      candles1h = raw.map((k: any[]) => ({
        ts: parseInt(k[0]), open: parseFloat(k[1]), high: parseFloat(k[2]),
        low: parseFloat(k[3]), close: parseFloat(k[4]), vol: parseFloat(k[5]), volCcy: parseFloat(k[6]),
      })).reverse()
      tick(`  Klines: ${candles1h.length} candles loaded`)
      count('klinesLoaded')
    } catch (err: any) {
      tick(`  Klines: FAILED - ${err.message}`)
      count('klinesFailed')
      rejectionReasons['klines_error'] = (rejectionReasons['klines_error'] || 0) + 1
      continue
    }

    if (candles1h.length < 50) {
      tick(`  Rejected: insufficient candles (${candles1h.length} < 50)`)
      count('rejectedInsufficientData')
      rejectionReasons['insufficient_candles'] = (rejectionReasons['insufficient_candles'] || 0) + 1
      continue
    }
    count('candlesValid')

    const closes = candles1h.map((c: any) => c.close)
    tick(`  Price: $${closes[closes.length - 1]} | Range: $${Math.min(...closes).toFixed(2)} - $${Math.max(...closes).toFixed(2)}`)

    const k9 = 2 / 10, k21 = 2 / 22, k50 = 2 / 51, k200 = 2 / 201
    let ema9 = closes[0], ema21 = closes[0], ema50 = closes[0], ema200 = closes[0]
    for (let j = 1; j < closes.length; j++) {
      ema9 = closes[j] * k9 + ema9 * (1 - k9)
      ema21 = closes[j] * k21 + ema21 * (1 - k21)
      ema50 = closes[j] * k50 + ema50 * (1 - k50)
      ema200 = closes[j] * k200 + ema200 * (1 - k200)
    }
    tick(`  EMAs: 9=$${ema9.toFixed(2)} 21=$${ema21.toFixed(2)} 50=$${ema50.toFixed(2)} 200=$${ema200.toFixed(2)}`)

    let gains = 0, losses = 0
    for (let j = closes.length - 14; j < closes.length; j++) {
      const d = closes[j] - closes[j - 1]
      if (d > 0) gains += d; else losses -= d
    }
    const rsi = losses === 0 ? 100 : 100 - 100 / (1 + gains / losses)
    tick(`  RSI: ${rsi.toFixed(1)}`)

    const ema12arr = [closes[0]], ema26arr = [closes[0]]
    const k12 = 2 / 13, k26 = 2 / 27
    for (let j = 1; j < closes.length; j++) {
      ema12arr.push(closes[j] * k12 + ema12arr[j - 1] * (1 - k12))
      ema26arr.push(closes[j] * k26 + ema26arr[j - 1] * (1 - k26))
    }
    const macdLine = ema12arr.map((v, j) => v - ema26arr[j])
    const k9m = 2 / 10
    const sigLine = [macdLine[0]]
    for (let j = 1; j < macdLine.length; j++) sigLine.push(macdLine[j] * k9m + sigLine[j - 1] * (1 - k9m))
    const macdH = macdLine[macdLine.length - 1] - sigLine[sigLine.length - 1]
    tick(`  MACD histogram: ${macdH.toFixed(6)} (${macdH > 0 ? 'BULLISH' : 'BEARISH'})`)

    let score = 0
    let direction = 'LONG'
    const reasons: string[] = []

    if (ema9 > ema21 && ema21 > ema50) { score += 15; reasons.push('EMA bull align'); direction = 'LONG' }
    else if (ema9 > ema21) { score += 8; reasons.push('EMA short bull'); direction = 'LONG' }
    else if (ema9 < ema21 && ema21 < ema50) { score += 15; reasons.push('EMA bear align'); direction = 'SHORT' }
    else if (ema9 < ema21) { score += 8; reasons.push('EMA short bear'); direction = 'SHORT' }
    else { tick(`  REJECTED: EMAs flat`); count('rejectedNoDirection'); rejectionReasons['flat_emas'] = (rejectionReasons['flat_emas'] || 0) + 1; continue }

    const price = closes[closes.length - 1]
    if (direction === 'LONG' && price > ema200) { score += 10; reasons.push('above EMA200') }
    else if (direction === 'SHORT' && price < ema200) { score += 10; reasons.push('below EMA200') }
    else if (direction === 'LONG' && price < ema200) { score -= 5; reasons.push('counter EMA200') }
    else if (direction === 'SHORT' && price > ema200) { score -= 5; reasons.push('counter EMA200') }

    if (direction === 'LONG' && rsi > 40 && rsi < 70) { score += 12; reasons.push('RSI good') }
    else if (direction === 'SHORT' && rsi > 30 && rsi < 60) { score += 12; reasons.push('RSI good') }
    else if (rsi < 30 || rsi > 70) { score += 8; reasons.push('RSI extreme') }
    else { reasons.push('RSI neutral') }

    if (macdH > 0 && direction === 'LONG') { score += 10; reasons.push('MACD bull') }
    else if (macdH < 0 && direction === 'SHORT') { score += 10; reasons.push('MACD bear') }
    else if ((macdH > 0 && direction === 'SHORT') || (macdH < 0 && direction === 'LONG')) { reasons.push('MACD conflict') }
    else { score += 5; reasons.push('MACD weak') }

    let atrSum = 0
    for (let j = candles1h.length - 14; j < candles1h.length; j++) {
      const tr = Math.max(
        candles1h[j].high - candles1h[j].low,
        Math.abs(candles1h[j].high - candles1h[j - 1].close),
        Math.abs(candles1h[j].low - candles1h[j - 1].close)
      )
      atrSum += tr
    }
    const atr = atrSum / 14
    tick(`  ATR: ${atr.toFixed(4)} (${(atr / price * 100).toFixed(2)}%)`)

    const confidence = Math.min(98, Math.max(10, Math.round(score / 117 * 100)))
    tick(`  SCORE: ${score}/117 = ${confidence}% | Direction: ${direction}`)
    count('analyzed')
    count('passed')

    const slDist = atr * 2
    signals.push({
      direction, confidence,
      entryPrice: price,
      stopLoss: direction === 'LONG' ? price - slDist : price + slDist,
      tp1: direction === 'LONG' ? price + atr * 3 : price - atr * 3,
      tp2: direction === 'LONG' ? price + atr * 5 : price - atr * 5,
      tp3: direction === 'LONG' ? price + atr * 8 : price - atr * 8,
      riskReward: (atr * 5) / (atr * 2),
      timeframe: '1H',
      estimatedDuration: '4-12 hours',
      reason: reasons.join('. ') + '.',
      symbol: sym.symbol,
    })

    if (i < candidates.length - 1) await new Promise(r => setTimeout(r, 100))
  }

  signals.sort((a: any, b: any) => b.confidence - a.confidence)

  tick(`\n=== FINAL RESULTS ===`)
  tick(`Signals generated: ${signals.length}`)
  tick(`Rejection reasons: ${JSON.stringify(rejectionReasons)}`)

  return jsonResponse({
    summary: {
      totalTickers: stageStats.totalTickers || 0,
      candidatesScanned: stageStats.candidates || 0,
      klinesLoaded: stageStats.klinesLoaded || 0,
      klinesFailed: stageStats.klinesFailed || 0,
      analyzed: stageStats.analyzed || 0,
      signalsGenerated: signals.length,
      rejectionReasons,
    },
    signals,
    log,
  })
}
