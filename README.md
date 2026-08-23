# ⚡ CryptoPilot Lite AI

Real-time cryptocurrency futures scanner with AI-powered technical analysis. Scans OKX perpetual swap pairs and generates high-confidence trading signals.

**Live Preview:** [Open App](https://fed79642-bb32-41e9-8bac-945b674d4955.preview.shogo.ai)

## Features

- **Real-time Scanner** — Scans top 30 USDT perpetual futures by volume every 30 seconds
- **15+ Technical Indicators** — RSI, MACD, Bollinger Bands, EMA (9/21/50/200), ADX, StochRSI, VWAP, Ichimoku Cloud, OBV, ATR
- **Market Structure Analysis** — Break of Structure (BOS), Change of Character (CHOCH), Order Blocks, Fair Value Gaps, Liquidity Zones
- **Confidence Scoring** — 0-98% confidence with multi-indicator confluence
- **Signal Cards** — Entry, Stop Loss, Take Profit 1/2/3, Risk:Reward ratio
- **Interactive Charts** — 1H, 4H, 1D candlestick and line charts via Recharts
- **Order Book Depth** — Live bid/ask visualization
- **4H Confluence** — Multi-timeframe confirmation bonus
- **Diagnostics Panel** — Pipeline visibility into scanner stages
- **Auto-refresh** — Configurable scan intervals

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Charts | Recharts |
| Icons | Lucide React |
| Backend | Vercel Serverless Functions (Node.js) |
| Data Source | OKX Public API |

## Deploy to Vercel

1. **Fork/Clone this repo**
2. **Go to [vercel.com/new](https://vercel.com/new)**
3. **Import your GitHub repository**
4. **Click Deploy** — no environment variables needed (OKX APIs are public)
5. **Done!** Your app will be live at `your-project.vercel.app`

## Local Development

```bash
# Install dependencies
npm install

# Start dev server (frontend only — API routes need Vercel)
npm run dev

# Build for production
npm run build
```

## API Routes

All routes are Vercel serverless functions under `api/`:

| Route | Method | Description |
|-------|--------|-------------|
| `/api/futures/tickers` | GET | All USDT perpetual swap tickers |
| `/api/futures/klines?symbol=BTC&bar=1H&limit=300` | GET | OHLCV candlestick data |
| `/api/futures/funding?symbol=BTC` | GET | Current funding rate |
| `/api/futures/depth?symbol=BTC` | GET | Order book depth (bids/asks) |
| `/api/futures/diagnose` | GET | Full pipeline diagnostic |

## How It Works

1. **Fetch tickers** from OKX — filter to USDT perpetual swaps, sort by 24h volume
2. **Select top 30** candidates by trading volume
3. **Fetch 1H candles** (300 periods) for each candidate
4. **Compute indicators** — 15+ technical indicators + market structure analysis
5. **Score signals** — Multi-factor confidence scoring with direction detection
6. **Generate entries** — ATR-based stop loss and take profit levels
7. **4H confluence** — Bonus confidence for multi-timeframe alignment
8. **Display results** — Sorted by confidence, filterable by symbol/direction

## License

Apache-2.0
