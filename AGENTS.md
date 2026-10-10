# AGENTS.md — Asset Intelligence Platform (AIP Markets)

Read this file first before changing code. It describes what the product is, how it is built, what is real vs mocked, and conventions for future AI/human contributors.

---

## 1. Product summary

**Name:** Asset Intelligence Platform (UI brand: **AIP Markets**)  
**Type:** Fullstack multi-asset market intelligence / research terminal (not a broker, not a portfolio CRM, not inventory “asset management”).  
**Purpose:** Show quotes, technicals, probabilistic scenario forecasts, news with sentiment, and LLM-grounded research notes across:

- Equities & equity ETFs  
- Forex  
- Cryptocurrencies  
- Commodities  
- Fixed income  

**Critical product rule:** The LLM contextualizes quantitative outputs and news into research text. **It must not invent price predictions.** Prices/scenarios come from the quant forecasting services.

**Regulatory posture (documented in UI + `NOTICE.md`):** Informational research only for **EU & US**; GDPR minimal-data design; MiFID II non-advice; EU AI Act transparency; US non-advice / no brokerage framing; accessibility basics. Stack is **free OSS + public data** (yfinance delayed quotes, gov/public RSS, local Ollama). Disclosures are transparency — **not a lawyer guarantee** against third-party notices if you commercialize or redistribute data.

---

## 2. Repository layout

```
/
├── AGENTS.md                 ← this file (AI-oriented project brief)
├── README.md                 ← human quickstart (marketing tone; treat maturity claims carefully)
├── DEPLOY.md                 ← Vercel frontend + hosted FastAPI checklist
├── NOTICE.md                 ← EU/US research posture, OSS + free-data attribution
├── docker-compose.yml        ← backend, frontend, redis, ollama
├── .env.example
├── backend/
│   ├── app/main.py           ← FastAPI entry, CORS, seed on startup
│   ├── app/config.py         ← settings (DB, Ollama, mock LLM flag)
│   ├── app/db/               ← async SQLAlchemy
│   ├── app/models/domain.py  ← ORM entities
│   ├── app/schemas/          ← Pydantic response models
│   ├── app/api/v1/           ← REST routers
│   ├── app/services/         ← ingestion, TA, forecast, news, LLM
│   ├── tests/
│   └── requirements.txt
└── frontend/
    ├── src/app/page.tsx      ← single-page terminal (tabs)
    ├── src/components/       ← markets UI widgets
    └── src/lib/api.ts        ← API client + offline fallback payloads
```

Note: README mentions `backend/app/core/` — that folder does **not** exist. Config lives in `backend/app/config.py`.

---

## 3. Tech stack

| Layer | Choices |
|--------|---------|
| Frontend | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Recharts, Lucide |
| Backend | FastAPI, Uvicorn, Pydantic v2, SQLAlchemy 2 async |
| DB default | SQLite via `aiosqlite` (`DATABASE_URL`); `asyncpg` available for Postgres |
| Market data | yfinance primary; synthetic mock provider as fallback |
| Quant | pandas/numpy/scipy/`ta`; forecasting is rule/regime/vol based (not a full ML training pipeline in hot path) |
| News | RSS via `feedparser` + DB persistence |
| LLM | Ollama HTTP adapter; default local model **`qwen2.5:3b`** (~1.9GB). Mock only if `USE_MOCK_LLM_FALLBACK=true` or Ollama is down |
| Infra | Docker Compose also defines Redis + Ollama; Redis is currently unused in app code |

---

## 4. Architecture (runtime)

```
Browser (localhost:3000)
  → frontend/src/lib/api.ts
  → NEXT_PUBLIC_API_URL || http://localhost:8000/api/v1
  → FastAPI routers
  → services (yfinance / TA / forecast / news / LLM)
  → SQLite (and optional live network calls)
```

On API failure, the frontend returns **empty/unavailable payloads** (plus `DataFreshness`) — not invented prices. Disclosure text may use a static offline copy. Prefer fixing the backend over expanding fallbacks.

---

## 5. Domain model (ORM)

Defined in `backend/app/models/domain.py`:

| Entity | Role |
|--------|------|
| `Asset` | Symbol, class, exchange, sector, active |
| `MarketObservation` | OHLCV bars (unique asset/timestamp/timeframe) |
| `IndicatorObservation` | Named TA values + JSON extras |
| `ForecastRecord` | Horizons, probs, VaR, scenarios (JSON) |
| `NewsArticle` | Title, URL, sentiment, impact, category |
| `AssetNewsRelation` | Asset ↔ news relevance |
| `AIResearchReport` | Narrative sections + citations |
| `ModelPerformanceRecord` | MAE/RMSE/directional accuracy/calibration |

**Maturity note:** Many endpoints compute results live and do not fully persist forecasts/reports/indicators even though tables exist.

Default symbol universe is seeded in `backend/app/services/data_ingestion/ingestion_manager.py`.

---

## 6. API surface (`/api/v1`)

OpenAPI: `http://localhost:8000/api/v1/docs`

| Method | Path | Intent |
|--------|------|--------|
| GET | `/markets/overview` | Active assets + quotes |
| GET | `/assets` | List assets |
| GET | `/assets/{symbol}` | Detail + quote + some TA |
| GET | `/assets/{symbol}/history` | OHLCV history |
| GET | `/assets/{symbol}/indicators` | TA summary |
| GET | `/assets/{symbol}/forecast?horizon=` | `1d\|1w\|1m\|3m` scenarios |
| GET | `/models/performance` | Backtest-style metrics (often baseline/hardcoded) |
| GET | `/assets/{symbol}/analysis` | Full research report pipeline |
| GET | `/news` | News list (`scope=markets\|world\|all`, optional `refresh`, category/source) |
| GET | `/news/sources` | Configured RSS outlets by scope |
| POST | `/news/refresh` | On-demand multi-source RSS pull |
| GET | `/system/health` | Health + LLM status |
| GET | `/system/compliance` | Compliance text |

**Auth:** Not implemented. JWT-related deps/config exist but routers are open.

---

## 7. Frontend UX (current design intent)

Inspired by real market sites (Yahoo Finance / TradingView / broker watchlists), **not** glassmorphism “AI dashboard” aesthetics.

- Brand: **AIP Markets**
- Fonts: IBM Plex Sans + IBM Plex Mono
- Accent: muted orange (Bloomberg-adjacent), green/red for up/down
- Default theme: **light** (`data-theme`); dark optional
- **Mobile-first:** bottom tab bar (`MobileBottomNav`), card screener / model cards on small screens, tables from `md` up, swipeable chips/ticker, ≥44px touch targets, safe-area insets
- Primary UX: dense **screener** + watchlist/gainers/losers; Chart tab for TA + scenarios; Research / News / Models / Disclosures tabs
- Tabs are exclusive (overview does not also render the chart workspace)

Key files:

- `frontend/src/app/page.tsx` — state, data loading, tab routing  
- `frontend/src/components/MarketOverview.tsx` — screener + side panels  
- `frontend/src/components/InteractiveChart.tsx` — price + scenario overlay  
- `frontend/src/components/CompliancePanel.tsx` — Disclosures tab  
- `frontend/src/app/guide/page.tsx` + `AppGuidePanel.tsx` / `AppGuideData.ts` — How to use  
- `frontend/src/lib/api.ts` — client + empty/unavailable payloads  

---

## 8. Feature checklist (what exists)

### Implemented end-to-end (demo-grade)

- [x] Multi-asset universe seed + REST overview (parallel quote fetch)  
- [x] yfinance ingestion with mock fallback  
- [x] Technical analysis engine (SMA/EMA/RSI/MACD/Bollinger/ATR/30d vol/regime)  
- [x] Risk metrics on asset detail: Sharpe, Sortino, real beta vs SPY, max DD, CVaR  
- [x] Probabilistic forecast scenarios (bull/base/bear probs aligned to CDF; VaR)  
- [x] Walk-forward `/models/performance` on liquid proxies (handles missing data)  
- [x] News service + public/gov RSS only (`markets` for research, `world` for general knowledge; on-demand refresh; world excluded from analysis; no commercial aggregator feeds)  
- [x] Research report generation (Ollama preferred; mock LLM only if Ollama down; lazy-loaded in UI)  
- [x] Plain-English analysis brief (technical checklist + fundamentals by asset class)  
- [x] Next.js terminal: screener, chart history ranges, indicators panel, watchlist persistence  
- [x] Disclosures tab → `CompliancePanel` + `/system/compliance` (EU+US, OSS stack, free sources; see `NOTICE.md`)  
- [x] Dedicated `/guide` How to use page (product tour + metric glossary)  
- [x] Light/dark theme  
- [x] Basic pytest coverage for TA/forecast/backtester  

### Partial / soft

- [ ] Persist forecasts/reports/indicators to ORM tables on every compute  
- [x] Local Ollama wired to `qwen2.5:3b` (pull via `ollama pull qwen2.5:3b`)  
- [ ] FRED / other macro providers (config key unused)  
- [ ] Redis caching (Compose service unused)  

### Not implemented

- [ ] User accounts, auth, roles, API keys  
- [ ] Brokerage / order entry / portfolio holdings  
- [ ] Multi-tenant SaaS hardening  
- [ ] Production secrets management  

Treat README “production-ready” language as aspirational.

---

## 9. How to run (local)

### Backend

```bash
cd backend
python -m venv venv
# Windows: .\venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Required extras historically missing from older requirement lists: `greenlet` (SQLAlchemy asyncio), `feedparser` (RSS). Both should be in `requirements.txt`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

- UI: http://localhost:3000  
- API docs: http://localhost:8000/api/v1/docs  

### Tests

```bash
cd backend
python -m pytest tests
```

### Docker

`docker-compose.yml` builds backend/frontend and starts Redis + Ollama. Copy `.env.example` as needed.

---

## 10. Engineering conventions for AI agents

1. **Do not claim production readiness** when adding docs or marketing copy; keep honesty about mocks.  
2. **Do not add auth theater** without wiring real user models and middleware.  
3. **LLM boundary:** never let the LLM become the price model; keep numbers from quant services.  
4. **Frontend design:** mobile-first (touch targets ≥44px, horizontal chip/tab strips, card screener on small screens, table from `md` up); dense usable market UI on desktop; avoid Inter + purple gradients + glow + “conviction badge” card grids.  
5. **Realtime honesty:** Never invent quotes, OHLCV, news, forecasts, or research when live upstream fails. Show empty/unavailable + `DataFreshness` badge. Only soft fallback allowed is **LLM narrative** (`MockLLMAdapter`) when Ollama is down — prices still come from quant. Synthetic market mock only if `USE_MOCK_MARKET_DATA=true`.  
5b. **Auto-refresh:** `useAutoRefresh` + `AutoRefreshControl` — quotes ~45s, chart ~60s, news ~120s, models ~5m; pauses when the browser tab is hidden; full LLM research notes are on-demand (not interval-polled).  
6. **Scope discipline:** match existing patterns in `api/v1` + `services/`; don’t invent parallel frameworks.  
7. **API client:** on fetch failure return empty/unavailable payloads (not hardcoded prices); keep TypeScript + `DataFreshness` in sync.  
8. **Secrets:** never commit real `SECRET_KEY`, API keys, or production `.env`.  
9. **Commits:** only when the user asks.  
10. **Free/OSS data posture:** Prefer public/gov RSS and free personal quote clients. Do not add paid market-data APIs, commercial news scrapers, or Google/Reddit aggregators without explicit product decision + ToS review. Keep Disclosures/`NOTICE.md` honest — never claim legal immunity.  

---

## 11. Known sharp edges

- SMA200 on short history uses `min_periods=1` (not a true 200-session SMA until enough bars exist).  
- Walk-forward horizon is **next-day** (`1d`), not 30-day-ahead, even though older docs said “1m”.  
- Overview still hits yfinance per symbol (now in parallel) and can be slow under rate limits.  

---

## 12. Suggested next hardening steps (priority order)

1. Persist and serve indicator/forecast/report records from ORM tables.  
2. Cache overview quotes (Redis or TTL in-memory).  
3. Wire optional auth only if product needs multi-user.  
4. Turn off mock LLM in staging with a real Ollama model and schema validation tests.  

---

*Last updated: release-ready demo polish + DEPLOY.md (Vercel UI / hosted API split) — still research demo, not hosted SaaS.*
