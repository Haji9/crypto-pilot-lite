export const config = { runtime: 'edge' }

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() })
  }

  try {
    const url = new URL(req.url)
    const symbol = url.searchParams.get('symbol')
    const bar = url.searchParams.get('bar') || '1d'
    const limit = parseInt(url.searchParams.get('limit') || '200')

    if (!symbol) return json({ error: 'symbol required' }, 400)

    const yahooSymbol = symbol.includes('=X') || symbol.startsWith('^') || symbol.includes('.')
      ? symbol
      : symbol

    let range = '3mo'
    let interval = '1d'
    if (bar === '1H' || bar === '1h') { range = '1mo'; interval = '1h' }
    else if (bar === '4H' || bar === '4h') { range = '3mo'; interval = '1h' }
    else if (bar === '1D' || bar === '1d') { range = '6mo'; interval = '1d' }
    else if (bar === '1W' || bar === '1w') { range = '2y'; interval = '1wk' }
    else if (bar === '15m') { range = '5d'; interval = '15m' }
    else if (bar === '5m') { range = '5d'; interval = '5m' }

    const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=${range}&interval=${interval}`

    const res = await fetch(chartUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    if (!res.ok) return json({ error: `Yahoo ${res.status}` }, 502)

    const data = await res.json() as any
    const result = data?.chart?.result?.[0]
    if (!result) return json({ candles: [] })

    const timestamps = result.timestamp || []
    const ohlc = result.indicators?.quote?.[0]
    if (!ohlc || !ohlc.close) return json({ candles: [] })

    const candles: any[] = []
    const maxCandles = Math.min(timestamps.length, limit)
    const startIdx = Math.max(0, timestamps.length - maxCandles)

    for (let i = startIdx; i < timestamps.length; i++) {
      if (ohlc.close[i] == null || ohlc.open[i] == null) continue
      candles.push({
        ts: timestamps[i] * 1000,
        open: ohlc.open[i],
        high: ohlc.high[i],
        low: ohlc.low[i],
        close: ohlc.close[i],
        vol: ohlc.volume?.[i] ?? 0,
        volCcy: (ohlc.volume?.[i] ?? 0) * ohlc.close[i],
      })
    }

    return json({ symbol: yahooSymbol, bar, count: candles.length, candles })
  } catch (err: any) {
    return json({ error: err.message }, 502)
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  })
}
