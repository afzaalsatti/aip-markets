# Deploy AIP Markets (Vercel UI + hosted API)

Split deploy: **frontend on Vercel**, **FastAPI elsewhere**. Vercel alone cannot run the Python stack, SQLite file DB, or Ollama.

This is a **personal / educational research demo** — not a hosted brokerage SaaS. Public hosting may change your responsibilities under quote/RSS terms; see `NOTICE.md`.

---

## Architecture

```
Browser (Vercel: *.vercel.app)
  → NEXT_PUBLIC_API_URL
  → FastAPI (Railway / Render / Fly / VPS)
  → yfinance + public RSS (+ optional Ollama, or mock LLM narrative)
```

---

## 1) Deploy the backend first (best free: Render)

**Recommendation: [Render](https://render.com) Free Web Service** — simplest free public HTTPS URL for this FastAPI app.  
Tradeoff: free instances **sleep after ~15 minutes** idle; first request can take ~30–60s (cold start).

Railway is fine too but is usually **trial credits**, not forever-free.

### Render — step by step (Python, no Docker)

1. Push this repo to **GitHub** (or GitLab/Bitbucket).
2. Sign up at [render.com](https://render.com) → **New** → **Web Service**.
3. Connect the repo.
4. Settings:

| Field | Value |
|-------|--------|
| **Name** | `aip-markets-api` (anything) |
| **Root Directory** | `backend` |
| **Runtime** | `Python 3` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| **Instance type** | **Free** |

5. **Environment** tab → add:

| Key | Value |
|-----|--------|
| `USE_MOCK_LLM_FALLBACK` | `true` |
| `USE_MOCK_MARKET_DATA` | `false` |
| `CORS_ORIGINS` | `http://localhost:3000` *(add your Vercel URL later)* |

6. Click **Create Web Service** and wait for the first deploy (build can take several minutes — scipy/pandas are heavy).
7. Copy the service URL, e.g. `https://aip-markets-api.onrender.com`.
8. Smoke-test in the browser:

```text
https://YOUR-SERVICE.onrender.com/api/v1/system/health
https://YOUR-SERVICE.onrender.com/api/v1/docs
```

9. Your frontend env value is:

```text
NEXT_PUBLIC_API_URL=https://YOUR-SERVICE.onrender.com/api/v1
```

### Render — Docker alternative

Same **New → Web Service**, but:

| Field | Value |
|-------|--------|
| **Root Directory** | `backend` |
| **Runtime** | `Docker` |
| **Dockerfile Path** | `Dockerfile` |
| **Instance** | Free |

Dockerfile already respects `$PORT`.

### After Vercel exists

Edit the Render service env and set:

```text
CORS_ORIGINS=https://YOUR-APP.vercel.app,http://localhost:3000
```

Then **Manual Deploy → Deploy latest commit** (or wait for auto-redeploy).

### Backend env vars (reference)

| Variable | Suggested hosted value | Notes |
|----------|------------------------|--------|
| `CORS_ORIGINS` | `https://YOUR-APP.vercel.app,http://localhost:3000` | Comma-separated |
| `USE_MOCK_LLM_FALLBACK` | `true` | Free hosts usually have no Ollama |
| `USE_MOCK_MARKET_DATA` | `false` | Keep live yfinance |
| `DATABASE_URL` | leave default SQLite | Wiped on redeploy/restart on free tier |

**Ollama:** skip on free hosts. Research uses the soft mock synthesizer; prices still come from quant/yfinance when live.

---

## 2) Deploy the frontend on Vercel

1. Import the Git repo in [Vercel](https://vercel.com).
2. **Root Directory:** `frontend`
3. Framework: Next.js (see `frontend/vercel.json`)
4. Environment variable:

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_API_URL` | `https://YOUR-API.example.com/api/v1` |

5. Deploy. Open the Vercel URL → Markets should load live quotes if the API is up.

### CLI alternative

```bash
cd frontend
npx vercel
# set NEXT_PUBLIC_API_URL in the Vercel project settings, then:
npx vercel --prod
```

---

## 3) Wire CORS

After you know the Vercel URL, update the API:

```text
CORS_ORIGINS=https://your-app.vercel.app,https://your-app-git-main-user.vercel.app,http://localhost:3000
```

Redeploy/restart the backend. If Markets works locally but fails from Vercel with network/CORS errors in the browser console, this is the usual fix.

---

## 4) Smoke checklist

- [ ] `GET /api/v1/system/health` → healthy  
- [ ] `GET /api/v1/system/compliance` → EU/US text  
- [ ] Vercel Markets tab shows quotes (or honest “unavailable”, never fake prices)  
- [ ] Chart + News refresh  
- [ ] Research loads (mock LLM OK if no Ollama)  
- [ ] Disclosures tab readable  
- [ ] `/guide` opens  

---

## Common failures

| Symptom | Fix |
|---------|-----|
| UI loads, everything “unavailable” | `NEXT_PUBLIC_API_URL` missing/wrong, or API down |
| Browser CORS error | Add exact Vercel origin to `CORS_ORIGINS` |
| Research always mock | Expected without Ollama — set `USE_MOCK_LLM_FALLBACK=true` intentionally |
| Quotes flaky / 429 | yfinance rate limits — smaller universe already; wait and retry |
| SQLite data “lost” | Host wiped ephemeral disk — normal on free tiers |

---

## What not to expect on this path

- Auth / multi-tenant accounts  
- Guaranteed uptime or commercial market-data license  
- Local Ollama quality on a tiny free API box  
- “Production-ready enterprise” compliance certification — Disclosures are transparency only  

For contributor detail see `AGENTS.md`. For legal/data posture see `NOTICE.md`.
