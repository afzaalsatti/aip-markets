import type { FreshnessInfo } from '@/components/DataFreshness';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export type { FreshnessInfo };

const unavailableFreshness = (detail: string): FreshnessInfo => ({
  source: 'client',
  realtime: false,
  status: 'unavailable',
  as_of: new Date().toISOString(),
  detail,
});

export async function fetchMarketOverview() {
  try {
    const res = await fetch(`${API_BASE_URL}/markets/overview`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch market overview');
    return await res.json();
  } catch {
    return {
      timestamp: new Date().toISOString(),
      market_regime: null,
      active_assets_count: 0,
      live_quotes_count: 0,
      unavailable_count: 0,
      assets: [],
      freshness: unavailableFreshness('API unreachable — no quote placeholders shown'),
      error: 'unavailable',
    };
  }
}

export async function fetchAssetDetail(symbol: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/assets/${encodeURIComponent(symbol)}`, {
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('Failed to fetch asset detail');
    return await res.json();
  } catch {
    return {
      symbol,
      name: symbol,
      available: false,
      latest_price: null,
      analysis_brief: null,
      freshness: unavailableFreshness('Live asset detail unavailable'),
      error: 'unavailable',
    };
  }
}

export async function fetchAssetHistory(symbol: string, days: number = 90) {
  try {
    const res = await fetch(
      `${API_BASE_URL}/assets/${encodeURIComponent(symbol)}/history?days=${days}`,
      { cache: 'no-store' }
    );
    if (!res.ok) throw new Error('Failed to fetch asset history');
    return await res.json();
  } catch {
    return {
      symbol,
      timeframe: '1d',
      days,
      data: [],
      available: false,
      freshness: unavailableFreshness('Live history unavailable'),
      error: 'unavailable',
    };
  }
}

export async function fetchAssetForecast(symbol: string, horizon: string = '1m') {
  try {
    const res = await fetch(
      `${API_BASE_URL}/assets/${encodeURIComponent(symbol)}/forecast?horizon=${horizon}`,
      { cache: 'no-store' }
    );
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return {
        symbol,
        horizon,
        available: false,
        error: detail || 'Forecast unavailable',
        freshness: unavailableFreshness('Live forecast unavailable'),
      };
    }
    return await res.json();
  } catch {
    return {
      symbol,
      horizon,
      available: false,
      error: 'unavailable',
      freshness: unavailableFreshness('API unreachable — no scenario placeholders'),
    };
  }
}

export async function fetchAIResearchReport(symbol: string, horizon: string = '1m') {
  try {
    const res = await fetch(
      `${API_BASE_URL}/assets/${encodeURIComponent(symbol)}/analysis?horizon=${horizon}`,
      { cache: 'no-store' }
    );
    if (!res.ok) {
      return {
        symbol,
        available: false,
        error: 'Research unavailable — need live market data and/or LLM',
        freshness: unavailableFreshness('Live research unavailable'),
        is_llm_fallback: false,
      };
    }
    return await res.json();
  } catch {
    return {
      symbol,
      available: false,
      error: 'unavailable',
      freshness: unavailableFreshness('API unreachable — no fake research note'),
      is_llm_fallback: false,
    };
  }
}

export async function fetchAssetIndicators(symbol: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/assets/${encodeURIComponent(symbol)}/indicators`, {
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('Failed to fetch indicators');
    return await res.json();
  } catch {
    return {
      symbol,
      summary: null,
      error: 'unavailable',
      freshness: unavailableFreshness('Indicators unavailable'),
    };
  }
}

/** Offline copy of /system/compliance — disclosure text only (no market numbers). */
const COMPLIANCE_FALLBACK = {
  jurisdiction: 'European Union & United States (informational research build)',
  product_mode:
    'Personal / educational research terminal — not a broker, exchange, or paid data vendor',
  not_legal_advice:
    'These statements describe how AIP Markets is designed. They are not legal advice and do not guarantee that you will never receive a notice. If you commercialize, redistribute market data, or offer advice to others, obtain qualified legal counsel.',
  frameworks_assessed: [
    {
      regulation: 'GDPR (EU) / privacy by design',
      region: 'EU',
      status: 'Designed for minimal personal data',
      measures:
        'No user accounts, no advertising IDs, no analytics SDKs in this build. Preferences use browser localStorage only.',
    },
    {
      regulation: 'EU AI Act transparency',
      region: 'EU',
      status: 'Informational / research contextualizer (not automated trading)',
      measures:
        'Local Ollama may draft research text from quant outputs and cited headlines. It must not invent prices. No automated order execution.',
    },
    {
      regulation: 'MiFID II non-advice boundary',
      region: 'EU',
      status: 'Informational research only',
      measures:
        'Not personalized investment advice, not portfolio management, not a recommendation to buy/sell.',
    },
    {
      regulation: 'US — not investment advice (SEC / general)',
      region: 'US',
      status: 'General information / education',
      measures:
        'General market information and research tooling. No brokerage, custody, or order routing.',
    },
    {
      regulation: 'US CFTC / commodity & crypto research framing',
      region: 'US',
      status: 'Non-advice research views only',
      measures: 'Commodity and crypto charts/scenarios are educational — not trading recommendations.',
    },
    {
      regulation: 'Accessibility basics',
      region: 'EU/US',
      status: 'Baseline practices',
      measures: 'Skip link, visible focus, light/dark themes, large touch targets, plain-language labels.',
    },
  ],
  open_source_stack: [
    { name: 'FastAPI / Uvicorn / SQLAlchemy / Pydantic', role: 'Backend API', license: 'MIT / BSD-style OSS' },
    { name: 'Next.js / React / Tailwind / Recharts / Lucide', role: 'Frontend UI', license: 'MIT OSS' },
    { name: 'pandas / numpy / scipy / ta', role: 'Quant analytics', license: 'BSD / Apache OSS' },
    { name: 'yfinance', role: 'Quote/history client library', license: 'Apache-2.0' },
    { name: 'feedparser + httpx', role: 'Public RSS client', license: 'BSD OSS' },
    { name: 'Ollama + open-weight models', role: 'Local LLM narrative', license: 'Local runtime' },
    { name: 'SQLite / aiosqlite', role: 'Local database', license: 'Public domain / MIT' },
  ],
  free_data_sources: [
    {
      name: 'Market quotes & history',
      provider: 'yfinance → public delayed web quotes',
      terms: 'Free personal/research use with polite rate limits. Not a paid exchange feed.',
    },
    {
      name: 'Markets news RSS',
      provider: 'Public/government & public-broadcaster feeds (Fed, ECB, SEC, BBC, NPR, DW)',
      terms: 'Headlines linked to originals; respect each outlet’s terms.',
    },
    {
      name: 'World news RSS',
      provider: 'Public broadcasters & IGOs (BBC, NPR, DW, UN, WHO, NASA)',
      terms: 'General knowledge only — excluded from research analysis.',
    },
    {
      name: 'LLM research notes',
      provider: 'Local Ollama (optional mock if offline)',
      terms: 'No paid cloud LLM API required.',
    },
  ],
  prohibited_by_design: [
    'Brokerage / order entry / custody',
    'Paid proprietary market-data APIs',
    'User tracking ads or sale of personal data',
    'Claiming forecasts are guaranteed or personalized advice',
  ],
  operator_responsibilities: [
    'Run for personal research or obtain counsel before commercial hosting',
    'Do not scrape aggressively — honor rate limits',
    'Attribute news outlets; link back to source URLs',
    'This demo does not replace KYC/AML, licensing, or data contracts for a real business',
  ],
  disclaimer_text:
    'AIP Markets is an informational research terminal built on open-source software and free public data sources. It is not a broker-dealer, investment adviser, commodity trading advisor, credit rating agency, or exchange. Nothing here is investment, tax, or legal advice. Markets involve risk of loss. Model scenarios are probabilistic and can be wrong. Past performance does not guarantee future results.',
  short_banner: 'Research only · not advice · free OSS + public data · EU/US informational posture',
};

export async function fetchCompliance() {
  try {
    const res = await fetch(`${API_BASE_URL}/system/compliance`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch compliance');
    return await res.json();
  } catch {
    return COMPLIANCE_FALLBACK;
  }
}

export async function fetchSystemHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/system/health`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch health');
    return await res.json();
  } catch {
    return null;
  }
}

export type NewsScope = 'markets' | 'world' | 'all';

export type NewsArticle = {
  id: number;
  title: string;
  url: string;
  source_name: string;
  summary: string;
  category: string;
  sentiment_score: number;
  impact_rating: string;
  published_at: string;
  formatted_datetime?: string;
  feed_scope?: 'markets' | 'world';
  used_in_analysis?: boolean;
};

export type NewsFeedResponse = {
  scope: NewsScope;
  count: number;
  refresh: boolean;
  sync?: { synced_new?: number; fetched?: number; error?: string } | null;
  articles: NewsArticle[];
  note?: string;
  realtime?: boolean;
  freshness?: FreshnessInfo;
};

function normalizeNewsResponse(data: unknown, scope: NewsScope, refresh: boolean): NewsFeedResponse {
  const worldNote =
    'World headlines are for general knowledge and are not used in research notes or forecasts.';
  const marketsNote = 'Markets headlines may be cited in research notes when relevant.';

  if (Array.isArray(data)) {
    return {
      scope,
      count: data.length,
      refresh,
      articles: data as NewsArticle[],
      note: scope === 'world' ? worldNote : marketsNote,
      realtime: false,
      freshness: unavailableFreshness('Legacy array response'),
    };
  }

  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    const raw = obj.articles;
    const articles = Array.isArray(raw) ? (raw as NewsArticle[]) : [];
    return {
      scope: (obj.scope as NewsScope) || scope,
      count: typeof obj.count === 'number' ? obj.count : articles.length,
      refresh: typeof obj.refresh === 'boolean' ? obj.refresh : refresh,
      sync: (obj.sync as NewsFeedResponse['sync']) ?? null,
      articles,
      note: typeof obj.note === 'string' ? obj.note : scope === 'world' ? worldNote : marketsNote,
      realtime: Boolean(obj.realtime),
      freshness: (obj.freshness as FreshnessInfo) || {
        source: 'rss',
        realtime: Boolean(obj.realtime),
        status: articles.length ? 'ok' : 'unavailable',
      },
    };
  }

  return {
    scope,
    count: 0,
    refresh,
    articles: [],
    note: scope === 'world' ? worldNote : marketsNote,
    realtime: false,
    freshness: unavailableFreshness('No news payload'),
  };
}

export async function fetchNewsFeed(
  refresh: boolean = false,
  scope: NewsScope = 'markets',
  opts?: { category?: string; source?: string; limit?: number; maxAgeHours?: number }
): Promise<NewsFeedResponse> {
  try {
    const params = new URLSearchParams();
    params.set('scope', scope);
    if (refresh) params.set('refresh', 'true');
    if (opts?.category) params.set('category', opts.category);
    if (opts?.source) params.set('source', opts.source);
    if (opts?.limit) params.set('limit', String(opts.limit));
    if (opts?.maxAgeHours) params.set('max_age_hours', String(opts.maxAgeHours));

    const res = await fetch(`${API_BASE_URL}/news?${params.toString()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch news');
    const data = await res.json();
    return normalizeNewsResponse(data, scope, refresh);
  } catch {
    return {
      scope,
      count: 0,
      refresh,
      articles: [],
      note: 'Live RSS unreachable — no placeholder headlines.',
      realtime: false,
      freshness: unavailableFreshness('RSS / API unreachable'),
    };
  }
}

export async function fetchNewsSources(scope?: 'markets' | 'world') {
  try {
    const q = scope ? `?scope=${scope}` : '';
    const res = await fetch(`${API_BASE_URL}/news/sources${q}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch news sources');
    return await res.json();
  } catch {
    return { sources: [], scopes: {} };
  }
}

export async function fetchModelPerformance() {
  try {
    const res = await fetch(`${API_BASE_URL}/models/performance`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch model performance');
    return await res.json();
  } catch {
    return {
      evaluation_timestamp: new Date().toISOString(),
      methodology: 'Unavailable offline',
      models: [],
      freshness: unavailableFreshness('Model metrics unavailable'),
      error: 'unavailable',
    };
  }
}
