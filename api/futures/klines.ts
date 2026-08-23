import { okxFetch, toInstId, getC, setC, jsonResponse } from '../lib/okx'

export const config = { runtime: 'nodejs' }

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return jsonResponse({}, 204)

  const url = new URL(req.url)
  const symbol = (url.searchParams.get('symbol') || 'BTC').toUpperCase()
  const instId = toInstId(symbol)
  const bar = url.searchParams.get('bar') || '1H'
  const limit = url.searchParams.get('limit') || '300'
  const ck = `fklines:${instId}:${bar}:${limit}`

  const cached = getC(ck, 15000)
  if (cached) return jsonResponse(cached)

  try {
    const raw = await okxFetch(`/api/v5/market/candles?instId=${instId}&bar=${bar}&limit=${limit}`)
    const candles = raw.map((k: any[]) => ({
      ts: parseInt(k[0]),
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      vol: parseFloat(k[5]),
      volCcy: parseFloat(k[6]),
    })).reverse()

    const result = { instId, bar, candles }
    setC(ck, result, 15000)
    return jsonResponse(result)
  } catch (err: any) {
    return jsonResponse({ error: err.message }, 502)
  }
}
