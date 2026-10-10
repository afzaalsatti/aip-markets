'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  GUIDE_NAV,
  GLOSSARY,
  GuideSectionId,
  resolveGuideOpen,
} from './AppGuideData';

interface AppGuidePanelProps {
  topic?: string;
  onSectionChange?: (section: GuideSectionId, glossaryId?: string) => void;
}

function ActionButton({
  children,
  primary,
  onClick,
}: {
  children: React.ReactNode;
  primary?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`btn touch-target w-full sm:w-auto ${primary ? 'btn-primary' : ''}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function SectionBody({
  section,
  glossaryId,
  setGlossaryId,
  goHomeTab,
}: {
  section: GuideSectionId;
  glossaryId?: string;
  setGlossaryId: (id: string) => void;
  goHomeTab: (tab: string) => void;
}) {
  if (section === 'welcome') {
    return (
      <div className="space-y-4 text-[15px] sm:text-[14px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        <p>
          <strong style={{ color: 'var(--text-primary)' }}>AIP Markets</strong> is a personal research
          terminal for equities, forex, crypto, commodities, and fixed income — built on open-source
          software and free public data (delayed quotes, gov/public RSS, optional local Ollama).
        </p>
        <p>It helps you:</p>
        <ul className="space-y-2 pl-0 list-none">
          {[
            'Scan delayed public quotes and build a watchlist on this device',
            'Read charts with if-things-go-well / most-likely / if-things-go-poorly paths',
            'Understand technicals and risk in plain English',
            'Open a research note grounded in quant numbers + markets headlines',
            'Check walk-forward model accuracy and EU/US disclosures',
          ].map((item) => (
            <li
              key={item}
              className="flex gap-2 p-3"
              style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-color)' }}
            >
              <span style={{ color: 'var(--accent)' }}>·</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <div className="p-3 text-[13px]" style={{ background: 'var(--warn-bg)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
          <strong style={{ color: 'var(--text-primary)' }}>Important: </strong>
          Not a broker and not investment advice (EU MiFID / US non-advice framing). Numbers can be
          wrong. Freshness badges show live vs unavailable — we do not invent prices when feeds fail.
        </div>
        <ActionButton primary onClick={() => goHomeTab('overview')}>
          Start in Markets
        </ActionButton>
      </div>
    );
  }

  if (section === 'workflow') {
    return (
      <div className="space-y-4 text-[15px] sm:text-[14px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        <ol className="list-none space-y-3 pl-0">
          {[
            {
              n: '1',
              t: 'Start in Markets',
              d: 'Browse the screener, star symbols, or tap a row to open the chart. Auto-refresh updates quotes while this tab is visible.',
              action: { label: 'Open Markets', tab: 'overview', primary: true },
            },
            {
              n: '2',
              t: 'Review Chart',
              d: 'Read “In plain English” first, then metrics and the chart. Try history (30D–1Y) and horizon (1D–3M).',
              action: { label: 'Open Chart', tab: 'terminal' },
            },
            {
              n: '3',
              t: 'Open Research',
              d: 'On-demand note: technical + fundamental/macro + markets news citations. Local Ollama preferred; soft narrative fallback only if Ollama is down.',
              action: { label: 'Open Research', tab: 'ai-report' },
            },
            {
              n: '4',
              t: 'News & Models',
              d: 'Markets RSS for research context; World for general knowledge only. Models shows walk-forward accuracy on liquid proxies.',
              action: { label: 'Open News', tab: 'news' },
            },
            {
              n: '5',
              t: 'Read Disclosures',
              d: 'EU & US research posture, free OSS stack, and public-data attribution — transparency, not a lawyer guarantee.',
              action: { label: 'Open Disclosures', tab: 'governance' },
            },
          ].map((step) => (
            <li
              key={step.n}
              className="p-3 space-y-2"
              style={{ border: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-7 h-7 flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ background: 'var(--accent)' }}
                >
                  {step.n}
                </span>
                <strong style={{ color: 'var(--text-primary)' }}>{step.t}</strong>
              </div>
              <p>{step.d}</p>
              {step.action && (
                <ActionButton
                  primary={step.action.primary}
                  onClick={() => goHomeTab(step.action!.tab)}
                >
                  {step.action.label}
                </ActionButton>
              )}
            </li>
          ))}
        </ol>
      </div>
    );
  }

  const tabSections: Partial<Record<GuideSectionId, { title: string; tab: string; bullets: string[]; tip?: string }>> = {
    markets: {
      title: 'Markets',
      tab: 'overview',
      bullets: [
        'Filter by asset class',
        'Sort by symbol, price, change %, or volume',
        'Star symbols to save a watchlist on this device',
        'Tap a row → Chart · Research → research note',
        'Side panels: watchlist, gainers, losers (below on phones)',
      ],
    },
    chart: {
      title: 'Chart',
      tab: 'terminal',
      tip: 'History (30D–1Y) changes the chart window. Horizon (1D–3M) changes the forecast.',
      bullets: [
        'In plain English — bias, checklist, risk, fundamentals',
        'Quick metrics — each tile says what it means; tap (i) for more',
        'Indicator values — SMA, MACD, Bollinger, ATR',
        'Price chart with optional “what if” lines',
        'Three plain cards under the chart: if things go well / most likely / if things go poorly',
      ],
    },
    research: {
      title: 'Research',
      tab: 'ai-report',
      tip: 'The local LLM explains numbers — it does not invent the price forecast.',
      bullets: [
        'Plain-English brief',
        'Market / technical / fundamental / news sections',
        'Cited sources with timestamps',
        'Key risks listed separately',
      ],
    },
    news: {
      title: 'News',
      tab: 'news',
      tip: 'World tab is general knowledge only — it is never used in research notes or forecasts.',
      bullets: [
        'Markets — public/gov RSS (Fed, ECB, SEC, BBC Business, NPR, DW) that may be cited in research',
        'World — public broadcasters & IGOs (BBC, NPR, DW, France 24, UN, WHO, NASA)',
        'No commercial aggregator scrapes in the default feed list',
        'Filter by theme or source; tap Refresh to pull live RSS now',
        'Sentiment on markets stories is a screening score (−1 to +1), not a trade signal',
      ],
    },
    models: {
      title: 'Models',
      tab: 'calibration',
      tip: 'If a row shows “—” the proxy did not have enough history. Walk-forward here is next-day style accuracy.',
      bullets: [
        'Avg error / big-miss error — how far predictions were off (lower is better)',
        'Right direction — how often up vs down was guessed correctly',
        'Reliability — rough score of how trustworthy the signals looked',
      ],
    },
    disclosures: {
      title: 'Disclosures',
      tab: 'governance',
      tip: 'Also see NOTICE.md in the repo for the same EU/US + free-data posture in writing.',
      bullets: [
        'EU (GDPR, AI Act, MiFID non-advice) and US (non-advice / no brokerage) framing',
        'Free OSS stack + delayed public quotes + gov/public RSS + local Ollama',
        'No paid market-data SaaS required for the default personal-research path',
        'Transparency only — not legal advice and not a guarantee against third-party notices',
      ],
    },
  };

  if (section in tabSections) {
    const s = tabSections[section]!;
    return (
      <div className="space-y-4 text-[15px] sm:text-[14px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        <p>
          <strong style={{ color: 'var(--text-primary)' }}>{s.title}</strong>
          {section === 'markets' && ' is your screener.'}
          {section === 'chart' && ' is the analysis workspace for one symbol.'}
          {section === 'research' && ' builds a note from quant outputs and headlines.'}
          {section === 'news' && ' lists headlines with category and sentiment.'}
          {section === 'models' && ' shows walk-forward results on liquid proxies.'}
          {section === 'disclosures' && ' covers product and regulatory boundaries.'}
        </p>
        <ul className="space-y-2 list-none pl-0">
          {s.bullets.map((b) => (
            <li key={b} className="flex gap-2 px-3 py-2.5" style={{ background: 'var(--bg-surface-elevated)' }}>
              <span style={{ color: 'var(--accent)' }}>·</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
        {s.tip && (
          <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>{s.tip}</p>
        )}
        <ActionButton primary onClick={() => goHomeTab(s.tab)}>
          Go to {s.title}
        </ActionButton>
      </div>
    );
  }

  const active = GLOSSARY.find((g) => g.id === glossaryId) || GLOSSARY[0];
  return (
    <div className="space-y-4">
      <div className="scroll-x -mx-1 px-1 pb-1">
        <div className="flex gap-2 w-max">
          {GLOSSARY.map((g) => {
            const on = active.id === g.id;
            return (
              <button
                key={g.id}
                type="button"
                className={`chip touch-target h-9 px-3 text-[12px] ${on ? 'chip-active' : ''}`}
                onClick={() => setGlossaryId(g.id)}
              >
                {g.title}
              </button>
            );
          })}
        </div>
      </div>
      <div className="space-y-3 text-[15px] sm:text-[14px]" style={{ color: 'var(--text-secondary)' }}>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--accent)' }}>
            {active.category}
          </div>
          <h4 className="text-lg font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
            {active.title}
          </h4>
        </div>
        <div>
          <h5 className="text-xs font-bold mb-1" style={{ color: 'var(--text-primary)' }}>In plain English</h5>
          <p className="leading-relaxed">{active.description}</p>
        </div>
        <div>
          <h5 className="text-xs font-bold mb-1" style={{ color: 'var(--text-primary)' }}>How to read it here</h5>
          <p className="leading-relaxed">{active.howToRead}</p>
        </div>
        <div className="p-3 text-[13px]" style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-color)' }}>
          <strong style={{ color: 'var(--text-primary)' }}>Rule of thumb: </strong>
          {active.ruleOfThumb}
        </div>
      </div>
    </div>
  );
}

export const AppGuidePanel: React.FC<AppGuidePanelProps> = ({
  topic = 'welcome',
  onSectionChange,
}) => {
  const router = useRouter();
  const chipRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const resolved = useMemo(() => resolveGuideOpen(topic), [topic]);
  const [section, setSection] = useState<GuideSectionId>(resolved.section);
  const [glossaryId, setGlossaryId] = useState(resolved.glossaryId || GLOSSARY[0].id);

  useEffect(() => {
    const r = resolveGuideOpen(topic);
    setSection(r.section);
    if (r.glossaryId) setGlossaryId(r.glossaryId);
  }, [topic]);

  useEffect(() => {
    onSectionChange?.(section, section === 'glossary' ? glossaryId : undefined);
  }, [section, glossaryId, onSectionChange]);

  useEffect(() => {
    chipRefs.current[section]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [section]);

  const title =
    section === 'glossary'
      ? 'Metric glossary'
      : GUIDE_NAV.find((n) => n.id === section)?.label || 'Guide';

  const goHomeTab = (tab: string) => {
    router.push(`/?tab=${encodeURIComponent(tab)}`);
  };

  const selectGlossary = (id: string) => {
    setGlossaryId(id);
    setSection('glossary');
  };

  return (
    <div className="flex flex-col gap-3 md:gap-0 md:panel md:flex-row md:overflow-hidden md:min-h-[560px]">
      {/* Mobile-first: horizontal section chips */}
      <nav
        className="md:w-52 md:shrink-0 md:border-r scroll-x -mx-3 px-3 md:mx-0 md:px-0 md:overflow-y-auto"
        style={{ borderColor: 'var(--border-color)', background: 'var(--bg-surface-elevated)' }}
        aria-label="Guide sections"
      >
        <div className="hidden md:block px-3 py-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--accent)' }}>
            Guide
          </div>
          <div className="text-sm font-bold mt-0.5">{title}</div>
        </div>
        <ul className="flex md:flex-col gap-2 md:gap-0.5 py-2 md:p-1.5 w-max md:w-full">
          {GUIDE_NAV.map((item) => {
            const active = section === item.id;
            return (
              <li key={item.id} className="shrink-0 md:w-full">
                <button
                  ref={(el) => {
                    chipRefs.current[item.id] = el;
                  }}
                  type="button"
                  className="touch-target px-3.5 md:px-2.5 text-[13px] md:text-[12px] font-semibold whitespace-nowrap md:w-full md:text-left"
                  style={{
                    border: '1px solid',
                    borderColor: active ? 'var(--accent)' : 'var(--border-color)',
                    background: active ? 'var(--accent-soft)' : 'var(--bg-surface)',
                    color: active ? 'var(--accent)' : 'var(--text-secondary)',
                  }}
                  onClick={() => setSection(item.id)}
                >
                  <span
                    className="md:border-l-2 md:pl-2 block"
                    style={{ borderColor: active ? 'var(--accent)' : 'transparent' }}
                  >
                    {item.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex-1 panel md:border-0 p-4 sm:p-5 md:p-6">
        <h1 className="text-xl font-bold mb-1 md:text-lg" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h1>
        <p className="text-[13px] mb-4 md:hidden" style={{ color: 'var(--text-muted)' }}>
          Swipe the topics above, then read below.
        </p>
        <SectionBody
          section={section}
          glossaryId={glossaryId}
          setGlossaryId={selectGlossary}
          goHomeTab={goHomeTab}
        />
      </div>
    </div>
  );
};
