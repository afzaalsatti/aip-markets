'use client';

import React from 'react';
import {
  SCENARIO_COPY,
  formatModelOdds,
  formatModelOddsHint,
  type ScenarioKind,
} from '@/lib/plainLanguage';

type ScenarioPayload = {
  target_price?: number | string | null;
  expected_return_pct?: number | null;
  probability?: number | null;
  key_drivers?: string[] | null;
};

interface ScenarioCardsProps {
  bullish?: ScenarioPayload | null;
  base?: ScenarioPayload | null;
  bearish?: ScenarioPayload | null;
  horizonPlain?: string;
  stressLoss?: number | null;
  /** e.g. USD, EUR — used for labels; omitted for yields / FX pairs */
  currency?: string | null;
  assetClass?: string | null;
}

function fmtLevel(v: number | string | null | undefined) {
  if (v == null || v === '') return '—';
  const n = typeof v === 'number' ? v : Number(v);
  if (Number.isNaN(n)) return String(v);
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

function stressLabel(assetClass?: string | null, currency?: string | null) {
  const cls = (assetClass || '').toLowerCase();
  if (cls.includes('forex') || cls.includes('fx')) return 'quote units';
  if (cls.includes('fixed')) return 'price / yield units';
  if (currency) return currency;
  return 'quote units';
}

export const ScenarioCards: React.FC<ScenarioCardsProps> = ({
  bullish,
  base,
  bearish,
  horizonPlain = 'the selected period',
  stressLoss,
  currency,
  assetClass,
}) => {
  const rows: { key: ScenarioKind; scenario?: ScenarioPayload | null }[] = [
    { key: 'bull', scenario: bullish },
    { key: 'base', scenario: base },
    { key: 'bear', scenario: bearish },
  ];

  if (!base) return null;

  const unit = stressLabel(assetClass, currency);

  return (
    <div className="space-y-2">
      <div className="px-0.5">
        <h3 className="text-sm font-bold">What might happen next ({horizonPlain})</h3>
        <p className="text-[12px] md:text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Three simple stories from the model — not a buy or sell tip. Think “weather forecast,” not a promise.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {rows.map(({ key, scenario }) => {
          const copy = SCENARIO_COPY[key];
          const tone = copy.tone;
          const ret = scenario?.expected_return_pct;
          return (
            <div key={key} className="panel">
              <div className="panel-head">
                <div className="min-w-0">
                  <span
                    className={`text-sm md:text-xs font-bold ${
                      tone === 'up' ? 'up' : tone === 'down' ? 'down' : ''
                    }`}
                  >
                    {copy.title}
                  </span>
                  <p className="text-[11px] mt-0.5 leading-snug" style={{ color: 'var(--text-muted)' }}>
                    {copy.subtitle}
                  </p>
                </div>
                <span
                  className="text-[11px] md:text-[10px] font-semibold shrink-0 text-right"
                  style={{ color: 'var(--text-secondary)' }}
                  title={formatModelOddsHint()}
                >
                  {formatModelOdds(scenario?.probability)}
                </span>
              </div>
              <div className="p-4 md:p-3 space-y-2">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                    Suggested price level
                  </div>
                  <div className="text-2xl md:text-xl font-bold mono mt-0.5">
                    {fmtLevel(scenario?.target_price ?? null)}
                    {ret != null && (
                      <span
                        className={`ml-2 text-base md:text-sm ${
                          tone === 'up' ? 'up' : tone === 'down' ? 'down' : ''
                        }`}
                      >
                        {ret >= 0 ? '+' : ''}
                        {ret}%
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
                    What would push it this way
                  </div>
                  <ul className="space-y-1.5 text-[14px] md:text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                    {(scenario?.key_drivers || []).map((d, i) => (
                      <li key={i}>· {d}</li>
                    ))}
                    {!(scenario?.key_drivers || []).length && (
                      <li style={{ color: 'var(--text-muted)' }}>· No drivers listed</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {stressLoss != null && !Number.isNaN(Number(stressLoss)) && (
        <p className="text-[12px] md:text-[11px] px-0.5" style={{ color: 'var(--text-muted)' }}>
          Rough stress loss the model flags for this horizon:{' '}
          <span className="mono font-semibold" style={{ color: 'var(--text-secondary)' }}>
            {Number(stressLoss).toLocaleString(undefined, { maximumFractionDigits: 2 })} {unit}
          </span>
          {' '}
          (a bad-case sketch — real losses can be larger or smaller).
        </p>
      )}
    </div>
  );
};
