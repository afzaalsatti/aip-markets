import React from 'react';

interface IndicatorsPanelProps {
  symbol: string;
  latestPrice?: number | null;
  indicators: {
    sma_20?: number | null;
    sma_50?: number | null;
    sma_200?: number | null;
    macd_line?: number | null;
    macd_signal?: number | null;
    macd_hist?: number | null;
    bollinger_upper?: number | null;
    bollinger_lower?: number | null;
    bollinger_pct_b?: number | null;
    atr_14?: number | null;
    volatility_regime?: string | null;
    rsi_14?: number | null;
  } | null;
}

function fmt(n: number | null | undefined, digits = 2) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return n.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function tipFor(
  key: string,
  indicators: IndicatorsPanelProps['indicators'],
  price?: number | null
): string {
  if (!indicators) return '';
  switch (key) {
    case 'sma_20':
      if (price != null && indicators.sma_20 != null)
        return price >= indicators.sma_20 ? 'Price above short average' : 'Price below short average';
      return '20-session average price';
    case 'sma_50':
      if (price != null && indicators.sma_50 != null)
        return price >= indicators.sma_50 ? 'Above medium trend' : 'Below medium trend';
      return '50-session average price';
    case 'sma_200':
      return 'Longer-term average (needs history)';
    case 'macd_hist':
      if ((indicators.macd_hist ?? 0) > 0) return 'Short-term push up';
      if ((indicators.macd_hist ?? 0) < 0) return 'Short-term push down';
      return 'No clear MACD edge';
    case 'bollinger_pct_b':
      if (indicators.bollinger_pct_b == null) return 'Position in recent band';
      if (indicators.bollinger_pct_b >= 1) return 'At/above upper band';
      if (indicators.bollinger_pct_b <= 0) return 'At/below lower band';
      if (indicators.bollinger_pct_b >= 0.7) return 'Upper half of range';
      if (indicators.bollinger_pct_b <= 0.3) return 'Lower half of range';
      return 'Mid-range';
    case 'atr_14':
      return 'Typical daily swing size';
    case 'rsi_14':
      if (indicators.rsi_14 == null) return 'Momentum 0–100';
      if (indicators.rsi_14 > 70) return 'Often “stretched” up';
      if (indicators.rsi_14 < 30) return 'Often “stretched” down';
      return 'Momentum in balance';
    default:
      return '';
  }
}

export const IndicatorsPanel: React.FC<IndicatorsPanelProps> = ({
  symbol,
  indicators,
  latestPrice,
}) => {
  if (!indicators) return null;

  const macdTone =
    (indicators.macd_hist ?? 0) > 0 ? 'up' : (indicators.macd_hist ?? 0) < 0 ? 'down' : '';

  const rows = [
    { key: 'rsi_14', label: 'Momentum score', value: fmt(indicators.rsi_14, 1) },
    { key: 'sma_20', label: 'Short average (~1 mo)', value: fmt(indicators.sma_20) },
    { key: 'sma_50', label: 'Medium average (~2–3 mo)', value: fmt(indicators.sma_50) },
    { key: 'sma_200', label: 'Long average (~1 yr)', value: fmt(indicators.sma_200) },
    { key: 'macd_hist', label: 'Short-term push', value: fmt(indicators.macd_hist, 3), tone: macdTone },
    {
      key: 'bollinger_pct_b',
      label: 'Where in recent range',
      value: indicators.bollinger_pct_b != null ? indicators.bollinger_pct_b.toFixed(2) : '—',
    },
    { key: 'atr_14', label: 'Typical daily swing', value: fmt(indicators.atr_14, 3) },
    {
      key: 'vol',
      label: 'How jumpy lately',
      value: indicators.volatility_regime?.replace(' Reg.', '') || '—',
      tip: 'Calm, normal, or high swinginess',
    },
  ];

  return (
    <section className="panel" aria-label={`Indicator values for ${symbol}`}>
      <div className="panel-head">
        <div>
          <h3 className="text-base md:text-sm font-bold">Chart numbers · {symbol}</h3>
          <p className="text-[12px] md:text-[11px]" style={{ color: 'var(--text-muted)' }}>
            Simple names for the numbers behind the checklist
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4" style={{ borderColor: 'var(--border-color)' }}>
        {rows.map((r) => (
          <div
            key={r.key}
            className="p-3.5 md:p-3 border-b border-r"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              {r.label}
            </div>
            <div className={`mt-1 text-base md:text-sm font-bold mono ${r.tone || ''}`}>{r.value}</div>
            <div className="text-[11px] md:text-[10px] mt-1 leading-snug" style={{ color: 'var(--text-muted)' }}>
              {r.tip || tipFor(r.key, indicators, latestPrice)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
