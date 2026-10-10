import React from 'react';
import { DataFreshness, type FreshnessInfo } from './DataFreshness';
import { MODEL_METRIC_PLAIN } from '@/lib/plainLanguage';

interface ModelMetric {
  model_name: string;
  asset_class: string;
  horizon: string;
  mae: number | null;
  rmse: number | null;
  directional_accuracy: number | null;
  calibration_score: number | null;
  proxy_symbol?: string;
  sample_size?: number;
  status?: string;
}

interface ModelPerformanceViewProps {
  models: ModelMetric[];
  evaluationTime: string;
  methodology: string;
  freshness?: FreshnessInfo | null;
}

function fmt(n: number | null | undefined, digits = 4) {
  if (n === null || n === undefined) return '—';
  return n.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function pct(n: number | null | undefined) {
  if (n === null || n === undefined) return '—';
  return `${(n * 100).toFixed(0)}%`;
}

export const ModelPerformanceView: React.FC<ModelPerformanceViewProps> = ({
  models,
  evaluationTime,
  methodology,
  freshness,
}) => {
  return (
    <section className="panel" aria-labelledby="models-heading">
      <div className="panel-head">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="models-heading" className="text-base md:text-sm font-bold">How well the models did</h2>
            <DataFreshness freshness={freshness} label={freshness?.realtime ? 'Live backtest' : undefined} />
          </div>
          <p className="text-[13px] md:text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
            {methodology}
          </p>
          <p className="text-[12px] md:text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
            Lower error is better. “Right direction” asks: did the model guess up vs down correctly?
          </p>
        </div>
        <span className="text-[12px] md:text-[11px] mono" style={{ color: 'var(--text-muted)' }}>
          Checked {new Date(evaluationTime).toLocaleString()}
        </span>
      </div>

      {/* Mobile-first cards */}
      <ul className="md:hidden divide-y" style={{ borderColor: 'var(--border-color)' }}>
        {models.map((m, idx) => (
          <li key={idx} className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[15px] font-bold">{m.asset_class}</div>
                <div className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  <span className="mono">{m.proxy_symbol || '—'}</span>
                  {' · '}
                  {m.model_name}
                  {' · '}
                  <span className="mono">{m.horizon}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[10px] uppercase font-semibold" style={{ color: 'var(--text-muted)' }}>
                  {MODEL_METRIC_PLAIN.dirAcc.label}
                </div>
                <div className="text-lg font-bold mono up">{pct(m.directional_accuracy)}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[13px]">
              {[
                { k: MODEL_METRIC_PLAIN.mae.label, v: fmt(m.mae), t: MODEL_METRIC_PLAIN.mae.hint },
                { k: MODEL_METRIC_PLAIN.rmse.label, v: fmt(m.rmse), t: MODEL_METRIC_PLAIN.rmse.hint },
                { k: MODEL_METRIC_PLAIN.calibration.label, v: pct(m.calibration_score), t: MODEL_METRIC_PLAIN.calibration.hint },
                {
                  k: MODEL_METRIC_PLAIN.folds.label,
                  v: String(m.sample_size ?? (m.status === 'ok' ? '—' : m.status || '—')),
                  t: MODEL_METRIC_PLAIN.folds.hint,
                },
              ].map((cell) => (
                <div
                  key={cell.k}
                  className="px-3 py-2"
                  style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-color)' }}
                  title={cell.t}
                >
                  <div className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>
                    {cell.k}
                  </div>
                  <div className="mono font-semibold mt-0.5">{cell.v}</div>
                </div>
              ))}
            </div>
          </li>
        ))}
      </ul>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Asset class</th>
              <th>Proxy</th>
              <th>Model</th>
              <th>Horizon</th>
              <th className="right" title={MODEL_METRIC_PLAIN.mae.hint}>{MODEL_METRIC_PLAIN.mae.label}</th>
              <th className="right" title={MODEL_METRIC_PLAIN.rmse.hint}>{MODEL_METRIC_PLAIN.rmse.label}</th>
              <th className="right" title={MODEL_METRIC_PLAIN.dirAcc.hint}>{MODEL_METRIC_PLAIN.dirAcc.label}</th>
              <th className="right" title={MODEL_METRIC_PLAIN.calibration.hint}>{MODEL_METRIC_PLAIN.calibration.label}</th>
              <th className="right" title={MODEL_METRIC_PLAIN.folds.hint}>{MODEL_METRIC_PLAIN.folds.label}</th>
            </tr>
          </thead>
          <tbody>
            {models.map((m, idx) => (
              <tr key={idx} style={{ cursor: 'default' }}>
                <td className="font-semibold">{m.asset_class}</td>
                <td className="mono" style={{ color: 'var(--text-secondary)' }}>
                  {m.proxy_symbol || '—'}
                </td>
                <td style={{ color: 'var(--text-secondary)' }}>{m.model_name}</td>
                <td className="mono">{m.horizon}</td>
                <td className="right mono">{fmt(m.mae)}</td>
                <td className="right mono">{fmt(m.rmse)}</td>
                <td className="right mono up font-semibold">{pct(m.directional_accuracy)}</td>
                <td className="right mono font-semibold">{pct(m.calibration_score)}</td>
                <td className="right mono" style={{ color: 'var(--text-muted)' }}>
                  {m.sample_size ?? (m.status === 'ok' ? '—' : m.status || '—')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
