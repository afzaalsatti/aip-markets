from fastapi import APIRouter
from app.config import settings
from app.services.llm_adapter.ollama_adapter import OllamaLLMAdapter
from app.services.data_quality import utc_now_iso

router = APIRouter(prefix="/system", tags=["System & Governance"])
llm_adapter = OllamaLLMAdapter()


@router.get("/health")
async def get_system_health():
    ollama_alive = await llm_adapter.health_check()
    mock_markets = bool(getattr(settings, "USE_MOCK_MARKET_DATA", False))
    return {
        "status": "healthy",
        "version": settings.VERSION,
        "database": "connected",
        "as_of": utc_now_iso(),
        "llm_engine": {
            "provider": "ollama" if ollama_alive else "mock_grounded_engine_fallback",
            "model": settings.OLLAMA_MODEL,
            "status": "online" if ollama_alive else "fallback_active",
            "realtime": ollama_alive,
            "fallback_allowed": True,
            "license_note": "Local Ollama + open-weight models; no paid cloud LLM required",
        },
        "market_data_providers": [
            {
                "name": "yfinance",
                "status": "active",
                "realtime": True,
                "license_note": "Apache-2.0 library; upstream quotes are delayed public web data for personal research — not a licensed commercial feed",
            },
            {
                "name": "synthetic_mock_engine",
                "status": "enabled_dev_only" if mock_markets else "disabled",
                "realtime": False,
                "detail": "Only when USE_MOCK_MARKET_DATA=true — never silent in production path",
            },
        ],
        "policy": {
            "fake_market_data": False if not mock_markets else True,
            "llm_fallback_on_ollama_down": True,
            "news_placeholders": False,
            "deployment_mode": "personal_research_oss",
            "no_brokerage": True,
            "no_paid_data_apis": True,
        },
    }


@router.get("/compliance")
async def get_compliance_governance():
    """
    EU + US informational / research posture, open-source stack, and free-data attribution.
    This is product transparency — not a lawyer certification or guarantee against third-party claims.
    """
    return {
        "jurisdiction": "European Union & United States (informational research build)",
        "product_mode": "Personal / educational research terminal — not a broker, exchange, or paid data vendor",
        "not_legal_advice": (
            "These statements describe how AIP Markets is designed. They are not legal advice and do not "
            "guarantee that you will never receive a notice. If you commercialize, redistribute market data, "
            "or offer advice to others, obtain qualified legal counsel."
        ),
        "frameworks_assessed": [
            {
                "regulation": "GDPR (EU) / privacy by design",
                "region": "EU",
                "status": "Designed for minimal personal data",
                "measures": (
                    "No user accounts, no advertising IDs, no analytics SDKs, no cloud customer CRM in this build. "
                    "Quotes, news, and research notes stay on the machine/server you run. Theme and watchlist "
                    "preferences use browser localStorage only. Do not paste personal data into prompts."
                ),
            },
            {
                "regulation": "EU AI Act transparency",
                "region": "EU",
                "status": "Informational / research contextualizer (not automated trading)",
                "measures": (
                    "AI (local Ollama) may draft research text from quant outputs and cited headlines. "
                    "It must not invent prices. Humans remain in the loop. No automated order execution."
                ),
            },
            {
                "regulation": "MiFID II non-advice boundary",
                "region": "EU",
                "status": "Informational research only",
                "measures": (
                    "Not personalized investment advice, not portfolio management, not a recommendation to buy/sell. "
                    "Scenario paths are model estimates for education/research."
                ),
            },
            {
                "regulation": "US — not investment advice (SEC / general)",
                "region": "US",
                "status": "General information / education",
                "measures": (
                    "Content is general market information and research tooling. It is not a solicitation, "
                    "not personalized advice under the Advisers Act framing for this demo, and not an offer of securities. "
                    "No brokerage, custody, or order routing."
                ),
            },
            {
                "regulation": "US CFTC / commodity & crypto research framing",
                "region": "US",
                "status": "Non-advice research views only",
                "measures": (
                    "Commodity and crypto charts/scenarios are educational. Not trading recommendations; "
                    "no managed accounts; no claims of guaranteed returns."
                ),
            },
            {
                "regulation": "Accessibility basics",
                "region": "EU/US",
                "status": "Baseline practices",
                "measures": "Skip link, visible focus, light/dark themes, large touch targets, plain-language metric labels.",
            },
        ],
        "open_source_stack": [
            {"name": "FastAPI / Uvicorn / SQLAlchemy / Pydantic", "role": "Backend API", "license": "MIT / BSD-style OSS"},
            {"name": "Next.js / React / Tailwind / Recharts / Lucide", "role": "Frontend UI", "license": "MIT OSS"},
            {"name": "pandas / numpy / scipy / ta", "role": "Quant analytics", "license": "BSD / Apache OSS"},
            {"name": "yfinance", "role": "Quote/history client library", "license": "Apache-2.0 (upstream data ≠ Yahoo license grant)"},
            {"name": "feedparser + httpx", "role": "Public RSS client", "license": "BSD / BSD OSS"},
            {"name": "Ollama + open-weight models (e.g. Qwen)", "role": "Local LLM narrative", "license": "Local runtime; respect each model’s license"},
            {"name": "SQLite / aiosqlite", "role": "Local database", "license": "Public domain / MIT"},
        ],
        "free_data_sources": [
            {
                "name": "Market quotes & history",
                "provider": "yfinance → public delayed web quotes",
                "terms": (
                    "Free personal/research use with polite rate limits. Not a paid exchange feed. "
                    "Do not resell or republish bulk data as a commercial product."
                ),
            },
            {
                "name": "Markets news RSS",
                "provider": "Public/government & public-broadcaster feeds (e.g. Fed, ECB, BBC Business)",
                "terms": "Headlines linked to originals; snippets for research context; respect each outlet’s terms.",
            },
            {
                "name": "World news RSS",
                "provider": "Public broadcasters & IGOs (BBC, NPR, DW, UN, WHO, NASA, etc.)",
                "terms": "General knowledge only — excluded from research analysis pipeline.",
            },
            {
                "name": "LLM research notes",
                "provider": "Local Ollama (optional mock synthesizer if offline)",
                "terms": "No paid cloud LLM API required. Runs on your hardware when Ollama is installed.",
            },
        ],
        "prohibited_by_design": [
            "Brokerage / order entry / custody",
            "Paid proprietary market-data APIs (Bloomberg, Refinitiv, etc.)",
            "User tracking ads or sale of personal data",
            "Claiming forecasts are guaranteed or personalized advice",
        ],
        "operator_responsibilities": [
            "Run for personal research or obtain counsel before commercial hosting",
            "Do not scrape aggressively — honor rate limits",
            "Attribute news outlets; link back to source URLs",
            "Keep Ollama/models’ licenses if you redistribute the stack",
            "This demo does not replace KYC/AML, licensing, or data contracts for a real business",
        ],
        "disclaimer_text": (
            "AIP Markets is an informational research terminal built on open-source software and free public data sources. "
            "It is not a broker-dealer, investment adviser, commodity trading advisor, credit rating agency, or exchange. "
            "Nothing here is investment, tax, or legal advice. Markets involve risk of loss. Model scenarios are probabilistic "
            "and can be wrong. Past performance does not guarantee future results. Upstream quote and news providers may "
            "change or restrict access; this app does not sell or guarantee their data. Operators must comply with Yahoo/public "
            "feed terms, RSS outlet terms, and applicable EU/US law for their own deployment."
        ),
        "short_banner": "Research only · not advice · free OSS + public data · EU/US informational posture",
    }
