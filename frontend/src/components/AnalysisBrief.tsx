import React from 'react';

type Reading = { label: string; tone?: string; text: string };

export interface AnalysisBriefData {
  symbol?: string;
  overall?: Reading;
  takeaways?: string[];
  technical?: {
    momentum?: Reading;
    trend?: Reading;
    macd?: Reading;
    range?: Reading;
    volatility?: Reading;
  };
  risk?: Reading[];
  fundamentals?: {
    headline?: string;
    key_drivers?: string[];
    what_to_watch?: string[];
    disclaimer?: string;
  };
  forecast_plain?: string[];
}

interface AnalysisBriefProps {
  brief: AnalysisBriefData | null | undefined;
  onOpenGuide?: (topic: string) => void;
}

function ToneChip({ label, tone }: { label: string; tone?: string }) {
  const cls =
    tone === 'up' ? 'up-bg' : tone === 'down' ? 'down-bg' : tone === 'warn' ? '' : '';
  const style =
    tone === 'warn'
      ? { background: 'var(--warn-bg)', color: 'var(--warn)', borderColor: 'transparent' }
      : tone === 'neutral' || !tone
        ? { background: 'var(--bg-surface-elevated)', color: 'var(--text-secondary)' }
        : undefined;
  return (
    <span className={`chip shrink-0 ${cls}`} style={style}>
      {label}
    </span>
  );
}

function ReadingCard({
  title,
  reading,
  guideKey,
  onOpenGuide,
}: {
  title: string;
  reading?: Reading;
  guideKey?: string;
  onOpenGuide?: (topic: string) => void;
}) {
  if (!reading) return null;
  return (
    <div className="p-3.5 md:p-3 border-b md:border-b-0 md:border-r last:border-0" style={{ borderColor: 'var(--border-color)' }}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          {title}
        </span>
        <div className="flex items-center gap-1.5">
          <ToneChip label={reading.label} tone={reading.tone} />
          {guideKey && onOpenGuide && (
            <button
              type="button"
              className="touch-target px-2 text-[12px] font-semibold"
              style={{ color: 'var(--accent)' }}
              onClick={() => onOpenGuide(guideKey)}
            >
              Why?
            </button>
          )}
        </div>
      </div>
      <p className="text-[14px] md:text-[12.5px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {reading.text}
      </p>
    </div>
  );
}

export const AnalysisBrief: React.FC<AnalysisBriefProps> = ({ brief, onOpenGuide }) => {
  if (!brief) return null;
  const tech = brief.technical || {};
  const fund = brief.fundamentals;

  return (
    <section className="space-y-3" aria-label="Plain-English analysis">
      <div className="panel">
        <div className="panel-head flex-wrap">
          <div>
            <h3 className="text-base md:text-sm font-bold">In plain English</h3>
            <p className="text-[12px] md:text-[11px]" style={{ color: 'var(--text-muted)' }}>
              What the numbers are saying — not a buy/sell call
            </p>
          </div>
          {brief.overall && <ToneChip label={brief.overall.label} tone={brief.overall.tone} />}
        </div>
        <ol className="px-4 py-3 space-y-2.5 text-[15px] md:text-[13px] list-decimal list-inside" style={{ color: 'var(--text-secondary)' }}>
          {(brief.takeaways || []).map((t, i) => (
            <li key={i} className="leading-relaxed">{t}</li>
          ))}
        </ol>
        {brief.forecast_plain && brief.forecast_plain.length > 0 && (
          <div className="px-4 pb-3 text-[13px] md:text-[12px] space-y-1 border-t pt-3" style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
            {brief.forecast_plain.map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel-head">
          <h3 className="text-sm font-bold">Technical checklist</h3>
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Momentum · trend · range · vol</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          <ReadingCard title="Momentum (RSI)" reading={tech.momentum} guideKey="rsi_14" onOpenGuide={onOpenGuide} />
          <ReadingCard title="Trend" reading={tech.trend} onOpenGuide={onOpenGuide} />
          <ReadingCard title="MACD" reading={tech.macd} onOpenGuide={onOpenGuide} />
          <ReadingCard title="Price range" reading={tech.range} onOpenGuide={onOpenGuide} />
          <ReadingCard title="Volatility" reading={tech.volatility} guideKey="volatility_regime" onOpenGuide={onOpenGuide} />
        </div>
      </div>

      {(brief.risk?.length || 0) > 0 && (
        <div className="panel">
          <div className="panel-head">
            <h3 className="text-sm font-bold">Risk in everyday words</h3>
          </div>
          <ul className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
            {brief.risk!.map((r, i) => (
              <li key={i} className="px-4 py-3.5 flex flex-wrap items-start gap-2 justify-between">
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] md:text-[12px] font-semibold mb-0.5">{r.label}</div>
                  <p className="text-[14px] md:text-[12.5px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{r.text}</p>
                </div>
                <ToneChip label={r.tone === 'up' ? 'OK' : r.tone === 'down' ? 'Watch' : r.tone === 'warn' ? 'Note' : '—'} tone={r.tone} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {fund && (
        <div className="panel">
          <div className="panel-head">
            <h3 className="text-sm font-bold">Fundamentals / macro</h3>
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>What usually drives this asset</span>
          </div>
          <div className="p-4 space-y-3">
            <p className="text-[15px] md:text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {fund.headline}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-3">
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  Key drivers
                </h4>
                <ul className="space-y-1.5 text-[14px] md:text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
                  {(fund.key_drivers || []).map((d, i) => (
                    <li key={i}>· {d}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  What to watch
                </h4>
                <ul className="space-y-1.5 text-[14px] md:text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
                  {(fund.what_to_watch || []).map((d, i) => (
                    <li key={i}>· {d}</li>
                  ))}
                </ul>
              </div>
            </div>
            {fund.disclaimer && (
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{fund.disclaimer}</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
