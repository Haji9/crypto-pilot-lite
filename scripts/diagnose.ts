// Diagnostic: test the full signal generation pipeline
const API = `http://localhost:${process.env.API_SERVER_PORT}`

async function run() {
  console.log('=== STAGE 1: Fetch all tickers ===')
  const tRes = await fetch(`${API}/api/futures/tickers`)
  const tData = await tRes.json()
  const tickers = tData.tickers || []
  console.log(`  Total tickers: ${tickers.length}`)
  console.log(`  Top 5 by volume:`, tickers.slice(0, 5).map(t => `${t.symbol} vol=$${(t.volCcy24h/1e6).toFixed(0)}M`))

  const candidates = tickers.slice(0, 10)
  let analyzed = 0, rejected = 0, passed = 0

  for (const ticker of candidates) {
    console.log(`\n=== STAGE 2: Fetch klines for ${ticker.symbol} ===`)
    try {
      const kRes = await fetch(`${API}/api/futures/klines?symbol=${ticker.instId}&bar=1H&limit=300`)
      const kData = await kRes.json()
      const candles = kData.candles || []
      console.log(`  Candles: ${candles.length}`)
      if (candles.length < 50) {
        console.log(`  REJECTED: Only ${candles.length} candles (< 50)`)
        rejected++
        continue
      }
      
      const closes = candles.map(c => c.close)
      console.log(`  Price range: ${Math.min(...closes).toFixed(2)} - ${Math.max(...closes).toFixed(2)}`)
      console.log(`  Last close: ${closes[closes.length - 1]}`)

      // Test EMA calculation
      const k = 2 / (9 + 1)
      let ema9 = closes[0]
      for (let i = 1; i < closes.length; i++) ema9 = closes[i] * k + ema9 * (1 - k)
      
      const k2 = 2 / (21 + 1)
      let ema21 = closes[0]
      for (let i = 1; i < closes.length; i++) ema21 = closes[i] * k2 + ema21 * (1 - k2)
      
      console.log(`  EMA9: ${ema9.toFixed(2)}, EMA21: ${ema21.toFixed(2)}`)
      console.log(`  EMA direction: ${ema9 > ema21 ? 'BULLISH' : 'BEARISH'}`)
      
      if (ema9 === ema21) {
        console.log(`  REJECTED: EMAs exactly equal - no direction`)
        rejected++
        continue
      }

      // Test RSI
      let gains = 0, losses = 0
      for (let i = closes.length - 14; i < closes.length; i++) {
        const d = closes[i] - closes[i - 1]
        if (d > 0) gains += d; else losses -= d
      }
      const rsi = losses === 0 ? 100 : 100 - 100 / (1 + gains / losses)
      console.log(`  RSI: ${rsi.toFixed(1)}`)

      // Test ATR
      let atrSum = 0
      for (let i = candles.length - 14; i < candles.length; i++) {
        const tr = Math.max(
          candles[i].high - candles[i].low,
          Math.abs(candles[i].high - candles[i - 1].close),
          Math.abs(candles[i].low - candles[i - 1].close)
        )
        atrSum += tr
      }
      const atr = atrSum / 14
      const atrPct = (atr / closes[closes.length - 1]) * 100
      console.log(`  ATR: ${atr.toFixed(2)} (${atrPct.toFixed(2)}%)`)
      
      analyzed++
      
      // Quick confidence estimate
      let score = 0
      if (ema9 > ema21) score += 8
      else score += 8
      if (rsi > 40 && rsi < 70) score += 12
      else if (rsi < 30 || rsi > 70) score += 8
      else score += 0
      
      const confidence = Math.min(98, Math.max(10, Math.round((score / 117) * 100)))
      console.log(`  Quick score: ${score}, confidence: ${confidence}%`)
      
      if (score > 0) passed++

    } catch (err) {
      console.log(`  ERROR: ${err.message}`)
      rejected++
    }
  }

  console.log('\n=== SUMMARY ===')
  console.log(`  Candidates: ${candidates.length}`)
  console.log(`  Analyzed: ${analyzed}`)
  console.log(`  Rejected: ${rejected}`)
  console.log(`  Passed: ${passed}`)
}

run().catch(console.error)
