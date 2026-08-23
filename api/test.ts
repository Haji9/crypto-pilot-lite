export default async function handler(req: Request) {
  try {
    const res = await fetch('https://www.okx.com/api/v5/market/tickers?instType=SWAP')
    const text = await res.text()
    return new Response(JSON.stringify({
      status: res.status,
      ok: res.ok,
      bodyPreview: text.substring(0, 500),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message, stack: err.stack }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
