export const config = { runtime: 'edge' }

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() })
  }

  const url = new URL(req.url)
  const symbol = (url.searchParams.get('symbol') || 'BTC').toUpperCase()
  const instId = symbol.endsWith('-USDT-SWAP') ? symbol : `${symbol}-USDT-SWAP`
  const sz = url.searchParams.get('sz') || '40'

  try {
    const res = await fetch(`https://www.okx.com/api/v5/market/books?instId=${instId}&sz=${sz}`)
    if (!res.ok) throw new Error(`OKX ${res.status}`)
    const data = await res.json() as any
    if (data.code !== '0') throw new Error(`OKX error ${data.code}: ${data.msg}`)
    const book = (data.data || [])[0]
    if (!book) throw new Error('No depth data')

    const result = {
      instId,
      bids: (book.bids || []).map((b: string[]) => ({
        price: parseFloat(b[0]),
        qty: parseFloat(b[1]),
        orders: parseInt(b[3] || '0'),
      })),
      asks: (book.asks || []).map((a: string[]) => ({
        price: parseFloat(a[0]),
        qty: parseFloat(a[1]),
        orders: parseInt(a[3] || '0'),
      })),
      ts: book.ts,
    }

    return json(result)
  } catch (err: any) {
    return json({ error: err.message }, 502)
  }
}

function corsHeaders() {
  return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }
}

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...corsHeaders() } })
}
