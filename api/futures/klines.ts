export const config = { runtime: 'edge' }

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() })
  }

  const url = new URL(req.url)
  const symbol = (url.searchParams.get('symbol') || 'BTC').toUpperCase()
  const instId = symbol.endsWith('-USDT-SWAP') ? symbol : `${symbol}-USDT-SWAP`
  const bar = url.searchParams.get('bar') || '1H'
  const limit = url.searchParams.get('limit') || '300'

  try {
    const res = await fetch(`https://www.okx.com/api/v5/market/candles?instId=${instId}&bar=${bar}&limit=${limit}`)
    if (!res.ok) throw new Error(`OKX ${res.status}`)
    const data = await res.json() as any
    if (data.code !== '0') throw new Error(`OKX error ${data.code}: ${data.msg}`)

    const candles = (data.data || []).map((k: any[]) => ({
      ts: parseInt(k[0]),
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      vol: parseFloat(k[5]),
      volCcy: parseFloat(k[6]),
    })).reverse()

    return json({ instId, bar, candles })
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
