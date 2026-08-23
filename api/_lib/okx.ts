// Shared OKX helpers for Vercel serverless functions
/* eslint-disable @typescript-eslint/no-explicit-any */

interface CacheEntry { data: any; expiresAt: number }
const cache = new Map<string, CacheEntry>()

export function getC(key: string, ttl = 15000) {
  const e = cache.get(key)
  if (e && Date.now() < e.expiresAt) return e.data
  cache.delete(key)
  return null
}

export function setC(key: string, data: any, ttl = 15000) {
  cache.set(key, { data, expiresAt: Date.now() + ttl })
}

export async function okxFetch(path: string) {
  const res = await fetch(`https://www.okx.com${path}`)
  if (!res.ok) throw new Error(`OKX ${res.status}: ${path}`)
  const data = await res.json() as any
  if (data.code !== '0') throw new Error(`OKX error ${data.code}: ${data.msg}`)
  return data.data
}

export function toInstId(symbol: string): string {
  const s = symbol.toUpperCase().trim()
  if (s.endsWith('-SWAP')) return s
  if (s.includes('-') && s.endsWith('-USDT')) return `${s}-SWAP`
  if (!s.includes('-')) return `${s}-USDT-SWAP`
  return `${s}-SWAP`
}

export function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 's-maxage=10, stale-while-revalidate',
    },
  })
}
