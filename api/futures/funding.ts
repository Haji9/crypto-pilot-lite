export const config = { runtime: 'edge' }

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() })
  }

  const url = new URL(req.url)
  const symbol = (url.searchParams.get('symbol') || 'BTC').toUpperCase()
  const instId = symbol.endsWith('-USDT-SWAP') ? symbol : `${symbol}-USDT-SWAP`

  try {
    const res = await fetch(`https://www.okx.com/api/v5/public/funding-rate?instId=${instId}`)
    if (!res.ok) throw new Error(`OKX ${res.status}`)
    const data = await res.json() as any
    if (data.code !== '0') throw new Error(`OKX error ${data.code}: ${data.msg}`)
    const d = (data.data || [])[0]
    if (!d) throw new Error('No funding data')

    return json({
      instId,
      fundingRate: parseFloat(d.fundingRate) || 0,
      nextFundingRate: parseFloat(d.nextFundingRate) || null,
      nextFundingTime: d.nextFundingTime,
      interestRate: parseFloat(d.interestRate) || 0,
    })
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
