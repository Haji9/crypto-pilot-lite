export const config = { runtime: 'edge' }

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() })
  }

  try {
    const res = await fetch('https://www.okx.com/api/v5/market/tickers?instType=SWAP')
    if (!res.ok) throw new Error(`OKX ${res.status}`)
    const data = await res.json() as any
    if (data.code !== '0') throw new Error(`OKX error ${data.code}: ${data.msg}`)

    const usdtSwaps = (data.data || [])
      .filter((t: any) => t.instId.endsWith('-USDT-SWAP'))
      .map((t: any) => {
        const price = parseFloat(t.last) || 0
        const volCcy = parseFloat(t.volCcy24h) || 0
        return {
          symbol: t.instId.replace('-USDT-SWAP', ''),
          instId: t.instId,
          price,
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

    return json({ exchange: 'okx', type: 'perpetual', count: usdtSwaps.length, tickers: usdtSwaps })
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
