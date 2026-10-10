'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { DataFreshness } from './DataFreshness';

interface AssetQuote {
  symbol: string;
  name: string;
  latest_price: number | null;
  change_percent_24h: number | null;
  realtime?: boolean;
  available?: boolean;
}

interface TickerBarProps {
  assets: AssetQuote[];
  onSelectAsset: (symbol: string) => void;
  realtime?: boolean;
}

function Quote({
  asset,
  onSelectAsset,
}: {
  asset: AssetQuote;
  onSelectAsset: (s: string) => void;
}) {
  const price = asset.latest_price;
  const chg = asset.change_percent_24h;
  const up = (chg ?? 0) >= 0;
  return (
    <button
      type="button"
      onClick={() => onSelectAsset(asset.symbol)}
      className="inline-flex items-center gap-2 px-3 h-9 text-[12px] md:text-[11px] font-mono shrink-0"
    >
      <span className="font-semibold">{asset.symbol}</span>
      <span style={{ color: 'var(--text-secondary)' }}>
        {price == null
          ? '—'
          : price.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 4,
            })}
      </span>
      <span
        className={chg == null ? '' : up ? 'up' : 'down'}
        style={chg == null ? { color: 'var(--text-muted)' } : undefined}
      >
        {chg == null ? '—' : `${up ? '+' : ''}${chg.toFixed(2)}%`}
      </span>
    </button>
  );
}

export const TickerBar: React.FC<TickerBarProps> = ({ assets, onSelectAsset, realtime }) => {
  const [docHidden, setDocHidden] = useState(false);

  useEffect(() => {
    const sync = () => setDocHidden(document.hidden);
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);

  const show = useMemo(() => {
    const priced = assets.filter((a) => a.latest_price != null);
    return priced.length ? priced : assets;
  }, [assets]);
  // Duplicate for seamless loop (animation translates -50%)
  const loop = useMemo(() => [...show, ...show], [show]);
  // ~3.2s per quote keeps speed readable on short and long universes
  const durationSec = Math.max(28, Math.round(show.length * 3.2));

  return (
    <div
      role="region"
      aria-label="Market quotes ticker"
      className="ticker-bar border-b overflow-hidden"
      style={{
        background: 'var(--bg-surface-elevated)',
        borderColor: 'var(--border-color)',
      }}
    >
      <div className="flex items-center h-[var(--ticker-h)] min-w-0">
        <div className="px-2 shrink-0 z-10" style={{ background: 'var(--bg-surface-elevated)' }}>
          <DataFreshness
            compact
            realtime={realtime ?? false}
            label={
              realtime
                ? 'Live'
                : show.some((a) => a.latest_price != null)
                  ? 'Cached'
                  : 'Unavailable'
            }
          />
        </div>
        <div className="ticker-mask flex-1 min-w-0 overflow-hidden">
          <div
            className={`ticker-track${docHidden ? ' is-paused' : ''}`}
            style={{ animationDuration: `${durationSec}s` }}
          >
            {loop.map((asset, i) => (
              <Quote key={`${asset.symbol}-${i}`} asset={asset} onSelectAsset={onSelectAsset} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
