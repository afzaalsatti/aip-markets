export type GuideSectionId =
  | 'welcome'
  | 'workflow'
  | 'markets'
  | 'chart'
  | 'research'
  | 'news'
  | 'models'
  | 'disclosures'
  | 'glossary';

export type GlossaryEntry = {
  id: string;
  title: string;
  category: string;
  description: string;
  howToRead: string;
  ruleOfThumb: string;
};

export const GUIDE_NAV: { id: GuideSectionId; label: string }[] = [
  { id: 'welcome', label: 'What this is' },
  { id: 'workflow', label: 'Quick start' },
  { id: 'markets', label: 'Markets' },
  { id: 'chart', label: 'Chart' },
  { id: 'research', label: 'Research' },
  { id: 'news', label: 'News' },
  { id: 'models', label: 'Models' },
  { id: 'disclosures', label: 'Disclosures' },
  { id: 'glossary', label: 'Metric glossary' },
];

/** Short product blurb reused by guide header copy */
export const GUIDE_PRODUCT_BLURB =
  'Personal research terminal · free OSS + public data · EU/US informational posture · not a broker';

export const GLOSSARY: GlossaryEntry[] = [
  {
    id: 'sharpe_ratio',
    title: 'Reward vs risk (Sharpe)',
    category: 'Risk / return',
    description:
      'How much reward you got for the bumpy ride — extra return versus a safe rate, divided by how wild the swings were.',
    howToRead: 'Higher is better when comparing similar assets over the same window.',
    ruleOfThumb: '~1.0 = OK · 1.5–2.0+ = strong · below 0.5 = weak payoff for the risk.',
  },
  {
    id: 'sortino_ratio',
    title: 'Reward vs drops (Sortino)',
    category: 'Risk / return',
    description:
      'Like reward vs risk, but it only penalizes downward moves. Upside swings are not treated as “bad”.',
    howToRead: 'Useful when you care more about avoiding losses than about calm upside.',
    ruleOfThumb: 'Above ~1.5 often reads as solid downside-adjusted performance.',
  },
  {
    id: 'beta_market',
    title: 'Vs market (beta vs SPY)',
    category: 'Market sensitivity',
    description:
      'How much this asset tends to move when the S&P 500 ETF (SPY) moves.',
    howToRead: '1.0 ≈ moves with the market. Above 1 amplifies; below 1 is usually calmer.',
    ruleOfThumb: 'High beta can help in rallies and hurt more in selloffs.',
  },
  {
    id: 'max_drawdown',
    title: 'Maximum drawdown (“worst slide”)',
    category: 'Downside risk',
    description:
      'The largest peak-to-trough drop in the sample window — a sense of historical pain.',
    howToRead: 'More negative = deeper historical slide. It is not a prediction of the next drop.',
    ruleOfThumb: 'Very deep drawdowns (e.g. worse than −25%) mean the path was stressful.',
  },
  {
    id: 'cvar_95',
    title: 'Bad-day average',
    category: 'Ugly days',
    description:
      'On the ugliest ~5% of days, what was the average daily move? A sense of how painful rare bad days were.',
    howToRead: 'More negative means those rare bad days were larger on average.',
    ruleOfThumb: 'Use it to understand risk — not as a guaranteed next-day loss.',
  },
  {
    id: 'volatility_regime',
    title: 'How jumpy (30-day)',
    category: 'Market mood',
    description:
      'How jumpy prices have been recently, scaled to an annual percentage.',
    howToRead: 'Low ≈ calm / sideways. High ≈ larger swings and bigger surprises.',
    ruleOfThumb: 'Rough bands: under ~15% calm · ~15–35% normal · over ~35% high.',
  },
  {
    id: 'rsi_14',
    title: 'Momentum score (RSI)',
    category: 'Momentum',
    description:
      'A 0–100 score. It asks whether recent buying or selling has gotten stretched.',
    howToRead: 'Near 50 is balanced. High often means stretched up; low often means stretched down.',
    ruleOfThumb: 'Above 70 = stretched higher · below 30 = stretched lower · not a standalone signal.',
  },
  {
    id: 'forecast_scenarios',
    title: 'What-if paths & stress loss',
    category: 'Forecasting',
    description:
      'Three simple stories for the selected period: if things go well, the most likely path, and if things go poorly — plus a rough stress-loss dollar sketch.',
    howToRead:
      '“About X% chance” is the model’s odds for that story, not a promise. Treat paths like a weather forecast.',
    ruleOfThumb: 'Compare the three stories and their drivers; never size a trade on one middle number alone.',
  },
  {
    id: 'data_freshness',
    title: 'Live vs unavailable',
    category: 'Data honesty',
    description:
      'Badges tell you whether quotes, charts, news, or models came from a live upstream call — or whether that surface is empty because the feed failed.',
    howToRead:
      'Live = recent successful fetch. Unavailable / empty = we will not invent prices or headlines. Research notes may still use a soft LLM narrative fallback if Ollama is down.',
    ruleOfThumb: 'If Markets looks empty, check the API and yfinance rate limits — do not treat missing data as “flat markets”.',
  },
];

/** Map older topic keys / guide opens to a section + optional glossary id */
export function resolveGuideOpen(topic?: string): { section: GuideSectionId; glossaryId?: string } {
  if (!topic || topic === 'welcome' || topic === 'getting_started' || topic === 'guide') {
    return { section: 'welcome' };
  }
  if (GUIDE_NAV.some((n) => n.id === topic)) {
    return { section: topic as GuideSectionId };
  }
  const gloss = GLOSSARY.find((g) => g.id === topic);
  if (gloss) return { section: 'glossary', glossaryId: gloss.id };
  return { section: 'welcome' };
}
