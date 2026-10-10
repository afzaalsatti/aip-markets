import React, { useMemo, useState } from 'react';
import { ExternalLink, Globe2, LineChart, RefreshCw } from 'lucide-react';
import type { NewsArticle, NewsScope } from '@/lib/api';
import { DataFreshness, type FreshnessInfo } from './DataFreshness';

interface NewsFeedProps {
  articles: NewsArticle[];
  scope: Exclude<NewsScope, 'all'>;
  onScopeChange: (scope: Exclude<NewsScope, 'all'>) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  note?: string;
  syncInfo?: string | null;
  freshness?: FreshnessInfo | null;
}

const MARKET_CATEGORIES = [
  'All',
  'Central Banking & Monetary Policy',
  'Corporate Fundamentals & Earnings',
  'Geopolitics & Supply Chain',
  'Commodities & Reserve Assets',
  'Cryptocurrencies & Digital Assets',
  'General Market',
];

const WORLD_CATEGORIES = [
  'All',
  'World · Top Stories',
  'World · Geopolitics',
  'World · Science & Health',
  'World · Technology',
];

const SHORT: Record<string, string> = {
  'Central Banking & Monetary Policy': 'Central banks',
  'Corporate Fundamentals & Earnings': 'Earnings',
  'Geopolitics & Supply Chain': 'Geopolitics',
  'Commodities & Reserve Assets': 'Commodities',
  'Cryptocurrencies & Digital Assets': 'Crypto',
  'General Market': 'Markets',
  'World · Top Stories': 'Top stories',
  'World · Geopolitics': 'Geopolitics',
  'World · Science & Health': 'Science',
  'World · Technology': 'Tech',
};

/** Parse API timestamps as UTC when timezone is missing (avoids false "2h ago" in UTC+ locales). */
function parseArticleDate(pubDateStr: string): Date {
  const raw = (pubDateStr || '').trim();
  if (!raw) return new Date(NaN);
  // Already has timezone (Z or ±HH:MM)
  if (/[zZ]$|[+-]\d{2}:\d{2}$/.test(raw)) return new Date(raw);
  // Naive ISO from backend = UTC wall clock
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw)) return new Date(raw.endsWith('Z') ? raw : `${raw}Z`);
  // Locale-ish strings — best effort
  return new Date(raw);
}

function formatRelativeTime(pubDateStr: string): string {
  try {
    const dt = parseArticleDate(pubDateStr);
    if (Number.isNaN(dt.getTime())) return pubDateStr;
    const diffMs = Date.now() - dt.getTime();
    const mins = Math.round(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return dt.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return pubDateStr;
  }
}

function formatAbsoluteLocal(pubDateStr: string): string {
  try {
    return parseArticleDate(pubDateStr).toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return pubDateStr;
  }
}

function asArticleList(value: unknown): NewsArticle[] {
  if (Array.isArray(value)) return value;
  // Defensive: whole API payload accidentally passed as articles
  if (value && typeof value === 'object' && Array.isArray((value as { articles?: unknown }).articles)) {
    return (value as { articles: NewsArticle[] }).articles;
  }
  return [];
}

export const NewsFeed: React.FC<NewsFeedProps> = ({
  articles: articlesProp,
  scope,
  onScopeChange,
  onRefresh,
  isRefreshing = false,
  note: _note,
  syncInfo,
  freshness,
}) => {
  const [category, setCategory] = useState('All');
  const [source, setSource] = useState('All');
  const [recentOnly, setRecentOnly] = useState(true);
  const articles = asArticleList(articlesProp);

  const categories = scope === 'world' ? WORLD_CATEGORIES : MARKET_CATEGORIES;

  const sources = useMemo(() => {
    const set = new Set(articles.map((a) => a.source_name).filter(Boolean));
    return ['All', ...Array.from(set).sort()];
  }, [articles]);

  const filtered = useMemo(() => {
    const cutoff = Date.now() - 48 * 3600 * 1000;
    return articles.filter((a) => {
      const catOk = category === 'All' || a.category === category;
      const srcOk = source === 'All' || a.source_name === source;
      if (!catOk || !srcOk) return false;
      if (!recentOnly) return true;
      const t = parseArticleDate(a.published_at).getTime();
      return Number.isFinite(t) ? t >= cutoff : true;
    });
  }, [articles, category, source, recentOnly]);

  const newestLabel = useMemo(() => {
    if (!articles.length) return null;
    let newestIso = '';
    let newestTs = 0;
    for (const a of articles) {
      const t = parseArticleDate(a.published_at).getTime();
      if (t > newestTs) {
        newestTs = t;
        newestIso = a.published_at;
      }
    }
    if (!newestTs) return null;
    return formatRelativeTime(newestIso);
  }, [articles]);

  return (
    <section className="space-y-3" aria-labelledby="news-heading">
      <div className="panel">
        <div className="panel-head">
          <div className="flex flex-wrap items-center gap-2">
            <div>
              <h2 id="news-heading" className="text-base md:text-sm font-bold">News desk</h2>
              <p className="text-[12px] md:text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Multi-source RSS · pull on demand
              </p>
            </div>
            <DataFreshness
              freshness={freshness}
              realtime={Boolean(freshness?.realtime)}
              label={freshness?.realtime ? 'Live pull' : undefined}
            />
          </div>
          <button
            type="button"
            className="btn btn-primary touch-target w-full sm:w-auto"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Fetching…' : `Refresh ${scope === 'world' ? 'world' : 'markets'}`}
          </button>
        </div>

        <div className="p-3 space-y-3">
          <div
            className="inline-flex border w-full sm:w-auto"
            style={{ borderColor: 'var(--border-color)' }}
            role="tablist"
            aria-label="News scope"
          >
            <button
              type="button"
              role="tab"
              aria-selected={scope === 'markets'}
              className="seg-btn flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5"
              style={{
                background: scope === 'markets' ? 'var(--accent)' : 'var(--bg-surface)',
                color: scope === 'markets' ? '#fff' : 'var(--text-secondary)',
              }}
              onClick={() => {
                setCategory('All');
                setSource('All');
                onScopeChange('markets');
              }}
            >
              <LineChart className="w-3.5 h-3.5" />
              Markets
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={scope === 'world'}
              className="seg-btn flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5"
              style={{
                background: scope === 'world' ? 'var(--accent)' : 'var(--bg-surface)',
                color: scope === 'world' ? '#fff' : 'var(--text-secondary)',
              }}
              onClick={() => {
                setCategory('All');
                setSource('All');
                onScopeChange('world');
              }}
            >
              <Globe2 className="w-3.5 h-3.5" />
              World
            </button>
          </div>

          <div
            className="p-3 text-[13px] md:text-[12px] leading-relaxed"
            style={{
              background: scope === 'world' ? 'var(--warn-bg)' : 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
            }}
          >
            <strong style={{ color: 'var(--text-primary)' }}>Live pull ≠ just published. </strong>
            The green badge means we fetched the feeds now. Each story’s “3h ago” is when the outlet
            published it — markets feeds go quiet on weekends / after the US close.
            {newestLabel && (
              <span className="block mt-1">
                Newest story published: <strong style={{ color: 'var(--text-primary)' }}>{newestLabel}</strong>
              </span>
            )}
            {scope === 'world' ? (
              <span className="block mt-1">
                World headlines are for context only — <strong>not</strong> used in research or forecasts.
              </span>
            ) : (
              <span className="block mt-1">Markets headlines may be cited in research when relevant.</span>
            )}
            {syncInfo && (
              <span className="block mt-1 mono text-[11px]" style={{ color: 'var(--text-muted)' }}>
                {syncInfo}
              </span>
            )}
          </div>

          <label className="flex items-center gap-2 text-[13px] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={recentOnly}
              onChange={(e) => setRecentOnly(e.target.checked)}
              className="w-4 h-4"
            />
            Show last 48 hours only
          </label>

          <div className="scroll-x -mx-1 px-1">
            <div className="flex gap-1.5 w-max">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`chip ${category === cat ? 'chip-active' : ''}`}
                  onClick={() => setCategory(cat)}
                >
                  {SHORT[cat] || cat}
                </button>
              ))}
            </div>
          </div>

          {sources.length > 2 && (
            <div className="scroll-x -mx-1 px-1">
              <div className="flex gap-1.5 w-max">
                {sources.map((src) => (
                  <button
                    key={src}
                    type="button"
                    className={`chip ${source === src ? 'chip-active' : ''}`}
                    onClick={() => setSource(src)}
                  >
                    {src === 'All' ? 'All sources' : src}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <span className="text-sm font-bold">
            {scope === 'world' ? 'World headlines' : 'Market headlines'}
          </span>
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {filtered.length} stories
          </span>
        </div>

        <ul className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
          {filtered.map((item) => {
            const up = item.sentiment_score >= 0;
            return (
              <li key={`${item.id}-${item.url}`}>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-4 py-4 md:py-3.5 hover:bg-[var(--bg-hover)] active:bg-[var(--bg-hover)]"
                >
                  <div className="flex flex-wrap items-center gap-2 text-[12px] md:text-[11px] mb-1.5">
                    <span className="chip !min-h-7 md:!min-h-6 !px-2 !text-[11px]">
                      {SHORT[item.category] || item.category}
                    </span>
                    <span className="font-semibold">{item.source_name}</span>
                    <span
                      title={`Published ${formatAbsoluteLocal(item.published_at)}`}
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Published {formatRelativeTime(item.published_at)}
                      <span className="hidden sm:inline">
                        {' · '}
                        {formatAbsoluteLocal(item.published_at)}
                      </span>
                    </span>
                    {scope === 'markets' && (
                      <span className={`mono font-semibold ${up ? 'up' : 'down'}`}>
                        Sent {up ? '+' : ''}
                        {item.sentiment_score.toFixed(2)}
                      </span>
                    )}
                    {scope === 'world' && (
                      <span className="chip !min-h-7 md:!min-h-6 !px-2 !text-[11px]">
                        Not in analysis
                      </span>
                    )}
                  </div>
                  <div
                    className="flex items-start gap-1.5 text-[16px] md:text-[14px] font-semibold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <span>{item.title}</span>
                    <ExternalLink className="w-4 h-4 mt-1 shrink-0" style={{ color: 'var(--text-muted)' }} />
                  </div>
                  <p
                    className="mt-1.5 text-[14px] md:text-[12.5px] leading-relaxed"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {item.summary}
                  </p>
                </a>
              </li>
            );
          })}
          {filtered.length === 0 && (
            <li className="px-4 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              No stories match this filter. Try Refresh to pull live RSS.
            </li>
          )}
        </ul>
      </div>
    </section>
  );
};
