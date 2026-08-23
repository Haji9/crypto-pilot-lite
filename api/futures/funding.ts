import { okxFetch, toInstId, jsonResponse } from '../lib/okx'

export const config = { runtime: 'nodejs' }

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return jsonResponse({}, 204)

  const url = new URL(req.url, 'http://localhost')
  const symbol = (url.searchParams.get('symbol') || 'BTC').toUpperCase()
  const instId = toInstId(symbol)

  try {
    const raw = await okxFetch(`/api/v5/public/funding-rate?instId=${instId}`)
    const d = raw[0]
    return jsonResponse({
      instId,
      fundingRate: parseFloat(d.fundingRate) || 0,
      nextFundingRate: parseFloat(d.nextFundingRate) || null,
      nextFundingTime: d.nextFundingTime,
      interestRate: parseFloat(d.interestRate) || 0,
    })
  } catch (err: any) {
    return jsonResponse({ error: err.message }, 502)
  }
}
