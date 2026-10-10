# AIP Markets — Asset Intelligence Platform

Personal / educational **multi-asset research terminal** for equities & ETFs, forex, crypto, commodities, and fixed income.

Not a broker. Not investment advice. Built on **open-source software** and **free public data** (delayed quotes via yfinance, government/public RSS, optional local Ollama).

> **Release-ready demo** for local personal research — polished UI, honest empty states, free OSS + public data.  
> Not a hosted SaaS, not a broker, and not “enterprise production” with auth/SLA. See `AGENTS.md` and `NOTICE.md`.

---

## What you get

| Area | What it does |
|------|----------------|
| **Markets** | Screener, watchlist, gainers/losers — compact liquid universe |
| **Chart** | History, technicals, risk tiles, bull / base / bear what-if paths (plain English) |
| **Research** | LLM note grounded in quant outputs + markets headlines (Ollama; soft mock if offline) |
| **News** | Markets (gov/public RSS for research) vs World (general knowledge only) |
| **Models** | Walk-forward accuracy on liquid proxies |
| **Disclosures** | EU & US research framing, OSS stack, free-data attribution |

**Rule:** the LLM explains numbers — it does **not** invent prices. Forecasts come from the quant services.

---

## How to use (in the app)

1. Open **http://localhost:3000** → start in **Markets**.
2. Star symbols, tap a row → **Chart** (read “In plain English” first).
3. Open **Research** for a cited note (loads on demand).
4. Use **News** (Markets vs World), **Models**, and **Disclosures**.
5. Full tour + metric glossary: **[How to use](http://localhost:3000/guide)** (`/guide`).

Tips:

- **Auto-refresh** updates quotes/chart/news while the tab is visible; pause with the Auto control.
- **Data freshness** badges show live vs unavailable — empty states mean upstream failed (no fake prices).
- Watchlist and theme stay in this browser (`localStorage`).

---

## Quickstart

### Backend

```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

- API docs: http://localhost:8000/api/v1/docs  
- Optional LLM: install [Ollama](https://ollama.com), then `ollama pull qwen2.5:3b`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

- UI: http://localhost:3000  
- Guide: http://localhost:3000/guide  

### Tests

```bash
cd backend
python -m pytest tests
```

### Docker

See `docker-compose.yml` (backend, frontend, Redis, Ollama). Copy `.env.example` as needed. Redis is unused in app code today.

---

## Project layout

```
/
├── AGENTS.md            # Contributor brief (source of truth for AI/humans)
├── NOTICE.md            # EU/US research posture, OSS + free-data notes
├── README.md            # This file
├── docker-compose.yml
├── .env.example
├── backend/             # FastAPI, quant, RSS, Ollama adapter
└── frontend/            # Next.js terminal + /guide
```

Config lives in `backend/app/config.py` (there is no `backend/app/core/`).

---

## Stack (free / OSS)

| Layer | Choices |
|--------|---------|
| Frontend | Next.js 14, React, TypeScript, Tailwind, Recharts |
| Backend | FastAPI, SQLAlchemy async, SQLite |
| Quotes | yfinance (delayed public web data — not a paid exchange feed) |
| News | feedparser + public/gov RSS only |
| LLM | Local Ollama (`qwen2.5:3b` by default) |

No paid Bloomberg/Refinitiv/news-API keys required for the default path.

---

## EU & US compliance posture

Informational research only. Full text in **`NOTICE.md`** and the in-app **Disclosures** tab (`GET /api/v1/system/compliance`).

- **GDPR** — minimal personal data; no accounts / ad SDKs  
- **EU AI Act** — local LLM contextualizer; no automated trading  
- **MiFID II / US** — not personalized advice; no brokerage or custody  
- **Data** — free public quotes + gov/public-broadcaster RSS  

**Not legal advice.** Disclosures describe design intent; they do not guarantee you will never receive a third-party notice. Do not commercialize or redistribute bulk market data without counsel and proper rights.

---

## Deploy (Vercel UI + hosted API)

Frontend → **Vercel** (`frontend/`). Backend → **Railway / Render / Fly / VPS** (`backend/`).  
Step-by-step: **[`DEPLOY.md`](./DEPLOY.md)**.

```text
Vercel: Root Directory = frontend
Env:    NEXT_PUBLIC_API_URL=https://YOUR-API/api/v1

API:    CORS_ORIGINS=https://YOUR-APP.vercel.app,http://localhost:3000
        USE_MOCK_LLM_FALLBACK=true   # unless you host Ollama
```

---

## Docs map

| Doc | Audience |
|-----|----------|
| `README.md` | Humans — quickstart & how to use |
| `DEPLOY.md` | Vercel + Railway/Render checklist |
| `AGENTS.md` | Contributors / AI agents — architecture & conventions |
| `NOTICE.md` | Compliance & attribution |
| `/guide` | In-app product tour + metric glossary |
