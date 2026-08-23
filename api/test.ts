export default async function handler(req: Request) {
  return new Response(JSON.stringify({ status: 'ok', env: process.env.VERCEL ? 'vercel' : 'local' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
