import { okxFetch, getC, setC, jsonResponse } from '../lib/okx'

export const config = { runtime: 'nodejs' }

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return jsonResponse({}, 204)

  const ck = 'ftickers'
  const cached = getC(ck, 10000)
  if (cached) return jsonResponse(cached)

  try {
    const raw = await okxFetch('/api/v5/market/tickers?instType=SWAP')
    const usdtSwaps = raw
      .filter((t: any) => t.instId.endsWith('-USDT-SWAP'))
      .map((t: any) => {
        const price = parseFloat(t.last) || 0
        const volCcy = parseFloat(t.volCcy24h) || 0
        const volUsd = volCcy * price
        return {
          symbol: t.instId.replace('-USDT-SWAP', ''),
          instId: t.instId,
          price,
          open24h: parseFloat(t.open24h) || 0,
          high24h: parseFloat(t.high24h) || 0,
          low24h: parseFloat(t.low24h) || 0,
          volCcy24h: volUsd,
          vol24h: parseFloat(t.vol24h) || 0,
          bidPx: parseFloat(t.bidPx) || 0,
          askPx: parseFloat(t.askPx) || 0,
          ts: t.ts,
        }
      })
      .filter((t: any) => t.volCcy24h > 500000 && t.price > 0)
      .sort((a: any, b: any) => b.volCcy24h - a.volCcy24h)

    const result = { exchange: 'okx', type: 'perpetual', count: usdtSwaps.length, tickers: usdtSwaps }
    setC(ck, result, 10000)
    return jsonResponse(result)
  } catch (err: any) {
    return jsonResponse({ error: err.message }, 502)
  }
}
