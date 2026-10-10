# NOTICE — AIP Markets (Asset Intelligence Platform)

## What this product is

AIP Markets is a **personal / educational market research terminal**. It shows delayed public quotes, technical indicators, probabilistic scenario estimates, public RSS headlines, and optional local LLM research notes.

It is **not** a broker, exchange, investment adviser, commodity trading advisor, credit rating agency, or paid market-data vendor.

## Regulatory posture (EU & US — informational)

This build is designed for **informational research only**:

| Framework | Posture in this demo |
|-----------|----------------------|
| **GDPR (EU)** | Minimal personal data: no accounts, no ad SDKs, no customer CRM. Watchlist/theme in browser `localStorage`. |
| **EU AI Act** | Local Ollama may contextualize quant outputs and cited news. It must not invent prices. No automated trading. |
| **MiFID II** | Not personalized investment advice or portfolio management. |
| **US (SEC / general)** | General information / education — not a solicitation or offer of securities; no brokerage or custody. |
| **US CFTC framing** | Commodity/crypto views are educational research, not trading recommendations. |

**These statements are product transparency, not legal advice.** They do **not** guarantee you will never receive a third-party notice. Commercial hosting, redistributing bulk market data, or advising others may require licenses, data contracts, and counsel in your jurisdiction.

## Open-source stack (no paid SaaS required)

| Component | Role | Typical license |
|-----------|------|-----------------|
| FastAPI, Uvicorn, SQLAlchemy, Pydantic | Backend | MIT / BSD-style |
| Next.js, React, Tailwind, Recharts, Lucide | Frontend | MIT |
| pandas, numpy, scipy, ta | Quant | BSD / Apache |
| yfinance | Quote/history client | Apache-2.0 |
| feedparser, httpx | Public RSS | BSD |
| Ollama + open-weight models (e.g. Qwen) | Local LLM | Local runtime; respect each model’s license |
| SQLite / aiosqlite | Database | Public domain / MIT |

## Free / public data sources

| Source | Use | Terms note |
|--------|-----|------------|
| **yfinance → public delayed web quotes** | Prices & history | Personal/research use; polite rate limits; **not** a licensed exchange feed; do not resell bulk data |
| **Government / central bank RSS** (Fed, ECB, SEC, …) | Markets news for research context | Link to originals; respect agency terms |
| **Public broadcasters & IGOs** (BBC, NPR, DW, France 24, UN, WHO, NASA, …) | World news (excluded from analysis pipeline) | Headlines + links; respect outlet terms |
| **Local Ollama** | Research narrative | Optional mock synthesizer only if Ollama is down |

Intentionally **avoided** in the default news config: commercial scrapers, Google News aggregators, Reddit, and paid wires (CNBC/Investing-style feeds) — to reduce ToS / redistribution risk for a personal research build.

## What you must not do with this demo

- Offer brokerage, order entry, custody, or managed accounts
- Claim outputs are personalized investment advice or guaranteed forecasts
- Resell or republish upstream quotes/news as a commercial data product without rights
- Scrape aggressively or ignore rate limits / robots / outlet terms

## Operator responsibility

You run this stack on your own machine or server. You are responsible for complying with applicable EU/US law, Yahoo/public quote terms, RSS outlet terms, and model licenses for **your** deployment. See Disclosures in the UI (`/system/compliance`) for the live copy.

---

*Not legal advice. For personal research builds using free OSS and public feeds.*
