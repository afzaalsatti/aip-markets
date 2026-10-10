import React, { useEffect, useMemo, useState } from 'react';
import { Star, ArrowUpDown } from 'lucide-react';
import { DataFreshness, type FreshnessInfo } from './DataFreshness';

const WATCHLIST_KEY = 'aip_watchlist';

interface AssetOverviewItem {
  id: number;
  symbol: string;
  name: string;
  asset_class: string;
  currency: string;
  exchange: string;
  latest_price: number | null;
  change_24h: number | null;
  change_percent_24h: number | null;
  high_24h: number | null;
  low_24h: number | null;
  volume_24h: number | null;
  available?: boolean;
  realtime?: boolean;
}

interface MarketOverviewProps {
  assets: AssetOverviewItem[];
  onSelectAsset: (symbol: string) => void;
  onGenerateReport: (symbol: string) => void;
  searchQuery?: string;
  selectedSymbol?: string;
  freshness?: FreshnessInfo | null;
}

type SortKey = 'symbol' | 'latest_price' | 'change_percent_24h' | 'volume_24h' | 'asset_class';

const CATEGORIES = ['All', 'Equities', 'Commodities', 'Forex', 'Cryptocurrencies', 'Fixed Income'];

function formatVolume(v: number | null | undefined) {
  if (v == null || !v) return '—';
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return v.toLocaleString();
}

function fmtPrice(v: number | null | undefined) {
  if (v == null || Number.isNaN(Number(v))) return '—';
  return Number(v).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

function fmtChg(v: number | null | undefined) {
  if (v == null || Number.isNaN(Number(v))) return { text: '—', up: true };
  const n = Number(v);
  return { text: `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`, up: n >= 0 };
}

export const MarketOverview: React.FC<MarketOverviewProps> = ({
  assets,
  onSelectAsset,
  onGenerateReport,
  searchQuery = '',
  selectedSymbol,
  freshness,
}) => {
  const [filter, setFilter] = useState('All');
  const [watchlist, setWatchlist] = useState<string[]>(['GC=F', 'NVDA', 'AAPL', 'BTC-USD', 'SPY', 'EURUSD=X']);
  const [sortKey, setSortKey] = useState<SortKey>('change_percent_24h');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(WATCHLIST_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) setWatchlist(parsed);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist));
    } catch {
      /* ignore */
    }
  }, [watchlist]);

  const toggleWatch = (symbol: string, e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    setWatchlist((prev) =>
      prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol]
    );
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir(key === 'symbol' || key === 'asset_class' ? 'asc' : 'desc');
    }
  };

  const rows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = assets.filter((a) => {
      const catOk = filter === 'All' || a.asset_class === filter;
      const qOk =
        !q ||
        a.symbol.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q);
      return catOk && qOk;
    });
    list = [...list].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      let cmp = 0;
      if (typeof av === 'string' && typeof bv === 'string') cmp = av.localeCompare(bv);
      else cmp = (Number(av) || 0) - (Number(bv) || 0);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [assets, filter, searchQuery, sortKey, sortDir]);

  const priced = assets.filter((a) => a.change_percent_24h != null && a.latest_price != null);
  const gainers = [...priced].sort((a, b) => (b.change_percent_24h ?? 0) - (a.change_percent_24h ?? 0)).slice(0, 5);
  const losers = [...priced].sort((a, b) => (a.change_percent_24h ?? 0) - (b.change_percent_24h ?? 0)).slice(0, 5);

  const SortBtn = ({ k, label }: { k: SortKey; label: string }) => (
    <button
      type="button"
      onClick={() => toggleSort(k)}
      className="inline-flex items-center gap-1 uppercase tracking-wide touch-target"
      style={{ color: sortKey === k ? 'var(--accent)' : undefined }}
    >
      {label}
      <ArrowUpDown className="w-3 h-3 opacity-60" />
    </button>
  );

  return (
    <section className="space-y-3" aria-labelledby="markets-heading">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        <div className="lg:col-span-8 panel">
          <div className="panel-head">
            <div className="flex flex-wrap items-center gap-2">
              <div>
                <h2 id="markets-heading" className="text-base md:text-sm font-bold">Market screener</h2>
                <p className="text-[12px] md:text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  {rows.length} instruments
                  {searchQuery.trim() ? ` matching “${searchQuery.trim()}”` : ''}
                  {' · '}tap a row to open the chart
                </p>
              </div>
              <DataFreshness
                freshness={freshness}
                label={
                  freshness?.realtime
                    ? 'Live quotes'
                    : freshness?.status === 'degraded'
                      ? 'Cached quotes'
                      : freshness?.status === 'unavailable'
                        ? 'Quotes unavailable'
                        : undefined
                }
              />
            </div>
            {freshness?.status === 'unavailable' && (
              <p className="text-[12px] px-3 pb-2 -mt-1" style={{ color: 'var(--warn)' }}>
                Start the API at <span className="mono">localhost:8000</span> and refresh — no placeholder prices are shown.
              </p>
            )}
            <div className="scroll-x -mx-1 px-1">
              <div className="flex gap-1.5 w-max">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`chip ${filter === cat ? 'chip-active' : ''}`}
                    onClick={() => setFilter(cat)}
                  >
                    {cat === 'Cryptocurrencies' ? 'Crypto' : cat}
                  </button>
                ))}
              </div>
            </div>
            {/* Mobile sort — desktop uses column headers */}
            <div className="md:hidden scroll-x -mx-1 px-1">
              <div className="flex gap-1.5 w-max items-center">
                <span className="text-[10px] font-semibold uppercase tracking-wide shrink-0" style={{ color: 'var(--text-muted)' }}>
                  Sort
                </span>
                {(
                  [
                    ['change_percent_24h', 'Chg %'],
                    ['symbol', 'Symbol'],
                    ['latest_price', 'Last'],
                    ['volume_24h', 'Volume'],
                    ['asset_class', 'Class'],
                  ] as const
                ).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    className={`chip ${sortKey === k ? 'chip-active' : ''}`}
                    onClick={() => toggleSort(k)}
                    aria-pressed={sortKey === k}
                  >
                    {label}
                    {sortKey === k ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {!rows.length && (
            <div className="p-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              No instruments match this filter{searchQuery.trim() ? ` or “${searchQuery.trim()}”` : ''}.
            </div>
          )}

          {/* Mobile-first: card list */}
          <ul className="md:hidden divide-y" style={{ borderColor: 'var(--border-color)' }}>
            {rows.map((asset) => {
              const chg = fmtChg(asset.change_percent_24h);
              const watched = watchlist.includes(asset.symbol);
              const selected = selectedSymbol === asset.symbol;
              return (
                <li key={asset.symbol}>
                  <div
                    role="button"
                    tabIndex={0}
                    className="flex items-stretch gap-2 px-3 py-3 active:bg-[var(--bg-hover)]"
                    style={{ background: selected ? 'var(--accent-soft)' : undefined }}
                    onClick={() => onSelectAsset(asset.symbol)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectAsset(asset.symbol);
                      }
                    }}
                  >
                    <button
                      type="button"
                      className="touch-target shrink-0 self-center flex items-center justify-center"
                      aria-label={watched ? 'Remove from watchlist' : 'Add to watchlist'}
                      onClick={(e) => toggleWatch(asset.symbol, e)}
                    >
                      <Star
                        className="w-5 h-5"
                        style={{ color: watched ? 'var(--accent)' : 'var(--text-muted)' }}
                        fill={watched ? 'var(--accent)' : 'none'}
                      />
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="font-bold mono text-[15px] truncate">{asset.symbol}</div>
                        <div className="mono font-bold text-[15px] shrink-0">{fmtPrice(asset.latest_price)}</div>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <div className="text-[12px] truncate" style={{ color: 'var(--text-muted)' }}>
                          {asset.name}
                        </div>
                        <div className={`mono font-semibold text-[13px] shrink-0 ${chg.up ? 'up' : 'down'}`}>
                          {chg.text}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-2">
                        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                          Vol {formatVolume(asset.volume_24h)}
                        </span>
                        <button
                          type="button"
                          className="btn btn-ghost h-9 px-3 text-[12px]"
                          onClick={(e) => {
                            e.stopPropagation();
                            onGenerateReport(asset.symbol);
                          }}
                        >
                          Research
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
            {rows.length === 0 && (
              <li className="text-center py-10 text-sm" style={{ color: 'var(--text-muted)' }}>
                No instruments match this filter.
              </li>
            )}
          </ul>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto max-h-[640px]">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }} />
                  <th><SortBtn k="symbol" label="Symbol" /></th>
                  <th><SortBtn k="asset_class" label="Class" /></th>
                  <th className="right"><SortBtn k="latest_price" label="Last" /></th>
                  <th className="right"><SortBtn k="change_percent_24h" label="Chg %" /></th>
                  <th className="right">High</th>
                  <th className="right">Low</th>
                  <th className="right"><SortBtn k="volume_24h" label="Volume" /></th>
                  <th className="right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((asset) => {
                  const chg = fmtChg(asset.change_percent_24h);
                  const watched = watchlist.includes(asset.symbol);
                  return (
                    <tr
                      key={asset.symbol}
                      className={selectedSymbol === asset.symbol ? 'is-selected' : ''}
                      onClick={() => onSelectAsset(asset.symbol)}
                    >
                      <td onClick={(e) => toggleWatch(asset.symbol, e)}>
                        <Star
                          className="w-3.5 h-3.5"
                          style={{ color: watched ? 'var(--accent)' : 'var(--text-muted)' }}
                          fill={watched ? 'var(--accent)' : 'none'}
                        />
                      </td>
                      <td>
                        <div className="font-semibold mono">{asset.symbol}</div>
                        <div className="text-[11px] truncate max-w-[180px]" style={{ color: 'var(--text-muted)' }}>
                          {asset.name}
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{asset.asset_class}</td>
                      <td className="right mono font-semibold">{fmtPrice(asset.latest_price)}</td>
                      <td className={`right mono font-semibold ${chg.up ? 'up' : 'down'}`}>{chg.text}</td>
                      <td className="right mono" style={{ color: 'var(--text-secondary)' }}>{fmtPrice(asset.high_24h)}</td>
                      <td className="right mono" style={{ color: 'var(--text-secondary)' }}>{fmtPrice(asset.low_24h)}</td>
                      <td className="right mono" style={{ color: 'var(--text-secondary)' }}>
                        {formatVolume(asset.volume_24h)}
                      </td>
                      <td className="right" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="btn btn-ghost h-7 px-2 text-[11px]"
                          onClick={() => onGenerateReport(asset.symbol)}
                        >
                          Research
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center py-10" style={{ color: 'var(--text-muted)' }}>
                      No instruments match this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="lg:col-span-4 space-y-3">
          <div className="panel">
            <div className="panel-head">
              <h3 className="text-sm font-bold">Watchlist</h3>
              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{watchlist.length}</span>
            </div>
            <ul>
              {!watchlist.length && (
                <li className="px-3 py-4 text-[13px]" style={{ color: 'var(--text-muted)' }}>
                  Star symbols in the screener to build a watchlist on this device.
                </li>
              )}
              {watchlist.map((sym) => {
                const a = assets.find((x) => x.symbol === sym);
                if (!a) {
                  return (
                    <li key={sym}>
                      <div
                        className="w-full flex items-center justify-between px-3 py-3 md:py-2.5 border-b"
                        style={{ borderColor: 'var(--border-color)' }}
                      >
                        <div className="min-w-0">
                          <div className="text-[13px] md:text-xs font-semibold mono">{sym}</div>
                          <div className="text-[12px] md:text-[11px]" style={{ color: 'var(--text-muted)' }}>
                            Not in current universe
                          </div>
                        </div>
                        <button
                          type="button"
                          className="text-[11px] font-semibold touch-target px-2"
                          style={{ color: 'var(--accent)' }}
                          onClick={(e) => toggleWatch(sym, e)}
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  );
                }
                const chg = fmtChg(a.change_percent_24h);
                return (
                  <li key={sym}>
                    <button
                      type="button"
                      className="w-full flex items-center justify-between px-3 py-3 md:py-2.5 text-left border-b hover:bg-[var(--bg-hover)] touch-target"
                      style={{ borderColor: 'var(--border-color)', minHeight: 'var(--touch-min)' }}
                      onClick={() => onSelectAsset(sym)}
                    >
                      <div className="min-w-0">
                        <div className="text-[13px] md:text-xs font-semibold mono">{a.symbol}</div>
                        <div className="text-[12px] md:text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{a.name}</div>
                      </div>
                      <div className="text-right mono text-[13px] md:text-xs shrink-0">
                        <div className="font-semibold">{fmtPrice(a.latest_price)}</div>
                        <div className={chg.up ? 'up' : 'down'}>{chg.text}</div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
            <div className="panel">
              <div className="panel-head">
                <h3 className="text-sm font-bold">Top gainers</h3>
              </div>
              <ul>
                {!gainers.length && (
                  <li className="px-3 py-4 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                    No priced instruments yet.
                  </li>
                )}
                {gainers.map((a) => (
                  <li key={a.symbol}>
                    <button
                      type="button"
                      className="w-full flex justify-between px-3 py-3 md:py-2 text-[13px] md:text-xs border-b mono touch-target"
                      style={{ borderColor: 'var(--border-color)' }}
                      onClick={() => onSelectAsset(a.symbol)}
                    >
                      <span className="font-semibold">{a.symbol}</span>
                      <span className="up">{fmtChg(a.change_percent_24h).text}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="panel">
              <div className="panel-head">
                <h3 className="text-sm font-bold">Top losers</h3>
              </div>
              <ul>
                {!losers.length && (
                  <li className="px-3 py-4 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                    No priced instruments yet.
                  </li>
                )}
                {losers.map((a) => (
                  <li key={a.symbol}>
                    <button
                      type="button"
                      className="w-full flex justify-between px-3 py-3 md:py-2 text-[13px] md:text-xs border-b mono touch-target"
                      style={{ borderColor: 'var(--border-color)' }}
                      onClick={() => onSelectAsset(a.symbol)}
                    >
                      <span className="font-semibold">{a.symbol}</span>
                      <span className="down">{fmtChg(a.change_percent_24h).text}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
};
