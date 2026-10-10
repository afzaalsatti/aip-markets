'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Search, X, LineChart, FileText } from 'lucide-react';

export type SearchAsset = {
  symbol: string;
  name: string;
  asset_class?: string;
  latest_price?: number | null;
  change_percent_24h?: number | null;
};

interface SymbolSearchProps {
  query: string;
  onQueryChange: (q: string) => void;
  assets: SearchAsset[];
  onSelectSymbol: (symbol: string) => void;
  onOpenResearch?: (symbol: string) => void;
  placeholder?: string;
}

function rankMatch(asset: SearchAsset, q: string): number {
  const sym = asset.symbol.toLowerCase();
  const name = asset.name.toLowerCase();
  if (sym === q) return 100;
  if (sym.startsWith(q)) return 90;
  if (sym.includes(q)) return 70;
  if (name.startsWith(q)) return 60;
  if (name.includes(q)) return 40;
  if ((asset.asset_class || '').toLowerCase().includes(q)) return 20;
  return 0;
}

export const SymbolSearch: React.FC<SymbolSearchProps> = ({
  query,
  onQueryChange,
  assets,
  onSelectSymbol,
  onOpenResearch,
  placeholder = 'Search symbol or name…',
}) => {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return [...assets]
      .map((a) => ({ a, score: rankMatch(a, q) }))
      .filter((x) => x.score > 0)
      .sort((x, y) => y.score - x.score || x.a.symbol.localeCompare(y.a.symbol))
      .slice(0, 8)
      .map((x) => x.a);
  }, [assets, query]);

  useEffect(() => {
    setHighlight(0);
  }, [query]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const pick = (symbol: string) => {
    onSelectSymbol(symbol);
    onQueryChange('');
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter') && results.length) {
      setOpen(true);
    }
    if (e.key === 'Escape') {
      setOpen(false);
      if (query) onQueryChange('');
      return;
    }
    if (!results.length) {
      if (e.key === 'Enter') {
        e.preventDefault();
        // Keep filtering Markets if no exact pick
        setOpen(false);
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setHighlight((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
      setHighlight((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const hit = results[highlight] || results[0];
      if (hit) pick(hit.symbol);
    }
  };

  return (
    <div ref={rootRef} className="relative flex-1 max-w-md ml-auto min-w-0">
      <label htmlFor="global-search" className="sr-only">
        Search symbols
      </label>
      <Search
        className="w-4 h-4 md:w-3.5 md:h-3.5 absolute left-3 md:left-2.5 top-1/2 -translate-y-1/2 pointer-events-none z-[1]"
        style={{ color: 'var(--text-muted)' }}
      />
      <input
        ref={inputRef}
        id="global-search"
        type="search"
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          open && results[highlight] ? `${listId}-${results[highlight].symbol}` : undefined
        }
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          onQueryChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className="w-full h-11 md:h-8 pl-9 md:pl-8 pr-10 text-base md:text-xs border outline-none"
        style={{
          background: 'var(--bg-primary)',
          borderColor: 'var(--border-color)',
          color: 'var(--text-primary)',
          borderRadius: 'var(--radius)',
        }}
      />
      {query ? (
        <button
          type="button"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 touch-target w-9 h-9 md:w-7 md:h-7 flex items-center justify-center"
          aria-label="Clear search"
          onClick={() => {
            onQueryChange('');
            setOpen(false);
            inputRef.current?.focus();
          }}
        >
          <X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
        </button>
      ) : null}

      {open && query.trim() && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-[min(70vh,360px)] overflow-y-auto border shadow-lg"
          style={{
            background: 'var(--bg-surface)',
            borderColor: 'var(--border-color)',
            borderRadius: 'var(--radius)',
          }}
        >
          {results.length === 0 ? (
            <li className="px-3 py-3 text-[13px]" style={{ color: 'var(--text-muted)' }}>
              No matches for “{query.trim()}”. Try a ticker like AAPL or gold.
            </li>
          ) : (
            results.map((asset, idx) => {
              const chg = asset.change_percent_24h;
              const up = (chg ?? 0) >= 0;
              const active = idx === highlight;
              return (
                <li
                  key={asset.symbol}
                  id={`${listId}-${asset.symbol}`}
                  role="option"
                  aria-selected={active}
                  className="border-b last:border-b-0"
                  style={{
                    borderColor: 'var(--border-color)',
                    background: active ? 'var(--accent-soft)' : undefined,
                  }}
                >
                  <div className="flex items-stretch gap-1">
                    <button
                      type="button"
                      className="flex-1 min-w-0 text-left px-3 py-2.5 touch-target"
                      onMouseEnter={() => setHighlight(idx)}
                      onClick={() => pick(asset.symbol)}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-bold mono text-[14px] md:text-[13px]">{asset.symbol}</span>
                        <span className="mono text-[13px] md:text-[12px] shrink-0">
                          {asset.latest_price == null
                            ? '—'
                            : asset.latest_price.toLocaleString(undefined, {
                                maximumFractionDigits: 4,
                              })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <span className="text-[12px] truncate" style={{ color: 'var(--text-muted)' }}>
                          {asset.name}
                          {asset.asset_class ? ` · ${asset.asset_class}` : ''}
                        </span>
                        <span
                          className={`mono text-[12px] shrink-0 ${chg == null ? '' : up ? 'up' : 'down'}`}
                          style={chg == null ? { color: 'var(--text-muted)' } : undefined}
                        >
                          {chg == null ? '—' : `${up ? '+' : ''}${chg.toFixed(2)}%`}
                        </span>
                      </div>
                    </button>
                    <div className="flex flex-col border-l shrink-0" style={{ borderColor: 'var(--border-color)' }}>
                      <button
                        type="button"
                        className="px-2.5 flex-1 touch-target"
                        title="Open chart"
                        aria-label={`Open chart for ${asset.symbol}`}
                        onClick={() => pick(asset.symbol)}
                      >
                        <LineChart className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                      </button>
                      {onOpenResearch && (
                        <button
                          type="button"
                          className="px-2.5 flex-1 touch-target border-t"
                          style={{ borderColor: 'var(--border-color)' }}
                          title="Open research"
                          aria-label={`Open research for ${asset.symbol}`}
                          onClick={() => {
                            onOpenResearch(asset.symbol);
                            onQueryChange('');
                            setOpen(false);
                          }}
                        >
                          <FileText className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
};
