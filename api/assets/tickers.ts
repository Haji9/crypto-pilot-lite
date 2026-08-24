export const config = { runtime: 'edge' }

const ASSETS: Record<string, { symbol: string; name: string; exchange: string }[]> = {
  stocks: [
    { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ' },
    { symbol: 'MSFT', name: 'Microsoft Corp.', exchange: 'NASDAQ' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', exchange: 'NASDAQ' },
    { symbol: 'AMZN', name: 'Amazon.com', exchange: 'NASDAQ' },
    { symbol: 'NVDA', name: 'NVIDIA Corp.', exchange: 'NASDAQ' },
    { symbol: 'META', name: 'Meta Platforms', exchange: 'NASDAQ' },
    { symbol: 'TSLA', name: 'Tesla Inc.', exchange: 'NASDAQ' },
    { symbol: 'JPM', name: 'JPMorgan Chase', exchange: 'NYSE' },
    { symbol: 'V', name: 'Visa Inc.', exchange: 'NYSE' },
    { symbol: 'WMT', name: 'Walmart Inc.', exchange: 'NYSE' },
    { symbol: 'UNH', name: 'UnitedHealth', exchange: 'NYSE' },
    { symbol: 'MA', name: 'Mastercard', exchange: 'NYSE' },
    { symbol: 'JNJ', name: 'Johnson & Johnson', exchange: 'NYSE' },
    { symbol: 'XOM', name: 'Exxon Mobil', exchange: 'NYSE' },
    { symbol: 'PG', name: 'Procter & Gamble', exchange: 'NYSE' },
    { symbol: 'HD', name: 'Home Depot', exchange: 'NYSE' },
    { symbol: 'CVX', name: 'Chevron Corp.', exchange: 'NYSE' },
    { symbol: 'MRK', name: 'Merck & Co.', exchange: 'NYSE' },
    { symbol: 'ABBV', name: 'AbbVie Inc.', exchange: 'NYSE' },
    { symbol: 'KO', name: 'Coca-Cola Co.', exchange: 'NYSE' },
    { symbol: 'PEP', name: 'PepsiCo Inc.', exchange: 'NASDAQ' },
    { symbol: 'COST', name: 'Costco Wholesale', exchange: 'NASDAQ' },
    { symbol: 'AVGO', name: 'Broadcom Inc.', exchange: 'NASDAQ' },
    { symbol: 'LLY', name: 'Eli Lilly', exchange: 'NYSE' },
    { symbol: 'TMO', name: 'Thermo Fisher', exchange: 'NYSE' },
    { symbol: 'CRM', name: 'Salesforce Inc.', exchange: 'NYSE' },
    { symbol: 'AMD', name: 'AMD Inc.', exchange: 'NASDAQ' },
    { symbol: 'NFLX', name: 'Netflix Inc.', exchange: 'NASDAQ' },
    { symbol: 'DIS', name: 'Walt Disney', exchange: 'NYSE' },
    { symbol: 'NKE', name: 'Nike Inc.', exchange: 'NYSE' },
    { symbol: 'INTC', name: 'Intel Corp.', exchange: 'NASDAQ' },
    { symbol: 'BA', name: 'Boeing Co.', exchange: 'NYSE' },
    { symbol: 'GS', name: 'Goldman Sachs', exchange: 'NYSE' },
    { symbol: 'PYPL', name: 'PayPal Holdings', exchange: 'NASDAQ' },
    { symbol: 'BLK', name: 'BlackRock Inc.', exchange: 'NYSE' },
  ],
  commodities: [
    { symbol: 'GC=F', name: 'Gold', exchange: 'COMEX' },
    { symbol: 'SI=F', name: 'Silver', exchange: 'COMEX' },
    { symbol: 'CL=F', name: 'Crude Oil WTI', exchange: 'NYMEX' },
    { symbol: 'BZ=F', name: 'Brent Crude Oil', exchange: 'NYMEX' },
    { symbol: 'NG=F', name: 'Natural Gas', exchange: 'NYMEX' },
    { symbol: 'HG=F', name: 'Copper', exchange: 'COMEX' },
    { symbol: 'PL=F', name: 'Platinum', exchange: 'NYMEX' },
    { symbol: 'PA=F', name: 'Palladium', exchange: 'NYMEX' },
    { symbol: 'ZC=F', name: 'Corn', exchange: 'CBOT' },
    { symbol: 'ZW=F', name: 'Wheat', exchange: 'CBOT' },
    { symbol: 'ZS=F', name: 'Soybeans', exchange: 'CBOT' },
    { symbol: 'CT=F', name: 'Cotton', exchange: 'ICE' },
    { symbol: 'KC=F', name: 'Coffee', exchange: 'ICE' },
    { symbol: 'SB=F', name: 'Sugar', exchange: 'ICE' },
  ],
  forex: [
    { symbol: 'EURUSD=X', name: 'EUR/USD', exchange: 'FOREX' },
    { symbol: 'GBPUSD=X', name: 'GBP/USD', exchange: 'FOREX' },
    { symbol: 'USDJPY=X', name: 'USD/JPY', exchange: 'FOREX' },
    { symbol: 'USDCHF=X', name: 'USD/CHF', exchange: 'FOREX' },
    { symbol: 'AUDUSD=X', name: 'AUD/USD', exchange: 'FOREX' },
    { symbol: 'USDCAD=X', name: 'USD/CAD', exchange: 'FOREX' },
    { symbol: 'NZDUSD=X', name: 'NZD/USD', exchange: 'FOREX' },
    { symbol: 'EURGBP=X', name: 'EUR/GBP', exchange: 'FOREX' },
    { symbol: 'EURJPY=X', name: 'EUR/JPY', exchange: 'FOREX' },
    { symbol: 'GBPJPY=X', name: 'GBP/JPY', exchange: 'FOREX' },
    { symbol: 'AUDJPY=X', name: 'AUD/JPY', exchange: 'FOREX' },
    { symbol: 'EURAUD=X', name: 'EUR/AUD', exchange: 'FOREX' },
    { symbol: 'USDCNH=X', name: 'USD/CNH', exchange: 'FOREX' },
    { symbol: 'USDINR=X', name: 'USD/INR', exchange: 'FOREX' },
  ],
  indices: [
    { symbol: '^GSPC', name: 'S&P 500', exchange: 'NYSE' },
    { symbol: '^IXIC', name: 'NASDAQ Composite', exchange: 'NASDAQ' },
    { symbol: '^DJI', name: 'Dow Jones', exchange: 'NYSE' },
    { symbol: '^RUT', name: 'Russell 2000', exchange: 'NYSE' },
    { symbol: '^VIX', name: 'VIX', exchange: 'CBOE' },
    { symbol: '^FTSE', name: 'FTSE 100', exchange: 'LSE' },
    { symbol: '^N225', name: 'Nikkei 225', exchange: 'TSE' },
    { symbol: '^GDAXI', name: 'DAX', exchange: 'XETRA' },
    { symbol: '^HSI', name: 'Hang Seng', exchange: 'HKEX' },
    { symbol: '000001.SS', name: 'Shanghai Composite', exchange: 'SSE' },
  ],
}

async function fetchYahooQuote(symbol: string): Promise<{ price: number; open: number; high: number; low: number; volume: number; change: number; changePct: number } | null> {
  try {
    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    if (!res.ok) return null
    const data = await res.json() as any
    const meta = data?.chart?.result?.[0]?.meta
    if (!meta) return null
    const price = meta.regularMarketPrice ?? 0
    const prevClose = meta.previousClose ?? meta.chartPreviousClose ?? price
    return {
      price,
      open: meta.regularMarketOpen ?? prevClose,
      high: meta.regularMarketDayHigh ?? price,
      low: meta.regularMarketDayLow ?? price,
      volume: meta.regularMarketVolume ?? 0,
      change: price - prevClose,
      changePct: prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0,
    }
  } catch {
    return null
  }
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() })
  }

  try {
    const url = new URL(req.url)
    const assetClass = url.searchParams.get('class') || 'all'

    const classes = assetClass === 'all' ? Object.keys(ASSETS) : [assetClass]
    const allTickers: any[] = []

    for (const cls of classes) {
      const assets = ASSETS[cls]
      if (!assets) continue

      const quotes = await Promise.allSettled(
        assets.map(async (asset) => {
          const q = await fetchYahooQuote(asset.symbol)
          if (!q || q.price <= 0) return null
          return {
            symbol: asset.symbol.replace('=X', '').replace('^', ''),
            displayName: asset.name,
            instId: asset.symbol,
            price: q.price,
            open24h: q.open,
            high24h: q.high,
            low24h: q.low,
            volCcy24h: q.volume * q.price,
            vol24h: q.volume,
            bidPx: q.price,
            askPx: q.price,
            ts: String(Date.now()),
            assetClass: cls,
            exchange: asset.exchange,
            change24h: q.changePct,
          }
        })
      )

      for (const r of quotes) {
        if (r.status === 'fulfilled' && r.value) allTickers.push(r.value)
      }
    }

    return json({
      exchange: 'yahoo',
      type: 'multi-asset',
      count: allTickers.length,
      tickers: allTickers.sort((a, b) => b.volCcy24h - a.volCcy24h),
    })
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
