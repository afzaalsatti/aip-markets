/**
 * Plain-English labels for market / forecast jargon used across the UI.
 * Keep numbers; explain them like talking to a non-trader.
 */

export type ScenarioKind = 'bull' | 'base' | 'bear';

export const SCENARIO_COPY: Record<
  ScenarioKind,
  { title: string; subtitle: string; chartName: string; tone: 'up' | 'neutral' | 'down' }
> = {
  bull: {
    title: 'If things go well',
    subtitle: 'An optimistic outcome — better than a typical day in the model',
    chartName: 'Optimistic',
    tone: 'up',
  },
  base: {
    title: 'Most likely path',
    subtitle: 'The middle / typical outcome the model expects',
    chartName: 'Typical',
    tone: 'neutral',
  },
  bear: {
    title: 'If things go poorly',
    subtitle: 'A pessimistic outcome — worse than a typical day in the model',
    chartName: 'Pessimistic',
    tone: 'down',
  },
};

export const HORIZON_LABELS: Record<string, { short: string; plain: string }> = {
  '1d': { short: '1D', plain: 'next day' },
  '1w': { short: '1W', plain: 'next week' },
  '1m': { short: '1M', plain: 'next month' },
  '3m': { short: '3M', plain: 'next 3 months' },
};

/** Model probability 0–1 → "About 35% chance (model odds)" */
export function formatModelOdds(probability: number | null | undefined): string {
  if (probability == null || Number.isNaN(Number(probability))) return 'Odds unknown';
  const pct = Math.round(Number(probability) * 100);
  return `About ${pct}% chance`;
}

export function formatModelOddsHint(): string {
  return 'How often this path shows up in the model — not a guarantee';
}

export const METRIC_PLAIN = {
  sharpe: { label: 'Reward vs risk', means: 'Did the upside make up for the bumpy ride?' },
  sortino: { label: 'Reward vs drops', means: 'Like reward vs risk, but only counts down days' },
  beta: { label: 'Vs market', means: 'How hard this jumps when the broad market moves' },
  maxDrawdown: { label: 'Worst slide', means: 'Biggest peak-to-trough drop in the sample' },
  cvar: { label: 'Bad-day average', means: 'On the ugliest ~5% of days, how bad was the average move?' },
  var95: {
    label: 'Stress loss',
    means: 'A rough bad-case loss size the model flags — not a promise',
  },
  rsi: { label: 'Momentum', means: 'Is recent buying/selling getting stretched? (0–100)' },
  vol: { label: 'How jumpy', means: 'How large recent price swings have been' },
} as const;

export const MODEL_METRIC_PLAIN = {
  mae: { label: 'Avg error', hint: 'Typical size of misses (lower is better)' },
  rmse: { label: 'Big-miss error', hint: 'Penalizes large mistakes more (lower is better)' },
  dirAcc: { label: 'Right direction', hint: 'How often the model guessed up vs down correctly' },
  calibration: { label: 'Reliability', hint: 'Rough score of how trustworthy the signals looked' },
  folds: { label: 'Test rounds', hint: 'How many walk-forward checks were run' },
} as const;
