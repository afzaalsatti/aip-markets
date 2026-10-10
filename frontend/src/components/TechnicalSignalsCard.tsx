import React from 'react';
import { Info } from 'lucide-react';
import { METRIC_PLAIN } from '@/lib/plainLanguage';

interface TechnicalSignalsCardProps {
  symbol: string;
  rsi: number | null | undefined;
  volatility30d: number | null | undefined;
  trend: string;
  var95: number | null | undefined;
  latestPrice: number | null | undefined;
  sharpeRatio?: number | null;
  sortinoRatio?: number | null;
  betaMarket?: number | null;
  betaBenchmark?: string | null;
  maxDrawdownPct?: number | null;
  cvar95Pct?: number | null;
  onOpenGuide: (topic: string) => void;
}

type Metric = {
  key: string;
  label: string;
  value: string;
  means: string;
  tone?: 'up' | 'down' | 'warn' | 'neutral';
};

function num(v: number | null | undefined): number | null {
  return v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v);
}

export const TechnicalSignalsCard: React.FC<TechnicalSignalsCardProps> = ({
  symbol,
  rsi,
  volatility30d,
  trend,
  var95,
  latestPrice,
  sharpeRatio,
  sortinoRatio,
  betaMarket,
  betaBenchmark = 'SPY',
  maxDrawdownPct,
  cvar95Pct,
  onOpenGuide,
}) => {
  const rsiN = num(rsi);
  const volN = num(volatility30d);
  const sharpeN = num(sharpeRatio);
  const sortinoN = num(sortinoRatio);
  const betaN = num(betaMarket);
  const mddN = num(maxDrawdownPct);
  const cvarN = num(cvar95Pct);
  const varN = num(var95);
  const priceN = num(latestPrice);

  const volPct = volN != null ? (volN * 100).toFixed(0) : '—';
  const varPct =
    varN != null && priceN && priceN > 0
      ? `${((varN / priceN) * 100).toFixed(1)}%`
      : varN != null
        ? varN.toFixed(2)
        : '—';

  const metrics: Metric[] = [
    {
      key: 'sharpe_ratio',
      label: METRIC_PLAIN.sharpe.label,
      value: sharpeN != null ? sharpeN.toFixed(2) : '—',
      means:
        sharpeN == null
          ? METRIC_PLAIN.sharpe.means
          : sharpeN >= 1
            ? 'Good payoff for the bumpy ride'
            : 'Weak payoff for the bumpy ride',
      tone: sharpeN == null ? 'neutral' : sharpeN >= 1 ? 'up' : 'down',
    },
    {
      key: 'sortino_ratio',
      label: METRIC_PLAIN.sortino.label,
      value: sortinoN != null ? sortinoN.toFixed(2) : '—',
      means: METRIC_PLAIN.sortino.means,
      tone: 'neutral',
    },
    {
      key: 'beta_market',
      label: METRIC_PLAIN.beta.label,
      value: betaN != null ? `${betaN.toFixed(2)}x` : '—',
      means:
        betaN == null
          ? `Moves vs ${betaBenchmark}`
          : betaN >= 1.2
            ? `Jumps more than ${betaBenchmark}`
            : betaN <= 0.8
              ? `Calmer than ${betaBenchmark}`
              : `Moves roughly with ${betaBenchmark}`,
      tone: betaN != null && betaN >= 1.2 ? 'warn' : 'neutral',
    },
    {
      key: 'max_drawdown',
      label: METRIC_PLAIN.maxDrawdown.label,
      value: mddN != null ? `${mddN.toFixed(1)}%` : '—',
      means: METRIC_PLAIN.maxDrawdown.means,
      tone: 'down',
    },
    {
      key: 'cvar_95',
      label: METRIC_PLAIN.cvar.label,
      value: cvarN != null ? `${cvarN.toFixed(2)}%` : '—',
      means: METRIC_PLAIN.cvar.means,
      tone: 'down',
    },
    {
      key: 'forecast_scenarios',
      label: METRIC_PLAIN.var95.label,
      value: varPct,
      means: METRIC_PLAIN.var95.means,
      tone: 'warn',
    },
    {
      key: 'rsi_14',
      label: METRIC_PLAIN.rsi.label,
      value: rsiN != null ? rsiN.toFixed(0) : '—',
      means:
        rsiN == null
          ? METRIC_PLAIN.rsi.means
          : rsiN > 70
            ? 'Stretched higher lately'
            : rsiN < 30
              ? 'Stretched lower lately'
              : 'Buying and selling look balanced',
      tone: rsiN != null && (rsiN > 70 || rsiN < 30) ? 'warn' : 'neutral',
    },
    {
      key: 'volatility_regime',
      label: METRIC_PLAIN.vol.label,
      value: volPct === '—' ? '—' : `${volPct}%`,
      means: METRIC_PLAIN.vol.means,
      tone: volN != null && volN >= 0.35 ? 'warn' : 'neutral',
    },
  ];

  return (
    <section className="panel" aria-label={`Risk metrics for ${symbol}`}>
      <div className="panel-head">
        <div>
          <h3 className="text-base md:text-sm font-bold">Quick metrics · {symbol}</h3>
          <p className="text-[12px] md:text-[11px]" style={{ color: 'var(--text-muted)' }}>
            Trend: <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{trend || '—'}</span>
            {' · '}each tile says what the number means
          </p>
        </div>
      </div>
      <div
        className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8"
        style={{ borderColor: 'var(--border-color)' }}
      >
        {metrics.map((m) => (
          <div
            key={m.key}
            className="p-3.5 md:p-3 min-w-0 border-b border-r"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                {m.label}
              </span>
              <button
                type="button"
                aria-label={`About ${m.label}`}
                className="touch-target inline-flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--accent)] -mr-1"
                onClick={() => onOpenGuide(m.key)}
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>
            <div
              className={`text-lg md:text-base font-bold mono ${
                m.tone === 'up' ? 'up' : m.tone === 'down' ? 'down' : ''
              }`}
              style={m.tone === 'warn' ? { color: 'var(--warn)' } : undefined}
            >
              {m.value}
            </div>
            <div className="text-[11px] md:text-[10px] mt-0.5 leading-snug" style={{ color: 'var(--text-muted)' }}>
              {m.means}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
