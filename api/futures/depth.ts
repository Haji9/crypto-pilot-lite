import { okxFetch, toInstId, getC, setC, jsonResponse } from '../lib/okx'

export const config = { runtime: 'nodejs' }

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return jsonResponse({}, 204)

  const url = new URL(req.url)
  const symbol = (url.searchParams.get('symbol') || 'BTC').toUpperCase()
  const instId = toInstId(symbol)
  const sz = url.searchParams.get('sz') || '40'
  const ck = `fdepth:${instId}`

  const cached = getC(ck, 8000)
  if (cached) return jsonResponse(cached)

  try {
    const raw = await okxFetch(`/api/v5/market/books?instId=${instId}&sz=${sz}`)
    const book = raw[0]
    const result = {
      instId,
      bids: book.bids.map((b: string[]) => ({
        price: parseFloat(b[0]),
        qty: parseFloat(b[1]),
        orders: parseInt(b[3] || '0'),
      })),
      asks: book.asks.map((a: string[]) => ({
        price: parseFloat(a[0]),
        qty: parseFloat(a[1]),
        orders: parseInt(a[3] || '0'),
      })),
      ts: book.ts,
    }
    setC(ck, result, 8000)
    return jsonResponse(result)
  } catch (err: any) {
    return jsonResponse({ error: err.message }, 502)
  }
}
