import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Loader2 } from 'lucide-react';
import { HORIZON_LABELS, SCENARIO_COPY } from '@/lib/plainLanguage';

interface HistoryPoint {
  timestamp: string;
  close: number;
}

interface TrajectoryPoint {
  step: number;
  timestamp: string;
  base_price: number;
  bull_price: number;
  bear_price: number;
}

interface InteractiveChartProps {
  symbol: string;
  history: HistoryPoint[];
  forecastTrajectory?: TrajectoryPoint[];
  selectedHorizon: string;
  onHorizonChange: (horizon: string) => void;
  theme?: 'light' | 'dark';
  isLoading?: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const hist = payload.find((p: any) => p.dataKey === 'Historical')?.value;
  const bull = payload.find((p: any) => p.dataKey === 'BullScenario')?.value;
  const base = payload.find((p: any) => p.dataKey === 'BaseScenario')?.value;
  const bear = payload.find((p: any) => p.dataKey === 'BearScenario')?.value;

  return (
    <div
      className="panel p-2.5 text-[11px] font-mono space-y-1 shadow-md"
      style={{ minWidth: 170 }}
    >
      <div className="font-semibold pb-1 border-b" style={{ borderColor: 'var(--border-color)' }}>
        {label}
      </div>
      {hist != null && (
        <div className="flex justify-between gap-4">
          <span style={{ color: 'var(--text-muted)' }}>Actual close</span>
          <strong>{Number(hist).toLocaleString(undefined, { maximumFractionDigits: 4 })}</strong>
        </div>
      )}
      {bull != null && (
        <div className="flex justify-between gap-4 up">
          <span>{SCENARIO_COPY.bull.chartName}</span>
          <strong>{Number(bull).toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
        </div>
      )}
      {base != null && (
        <div className="flex justify-between gap-4">
          <span style={{ color: 'var(--text-muted)' }}>{SCENARIO_COPY.base.chartName}</span>
          <strong>{Number(base).toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
        </div>
      )}
      {bear != null && (
        <div className="flex justify-between gap-4 down">
          <span>{SCENARIO_COPY.bear.chartName}</span>
          <strong>{Number(bear).toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
        </div>
      )}
    </div>
  );
};

const HORIZONS = (['1d', '1w', '1m', '3m'] as const).map((id) => ({
  id,
  label: HORIZON_LABELS[id].short,
  title: HORIZON_LABELS[id].plain,
}));

export const InteractiveChart: React.FC<InteractiveChartProps> = ({
  symbol,
  history,
  forecastTrajectory = [],
  selectedHorizon,
  onHorizonChange,
  theme = 'light',
  isLoading = false,
}) => {
  const [showForecast, setShowForecast] = useState(true);
  const isDark = theme === 'dark';
  const grid = isDark ? '#2d3542' : '#e5e7eb';
  const axis = isDark ? '#8b93a1' : '#6b7280';
  const histColor = isDark ? '#8ab4f8' : '#1a56db';
  const horizonPlain = HORIZON_LABELS[selectedHorizon]?.plain || selectedHorizon;

  const chartData = history.map((h) => ({
    time: h.timestamp.split('T')[0],
    Historical: h.close,
    BullScenario: null as number | null,
    BaseScenario: null as number | null,
    BearScenario: null as number | null,
  }));

  if (showForecast && forecastTrajectory.length > 0 && chartData.length > 0) {
    const last = chartData[chartData.length - 1];
    last.BullScenario = last.Historical;
    last.BaseScenario = last.Historical;
    last.BearScenario = last.Historical;
    forecastTrajectory.slice(1).forEach((ft) => {
      chartData.push({
        time: ft.timestamp.split('T')[0],
        Historical: null as unknown as number,
        BullScenario: ft.bull_price,
        BaseScenario: ft.base_price,
        BearScenario: ft.bear_price,
      });
    });
  }

  return (
    <div className="panel" role="region" aria-label={`${symbol} price chart`}>
      <div className="panel-head flex-wrap">
        <div>
          <h3 className="text-sm font-bold mono">{symbol} · Price chart</h3>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            Past prices, plus optional “what if” lines for the {horizonPlain}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex border w-full sm:w-auto" style={{ borderColor: 'var(--border-color)' }} aria-label="Forecast period">
            {HORIZONS.map((h) => (
              <button
                key={h.id}
                type="button"
                className="seg-btn flex-1 sm:flex-none"
                title={h.title}
                style={{
                  background: selectedHorizon === h.id ? 'var(--accent)' : 'var(--bg-surface)',
                  color: selectedHorizon === h.id ? '#fff' : 'var(--text-secondary)',
                }}
                onClick={() => onHorizonChange(h.id)}
              >
                {h.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="btn touch-target text-[12px] w-full sm:w-auto"
            onClick={() => setShowForecast((v) => !v)}
            aria-pressed={showForecast}
          >
            {showForecast ? 'Hide what-if lines' : 'Show what-if lines'}
          </button>
        </div>
      </div>

      <div className="h-[260px] sm:h-[320px] md:h-[360px] w-full relative p-1 sm:p-2">
        {isLoading && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center gap-2 text-xs font-semibold"
            style={{ background: 'color-mix(in srgb, var(--bg-surface) 80%, transparent)' }}
          >
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--accent)' }} />
            Loading series…
          </div>
        )}
        {!isLoading && history.length === 0 && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center text-sm px-4 text-center"
            style={{ color: 'var(--text-muted)' }}
          >
            No live history for {symbol}. Chart left empty — no synthetic series.
          </div>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={grid} strokeDasharray="2 4" vertical={false} />
            <XAxis dataKey="time" stroke={axis} tick={{ fontSize: 10, fontFamily: 'IBM Plex Mono' }} minTickGap={40} />
            <YAxis
              stroke={axis}
              tick={{ fontSize: 10, fontFamily: 'IBM Plex Mono' }}
              domain={['auto', 'auto']}
              width={56}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'IBM Plex Sans' }} />
            <Area
              type="monotone"
              dataKey="Historical"
              name="Actual close"
              stroke={histColor}
              strokeWidth={2}
              fill={histColor}
              fillOpacity={0.08}
              connectNulls={false}
            />
            {showForecast && (
              <>
                <Line
                  type="monotone"
                  dataKey="BullScenario"
                  name={SCENARIO_COPY.bull.chartName}
                  stroke="#0b7a3e"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  dot={false}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="BaseScenario"
                  name={SCENARIO_COPY.base.chartName}
                  stroke={histColor}
                  strokeWidth={1.5}
                  dot={false}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="BearScenario"
                  name={SCENARIO_COPY.bear.chartName}
                  stroke="#c62828"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  dot={false}
                  connectNulls={false}
                />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {showForecast && forecastTrajectory.length > 0 && (
        <p className="px-3 pb-3 text-[11px] leading-snug" style={{ color: 'var(--text-muted)' }}>
          Green = if things go well · Middle line = most likely · Red = if things go poorly. Dashed lines are model sketches, not guarantees.
        </p>
      )}
    </div>
  );
};
