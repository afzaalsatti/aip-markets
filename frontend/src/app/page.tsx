'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { TickerBar } from '@/components/TickerBar';
import { MarketOverview } from '@/components/MarketOverview';
import { InteractiveChart } from '@/components/InteractiveChart';
import { TechnicalSignalsCard } from '@/components/TechnicalSignalsCard';
import { IndicatorsPanel } from '@/components/IndicatorsPanel';
import { AnalysisBrief } from '@/components/AnalysisBrief';
import { AIReportViewer } from '@/components/AIReportViewer';
import { NewsFeed } from '@/components/NewsFeed';
import { ModelPerformanceView } from '@/components/ModelPerformanceView';
import { ScenarioCards } from '@/components/ScenarioCards';
import { DataFreshness, type FreshnessInfo } from '@/components/DataFreshness';
import { AutoRefreshControl } from '@/components/AutoRefreshControl';
import { CompliancePanel } from '@/components/CompliancePanel';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { HORIZON_LABELS } from '@/lib/plainLanguage';

import {
  fetchMarketOverview,
  fetchAssetDetail,
  fetchAssetHistory,
  fetchAssetForecast,
  fetchAIResearchReport,
  fetchNewsFeed,
  fetchModelPerformance,
  fetchCompliance,
  type NewsArticle,
  type NewsScope,
} from '@/lib/api';

/** Auto-refresh intervals (ms) — heavier endpoints refresh less often */
const REFRESH_MS = {
  quotes: 45_000,
  chart: 60_000,
  news: 120_000,
  models: 300_000,
  researchInputs: 90_000,
} as const;

const VALID_TABS = new Set([
  'overview',
  'terminal',
  'ai-report',
  'news',
  'calibration',
  'governance',
]);

const TAB_LABELS: Record<string, string> = {
  overview: 'Markets',
  terminal: 'Chart',
  'ai-report': 'Research',
  news: 'News',
  calibration: 'Models',
  governance: 'Disclosures',
};

const ASSET_OPTIONS = [
  { group: 'Commodities', items: [
    { value: 'GC=F', label: 'Gold (GC=F)' },
    { value: 'SI=F', label: 'Silver (SI=F)' },
    { value: 'CL=F', label: 'WTI Crude (CL=F)' },
    { value: 'BZ=F', label: 'Brent (BZ=F)' },
    { value: 'NG=F', label: 'Nat Gas (NG=F)' },
    { value: 'HG=F', label: 'Copper (HG=F)' },
  ]},
  { group: 'Equities & ETFs', items: [
    { value: 'AAPL', label: 'Apple (AAPL)' },
    { value: 'NVDA', label: 'NVIDIA (NVDA)' },
    { value: 'MSFT', label: 'Microsoft (MSFT)' },
    { value: 'AMZN', label: 'Amazon (AMZN)' },
    { value: 'GOOGL', label: 'Alphabet (GOOGL)' },
    { value: 'META', label: 'Meta (META)' },
    { value: 'TSLA', label: 'Tesla (TSLA)' },
    { value: 'JPM', label: 'JPMorgan (JPM)' },
    { value: 'XOM', label: 'Exxon (XOM)' },
    { value: 'JNJ', label: 'J&J (JNJ)' },
    { value: 'SPY', label: 'S&P 500 ETF (SPY)' },
    { value: 'QQQ', label: 'Nasdaq-100 ETF (QQQ)' },
  ]},
  { group: 'Forex', items: [
    { value: 'EURUSD=X', label: 'EUR/USD' },
    { value: 'GBPUSD=X', label: 'GBP/USD' },
    { value: 'USDJPY=X', label: 'USD/JPY' },
    { value: 'AUDUSD=X', label: 'AUD/USD' },
    { value: 'USDCAD=X', label: 'USD/CAD' },
    { value: 'USDCHF=X', label: 'USD/CHF' },
  ]},
  { group: 'Crypto', items: [
    { value: 'BTC-USD', label: 'Bitcoin' },
    { value: 'ETH-USD', label: 'Ethereum' },
    { value: 'SOL-USD', label: 'Solana' },
    { value: 'XRP-USD', label: 'XRP' },
  ]},
  { group: 'Fixed income', items: [
    { value: '^TNX', label: 'US 10Y Yield' },
    { value: '^IRX', label: 'US 13W T-Bill' },
    { value: 'TLT', label: '20Y+ Treasury (TLT)' },
    { value: 'BND', label: 'Total Bond ETF' },
  ]},
];

const HISTORY_RANGES = [
  { days: 30, label: '30D' },
  { days: 90, label: '90D' },
  { days: 180, label: '180D' },
  { days: 365, label: '1Y' },
];

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedSymbol, setSelectedSymbol] = useState('GC=F');
  const [selectedHorizon, setSelectedHorizon] = useState('1m');
  const [historyDays, setHistoryDays] = useState(90);
  const [searchQuery, setSearchQuery] = useState('');
  const [canGoBack, setCanGoBack] = useState(false);
  const [backLabel, setBackLabel] = useState('Back');
  const tabHistoryRef = useRef<string[]>([]);
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  const [marketData, setMarketData] = useState<any>(null);
  const [assetDetail, setAssetDetail] = useState<any>(null);
  const [assetHistory, setAssetHistory] = useState<any[]>([]);
  const [forecast, setForecast] = useState<any>(null);
  const [aiReport, setAiReport] = useState<any>(null);
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);
  const [newsScope, setNewsScope] = useState<Exclude<NewsScope, 'all'>>('markets');
  const [newsNote, setNewsNote] = useState<string | undefined>();
  const [newsSyncInfo, setNewsSyncInfo] = useState<string | null>(null);
  const [newsFreshness, setNewsFreshness] = useState<FreshnessInfo | null>(null);
  const [modelPerf, setModelPerf] = useState<any>(null);
  const [compliance, setCompliance] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [isNewsRefreshing, setIsNewsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('aip_theme', theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  useEffect(() => {
    const saved = localStorage.getItem('aip_theme');
    if (saved === 'dark' || saved === 'light') setTheme(saved);
    const ar = localStorage.getItem('aip_auto_refresh');
    if (ar === '0') setAutoRefresh(false);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('aip_auto_refresh', autoRefresh ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [autoRefresh]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && VALID_TABS.has(tab)) setActiveTab(tab);
  }, [searchParams]);

  const syncBackState = useCallback(() => {
    const prev = tabHistoryRef.current[tabHistoryRef.current.length - 1];
    setCanGoBack(tabHistoryRef.current.length > 0);
    setBackLabel(prev ? `Back to ${TAB_LABELS[prev] || prev}` : 'Back');
  }, []);

  const changeTab = useCallback(
    (
      tab: string,
      opts?: { fromBack?: boolean; pushHistory?: boolean }
    ) => {
      if (!VALID_TABS.has(tab)) return;
      const current = activeTabRef.current;
      if (tab === current && !opts?.fromBack) {
        if (typeof window !== 'undefined') window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        return;
      }
      if (!opts?.fromBack) {
        if (opts?.pushHistory && tab !== current) {
          // Drill-in (e.g. Markets → Chart): remember where we came from
          tabHistoryRef.current = [...tabHistoryRef.current.slice(-11), current];
        } else {
          // Primary nav / bottom bar: start a fresh path
          tabHistoryRef.current = [];
        }
        syncBackState();
      }
      activeTabRef.current = tab;
      setActiveTab(tab);
      try {
        const params = new URLSearchParams(searchParams.toString());
        if (tab === 'overview') params.delete('tab');
        else params.set('tab', tab);
        const qs = params.toString();
        router.replace(qs ? `/?${qs}` : '/', { scroll: false });
      } catch {
        /* ignore */
      }
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      }
    },
    [router, searchParams, syncBackState]
  );

  const goBack = useCallback(() => {
    const prev = tabHistoryRef.current.pop();
    syncBackState();
    changeTab(prev || 'overview', { fromBack: true });
  }, [changeTab, syncBackState]);

  const refreshQuotes = useCallback(async () => {
    const mOverview = await fetchMarketOverview();
    setMarketData(mOverview);
  }, []);

  const refreshChart = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!selectedSymbol) return;
      if (!opts?.silent) setIsChartLoading(true);
      try {
        const [detail, historyRes, fc] = await Promise.all([
          fetchAssetDetail(selectedSymbol),
          fetchAssetHistory(selectedSymbol, historyDays),
          fetchAssetForecast(selectedSymbol, selectedHorizon),
        ]);
        setAssetDetail(detail);
        setAssetHistory(historyRes.data || []);
        setForecast(fc);
      } finally {
        if (!opts?.silent) setIsChartLoading(false);
      }
    },
    [selectedSymbol, historyDays, selectedHorizon]
  );

  const refreshResearch = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!selectedSymbol) return;
      if (!opts?.silent) setIsReportLoading(true);
      try {
        const report = await fetchAIResearchReport(selectedSymbol, selectedHorizon);
        setAiReport(report);
      } finally {
        if (!opts?.silent) setIsReportLoading(false);
      }
    },
    [selectedSymbol, selectedHorizon]
  );

  const applyNewsPayload = useCallback((news: Awaited<ReturnType<typeof fetchNewsFeed>>) => {
    setNewsArticles(Array.isArray(news.articles) ? news.articles : []);
    setNewsNote(news.note);
    setNewsFreshness(news.freshness || null);
    if (news.sync) {
      const s = news.sync;
      setNewsSyncInfo(
        s.error
          ? `Sync issue: ${s.error}`
          : `Fetched ${s.fetched ?? '—'} · new ${s.synced_new ?? 0}`
      );
    } else {
      setNewsSyncInfo(null);
    }
  }, []);

  const loadNews = useCallback(
    async (scope: Exclude<NewsScope, 'all'>, refresh: boolean, opts?: { silent?: boolean }) => {
      if (!opts?.silent) setIsNewsRefreshing(true);
      try {
        const news = await fetchNewsFeed(refresh, scope, { limit: 60 });
        applyNewsPayload(news);
      } finally {
        if (!opts?.silent) setIsNewsRefreshing(false);
      }
    },
    [applyNewsPayload]
  );

  const refreshModels = useCallback(async () => {
    const perf = await fetchModelPerformance();
    setModelPerf(perf);
  }, []);

  useEffect(() => {
    async function loadInitialData() {
      setLoading(true);
      const [mOverview, news, perf, gov] = await Promise.all([
        fetchMarketOverview(),
        fetchNewsFeed(false, 'markets'),
        fetchModelPerformance(),
        fetchCompliance(),
      ]);
      setMarketData(mOverview);
      applyNewsPayload(news);
      setModelPerf(perf);
      setCompliance(gov);
      setLoading(false);
    }
    loadInitialData();
  }, [applyNewsPayload]);

  // Chart workspace: detail + history + forecast when symbol/range/tab changes
  useEffect(() => {
    if (activeTab !== 'terminal' && activeTab !== 'ai-report') return;
    void refreshChart({ silent: false });
  }, [selectedSymbol, selectedHorizon, historyDays, activeTab, refreshChart]);

  // Lazy-load research report only on Research tab / symbol change (not on auto interval)
  useEffect(() => {
    if (activeTab !== 'ai-report' || !selectedSymbol) return;
    void refreshResearch({ silent: false });
  }, [activeTab, selectedSymbol, selectedHorizon, refreshResearch]);

  // Pull live RSS whenever the News tab is opened
  useEffect(() => {
    if (activeTab !== 'news') return;
    void loadNews(newsScope, true);
  }, [activeTab, newsScope, loadNews]);

  // Slow quote polling when Yahoo is rate-limiting so we don't keep the ban alive
  const quotesUnavailable = marketData?.freshness?.status === 'unavailable';
  const quotesCachedOnly =
    marketData?.freshness?.status === 'degraded' && !marketData?.freshness?.realtime;
  const quotesIntervalMs = quotesUnavailable
    ? 180_000
    : quotesCachedOnly
      ? 90_000
      : REFRESH_MS.quotes;

  // --- Auto-refresh (paused when tab hidden) ---
  const quotesRefresh = useAutoRefresh(
    () => refreshQuotes(),
    { intervalMs: quotesIntervalMs, enabled: autoRefresh, active: true }
  );

  const chartRefresh = useAutoRefresh(
    () => refreshChart({ silent: true }),
    {
      intervalMs: REFRESH_MS.chart,
      enabled: autoRefresh,
      active: activeTab === 'terminal',
    }
  );

  const newsRefresh = useAutoRefresh(
    () => loadNews(newsScope, true, { silent: true }),
    {
      intervalMs: REFRESH_MS.news,
      enabled: autoRefresh,
      active: activeTab === 'news',
    }
  );

  const modelsRefresh = useAutoRefresh(
    () => refreshModels(),
    {
      intervalMs: REFRESH_MS.models,
      enabled: autoRefresh,
      active: activeTab === 'calibration',
    }
  );

  // Research tab: refresh market inputs quietly; full LLM note stays on-demand / tab enter
  const researchInputsRefresh = useAutoRefresh(
    () => refreshChart({ silent: true }),
    {
      intervalMs: REFRESH_MS.researchInputs,
      enabled: autoRefresh,
      active: activeTab === 'ai-report',
    }
  );

  const openGuide = (topic: string) => {
    router.push(`/guide?topic=${encodeURIComponent(topic || 'welcome')}`);
  };

  const handleSelectAsset = (symbol: string) => {
    setSelectedSymbol(symbol);
    changeTab('terminal', { pushHistory: true });
  };

  const handleGenerateReport = (symbol: string) => {
    setSelectedSymbol(symbol);
    changeTab('ai-report', { pushHistory: true });
  };

  const handleNewsScopeChange = (scope: Exclude<NewsScope, 'all'>) => {
    setNewsScope(scope);
  };

  const refreshNews = () => loadNews(newsScope, true);

  const activeRefresh = useMemo(() => {
    switch (activeTab) {
      case 'overview':
        return {
          ...quotesRefresh,
          intervalLabel: quotesUnavailable
            ? 'Quotes paused (Yahoo limit) · retry ~3m'
            : quotesCachedOnly
              ? `Cached quotes · retry every ${quotesIntervalMs / 1000}s`
              : `Quotes every ${quotesIntervalMs / 1000}s`,
          onRefreshNow: () => quotesRefresh.runNow(),
        };
      case 'terminal':
        return {
          ...chartRefresh,
          intervalLabel: `Chart every ${REFRESH_MS.chart / 1000}s`,
          onRefreshNow: () => chartRefresh.runNow(),
        };
      case 'news':
        return {
          ...newsRefresh,
          intervalLabel: `News every ${REFRESH_MS.news / 1000}s`,
          onRefreshNow: () => newsRefresh.runNow(),
        };
      case 'calibration':
        return {
          ...modelsRefresh,
          intervalLabel: `Models every ${REFRESH_MS.models / 60000}m`,
          onRefreshNow: () => modelsRefresh.runNow(),
        };
      case 'ai-report':
        return {
          ...researchInputsRefresh,
          intervalLabel: `Inputs every ${REFRESH_MS.researchInputs / 1000}s · note on demand`,
          onRefreshNow: () => refreshResearch({ silent: false }),
        };
      default:
        return {
          ...quotesRefresh,
          intervalLabel: `Quotes every ${quotesIntervalMs / 1000}s`,
          onRefreshNow: () => quotesRefresh.runNow(),
        };
    }
  }, [
    activeTab,
    quotesRefresh,
    chartRefresh,
    newsRefresh,
    modelsRefresh,
    researchInputsRefresh,
    refreshResearch,
    quotesUnavailable,
    quotesCachedOnly,
    quotesIntervalMs,
  ]);

  const statusLine = useMemo(() => {
    const n = marketData?.active_assets_count ?? marketData?.assets?.length ?? 0;
    const live = marketData?.live_quotes_count ?? 0;
    const ts = marketData?.timestamp
      ? new Date(marketData.timestamp).toLocaleString()
      : '—';
    const cached = marketData?.cached_quotes_count ?? 0;
    const status = marketData?.freshness?.status;
    const liveLabel = marketData?.freshness?.realtime
      ? `Live ${live}/${n}`
      : cached > 0 || status === 'degraded'
        ? `Cached quotes ${cached || live}/${n}`
        : 'Quotes unavailable';
    const auto = autoRefresh ? 'auto on' : 'auto off';
    return `${n} instruments · ${liveLabel} · ${auto} · as of ${ts}`;
  }, [marketData, autoRefresh]);

  const priceUp = (assetDetail?.price_change_percent_24h ?? 0) >= 0;

  return (
    <div className="app-shell min-h-screen flex flex-col pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] md:pb-0">
      <Header
        activeTab={activeTab}
        setActiveTab={changeTab}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          // Jump to Markets to filter the screener without cluttering Back history
          if (q.trim() && activeTabRef.current !== 'overview') {
            changeTab('overview', { fromBack: true });
          }
        }}
        searchAssets={marketData?.assets || []}
        onSelectSymbol={handleSelectAsset}
        onOpenResearch={handleGenerateReport}
        canGoBack={canGoBack}
        backLabel={backLabel}
        onBack={goBack}
      />

      {marketData?.assets && (
        <TickerBar
          assets={marketData.assets}
          onSelectAsset={handleSelectAsset}
          realtime={Boolean(marketData?.freshness?.realtime)}
        />
      )}

      <div
        className="border-b px-3 md:px-4 py-1.5 sticky z-30"
        style={{
          background: 'var(--bg-surface-elevated)',
          borderColor: 'var(--border-color)',
          top: marketData?.assets
            ? 'calc(var(--header-h, 56px) + var(--ticker-h, 40px) + env(safe-area-inset-top, 0px))'
            : 'calc(var(--header-h, 56px) + env(safe-area-inset-top, 0px))',
        }}
      >
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-2 flex-wrap">
          <AutoRefreshControl
            enabled={autoRefresh}
            onToggle={() => setAutoRefresh((v) => !v)}
            intervalLabel={activeRefresh.intervalLabel}
            lastRanAt={activeRefresh.lastRanAt}
            isRunning={activeRefresh.isRunning || quotesRefresh.isRunning}
            onRefreshNow={activeRefresh.onRefreshNow}
            compact
          />
          <span className="text-[10px] hidden sm:inline" style={{ color: 'var(--text-muted)' }}>
            Quotes always refresh in background when Auto is on · pauses in background tabs
          </span>
          <span
            className="text-[10px] sm:hidden truncate max-w-full"
            style={{ color: 'var(--text-muted)' }}
            title={statusLine}
          >
            {statusLine}
          </span>
        </div>
      </div>

      <main id="main-content" className="flex-1 w-full max-w-[1600px] mx-auto px-3 md:px-4 py-3 md:py-4">
          <>
            {activeTab === 'overview' && (
              loading && !marketData?.assets?.length ? (
                <section className="panel p-4 space-y-3" aria-busy="true" aria-label="Loading screener">
                  <div className="h-4 w-44 rounded skeleton" />
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="h-8 w-16 rounded skeleton" />
                    ))}
                  </div>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i} className="h-12 rounded skeleton" />
                  ))}
                  <p className="text-center text-[12px]" style={{ color: 'var(--text-muted)' }}>
                    Loading live quotes…
                  </p>
                </section>
              ) : marketData?.assets?.length ? (
                <MarketOverview
                  assets={marketData.assets}
                  onSelectAsset={handleSelectAsset}
                  onGenerateReport={handleGenerateReport}
                  searchQuery={searchQuery}
                  selectedSymbol={selectedSymbol}
                  freshness={marketData.freshness}
                />
              ) : (
                <div className="panel p-8 text-center space-y-2">
                  <DataFreshness realtime={false} label="Quotes unavailable" />
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    Live market data could not be loaded. Start the API at{' '}
                    <span className="mono">localhost:8000</span> — no placeholder prices are shown.
                  </p>
                </div>
              )
            )}

            {activeTab === 'terminal' && (
              <section className="space-y-3" aria-labelledby="chart-heading">
                <div className="panel">
                  <div className="panel-head">
                    <div className="w-full space-y-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 id="chart-heading" className="text-base md:text-sm font-bold">
                            Asset chart
                          </h2>
                          <DataFreshness
                            freshness={assetDetail?.freshness || forecast?.freshness}
                            realtime={Boolean(assetDetail?.freshness?.realtime)}
                            label={assetDetail?.freshness?.realtime ? 'Live market data' : undefined}
                          />
                        </div>
                        <button
                          type="button"
                          className="btn btn-primary touch-target hidden sm:inline-flex"
                          onClick={() => changeTab('ai-report', { pushHistory: true })}
                        >
                          Open research
                        </button>
                      </div>

                      <label className="block text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                        Symbol
                      </label>
                      <select
                        value={selectedSymbol}
                        onChange={(e) => setSelectedSymbol(e.target.value)}
                        className="w-full min-h-11 md:min-h-8 md:h-8 px-3 md:px-2 text-base md:text-xs font-semibold mono border outline-none"
                        style={{
                          background: 'var(--bg-primary)',
                          borderColor: 'var(--border-color)',
                          color: 'var(--text-primary)',
                          borderRadius: 'var(--radius)',
                        }}
                      >
                        {ASSET_OPTIONS.map((g) => (
                          <optgroup key={g.group} label={g.group}>
                            {g.items.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>

                      <div
                        className="inline-flex border w-full"
                        style={{ borderColor: 'var(--border-color)' }}
                        aria-label="History range"
                      >
                        {HISTORY_RANGES.map((r) => (
                          <button
                            key={r.days}
                            type="button"
                            className="seg-btn flex-1"
                            style={{
                              background: historyDays === r.days ? 'var(--accent)' : 'var(--bg-surface)',
                              color: historyDays === r.days ? '#fff' : 'var(--text-secondary)',
                            }}
                            onClick={() => setHistoryDays(r.days)}
                          >
                            {r.label}
                          </button>
                        ))}
                      </div>

                      {assetDetail && (
                        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[13px] md:text-xs mono">
                          <div>
                            <span style={{ color: 'var(--text-muted)' }}>Last </span>
                            <strong className="text-xl md:text-base">
                              {assetDetail.latest_price == null
                                ? '—'
                                : assetDetail.latest_price.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 4,
                                  })}
                            </strong>
                          </div>
                          <div className={assetDetail.price_change_percent_24h == null ? '' : priceUp ? 'up' : 'down'}>
                            <strong>
                              {assetDetail.price_change_percent_24h == null
                                ? '—'
                                : `${priceUp ? '+' : ''}${assetDetail.price_change_percent_24h.toFixed(2)}%`}
                            </strong>
                            <span className="ml-1" style={{ color: 'var(--text-muted)' }}>24h</span>
                          </div>
                          <div style={{ color: 'var(--text-secondary)' }}>
                            {assetDetail.asset_class || '—'} · {assetDetail.exchange || '—'}
                          </div>
                        </div>
                      )}
                      {assetDetail?.error && (
                        <p className="text-[12px]" style={{ color: 'var(--warn)' }}>{assetDetail.error}</p>
                      )}
                      {forecast?.error && (
                        <p className="text-[12px]" style={{ color: 'var(--warn)' }}>
                          Forecast: {typeof forecast.error === 'string' ? forecast.error : 'unavailable'}
                        </p>
                      )}

                      <button
                        type="button"
                        className="btn btn-primary touch-target w-full sm:hidden"
                        onClick={() => changeTab('ai-report', { pushHistory: true })}
                      >
                        Open research
                      </button>
                    </div>
                  </div>
                </div>

                <AnalysisBrief
                  brief={forecast?.analysis_brief || assetDetail?.analysis_brief}
                  onOpenGuide={openGuide}
                />

                {assetDetail && forecast && (
                  <TechnicalSignalsCard
                    symbol={selectedSymbol}
                    rsi={assetDetail.rsi_14}
                    volatility30d={assetDetail.volatility_30d}
                    trend={forecast.trend_classification || assetDetail.trend_classification || '—'}
                    var95={forecast.value_at_risk_95}
                    latestPrice={assetDetail.latest_price}
                    sharpeRatio={assetDetail.sharpe_ratio}
                    sortinoRatio={assetDetail.sortino_ratio}
                    betaMarket={assetDetail.beta_market}
                    betaBenchmark={assetDetail.beta_benchmark}
                    maxDrawdownPct={assetDetail.max_drawdown_pct}
                    cvar95Pct={assetDetail.cvar_95_pct}
                    onOpenGuide={openGuide}
                  />
                )}

                <IndicatorsPanel
                  symbol={selectedSymbol}
                  indicators={assetDetail}
                  latestPrice={assetDetail?.latest_price}
                />

                <InteractiveChart
                  symbol={selectedSymbol}
                  history={assetHistory}
                  forecastTrajectory={forecast?.trajectory_points}
                  selectedHorizon={selectedHorizon}
                  onHorizonChange={setSelectedHorizon}
                  theme={theme}
                  isLoading={isChartLoading}
                />

                {forecast && !forecast.error && forecast.base_scenario && (
                  <ScenarioCards
                    bullish={forecast.bullish_scenario}
                    base={forecast.base_scenario}
                    bearish={forecast.bearish_scenario}
                    horizonPlain={HORIZON_LABELS[selectedHorizon]?.plain || selectedHorizon}
                    stressLoss={forecast.value_at_risk_95}
                    currency={assetDetail?.currency}
                    assetClass={assetDetail?.asset_class}
                  />
                )}
              </section>
            )}

            {activeTab === 'ai-report' && (
              <section className="space-y-3" aria-labelledby="research-heading">
                <div className="panel">
                  <div className="panel-head flex-wrap gap-2">
                    <div>
                      <h2 id="research-heading" className="text-base md:text-sm font-bold">
                        Research note
                      </h2>
                      <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                        Grounded in quant outputs + markets headlines · LLM does not invent prices
                      </p>
                    </div>
                    <DataFreshness
                      freshness={aiReport?.freshness}
                      realtime={Boolean(aiReport?.freshness?.realtime)}
                      label={isReportLoading ? 'Generating…' : undefined}
                    />
                  </div>
                  <div className="p-3 md:p-4 space-y-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
                    <label className="block text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                      Symbol
                    </label>
                    <select
                      value={selectedSymbol}
                      onChange={(e) => setSelectedSymbol(e.target.value)}
                      className="w-full min-h-11 md:min-h-8 md:h-8 px-3 md:px-2 text-base md:text-xs font-semibold mono border outline-none"
                      style={{
                        background: 'var(--bg-primary)',
                        borderColor: 'var(--border-color)',
                        color: 'var(--text-primary)',
                        borderRadius: 'var(--radius)',
                      }}
                    >
                      {ASSET_OPTIONS.map((g) => (
                        <optgroup key={g.group} label={g.group}>
                          {g.items.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                </div>
                {isReportLoading ? (
                  <div className="panel p-10 text-center text-sm space-y-3" style={{ color: 'var(--text-muted)' }}>
                    <div className="h-3 w-48 mx-auto rounded skeleton" />
                    <div className="h-3 w-64 mx-auto rounded skeleton" />
                    <div className="h-3 w-40 mx-auto rounded skeleton" />
                    <p>Generating research note for {selectedSymbol}…</p>
                  </div>
                ) : aiReport && !aiReport.error ? (
                  <AIReportViewer report={aiReport} onOpenGuide={openGuide} />
                ) : (
                  <div className="panel p-8 text-center space-y-2">
                    <DataFreshness realtime={false} label="Research unavailable" />
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      {aiReport?.error || 'Need live market data to build a research note. No placeholder report is shown.'}
                    </p>
                  </div>
                )}
              </section>
            )}

            {activeTab === 'news' && (
              <NewsFeed
                articles={newsArticles}
                scope={newsScope}
                onScopeChange={handleNewsScopeChange}
                onRefresh={refreshNews}
                isRefreshing={isNewsRefreshing}
                note={newsNote}
                syncInfo={newsSyncInfo}
                freshness={newsFreshness}
              />
            )}

            {activeTab === 'calibration' && (
              modelPerf?.models?.length ? (
                <ModelPerformanceView
                  models={modelPerf.models}
                  evaluationTime={modelPerf.evaluation_timestamp}
                  methodology={modelPerf.methodology}
                  freshness={modelPerf.freshness}
                />
              ) : (
                <div className="panel p-8 text-center space-y-2">
                  <DataFreshness realtime={false} label="Models unavailable" />
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    Walk-forward metrics need live history. No placeholder scores are shown.
                  </p>
                </div>
              )
            )}

            {activeTab === 'governance' && <CompliancePanel compliance={compliance} />}
          </>
      </main>

      <footer
        className="hidden md:flex border-t text-[11px] px-3 md:px-4 py-2 flex-wrap justify-between gap-2"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
      >
        <span>{statusLine}</span>
        <span>
          {compliance?.short_banner ||
            'AIP Markets · research only · not advice · free OSS + public data'}
        </span>
      </footer>

      <MobileBottomNav activeTab={activeTab} setActiveTab={changeTab} />
    </div>
  );
}
