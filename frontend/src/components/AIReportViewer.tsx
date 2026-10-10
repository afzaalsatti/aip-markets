import React from 'react';
import { ExternalLink, AlertTriangle } from 'lucide-react';
import { AnalysisBrief, AnalysisBriefData } from './AnalysisBrief';
import { DataFreshness } from './DataFreshness';

interface GroundedCitation {
  source: string;
  url: string;
  title: string;
  published_at: string;
  formatted_datetime?: string;
  claim_supported: string;
}

interface AIReportProps {
  report: {
    symbol: string;
    asset_name: string;
    model_used: string;
    generated_at: string;
    market_overview: unknown;
    technical_outlook: unknown;
    fundamental_outlook: unknown;
    news_impact_assessment: unknown;
    scenarios: any;
    key_risks?: unknown;
    grounded_citations?: GroundedCitation[];
    confidence_score: number | null;
    analysis_brief?: AnalysisBriefData;
    is_llm_fallback?: boolean;
    freshness?: {
      source?: string;
      realtime?: boolean;
      status?: string;
      detail?: string;
    };
    market_data_realtime?: boolean;
  };
  onOpenGuide?: (topic: string) => void;
}

function formatDateTime(pubDateStr: string, formattedStr?: string) {
  if (formattedStr) return formattedStr;
  try {
    return new Date(pubDateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return pubDateStr;
  }
}

/** Small models sometimes return nested JSON; never pass raw objects to React children. */
function asText(value: unknown, fallback = '—'): string {
  if (value == null) return fallback;
  if (typeof value === 'string') return value || fallback;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    const lines = value
      .map((item) => {
        if (typeof item === 'string') return `• ${item}`;
        if (item && typeof item === 'object') return `• ${asText(item, '')}`;
        return item != null ? `• ${String(item)}` : '';
      })
      .filter(Boolean);
    return lines.length ? lines.join('\n') : fallback;
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    for (const key of ['text', 'summary', 'overview', 'content', 'description', 'narrative']) {
      if (typeof obj[key] === 'string' && (obj[key] as string).trim()) {
        return obj[key] as string;
      }
    }
    const lines = Object.entries(obj).map(([k, v]) => {
      const label = k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      return `${label}: ${asText(v, '')}`;
    });
    return lines.filter((l) => !l.endsWith(': ')).join('\n') || fallback;
  }
  return fallback;
}

function asRiskList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => asText(item, ''))
      .filter(Boolean);
  }
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

const Section = ({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) => (
  <section className="panel">
    <div className="panel-head">
      <div>
        <h3 className="text-sm font-bold">{title}</h3>
        {subtitle && (
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
        )}
      </div>
    </div>
    <div className="p-4 text-[15px] md:text-[13px] leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-secondary)' }}>
      {children}
    </div>
  </section>
);

export const AIReportViewer: React.FC<AIReportProps> = ({ report, onOpenGuide }) => {
  const citations = Array.isArray(report.grounded_citations) ? report.grounded_citations : [];
  const risks = asRiskList(report.key_risks);

  return (
    <article className="space-y-3" aria-labelledby="research-title">
      <div className="panel">
        <div className="panel-head flex-wrap">
          <div>
            <h2 id="research-title" className="text-base md:text-sm font-bold">
              Research note · {report.symbol}
            </h2>
            <p className="text-[12px] md:text-[11px]" style={{ color: 'var(--text-muted)' }}>
              {report.asset_name} · {report.model_used} ·{' '}
              {new Date(report.generated_at).toLocaleString()}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DataFreshness
              freshness={report.freshness}
              realtime={report.market_data_realtime && !report.is_llm_fallback}
              label={
                report.is_llm_fallback
                  ? 'LLM fallback'
                  : report.freshness?.realtime
                    ? 'Live LLM'
                    : 'Research'
              }
            />
            {report.market_data_realtime && (
              <DataFreshness realtime label="Live market inputs" compact />
            )}
            {report.confidence_score != null && (
              <span className="chip">
                Confidence {(report.confidence_score * 100).toFixed(0)}%
              </span>
            )}
          </div>
        </div>
        <div className="px-4 py-2.5 text-[12px] md:text-[11px] border-t" style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
          Written in plain English from model numbers and cited headlines. Informational only — not investment advice.
        </div>
      </div>

      {report.analysis_brief && (
        <AnalysisBrief brief={report.analysis_brief} onOpenGuide={onOpenGuide} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Section title="Market overview" subtitle="Big picture">
          {asText(report.market_overview)}
        </Section>
        <Section title="Technical outlook" subtitle="Charts & momentum">
          {asText(report.technical_outlook)}
        </Section>
        <Section title="Fundamental / macro" subtitle="What usually drives the price">
          {asText(report.fundamental_outlook)}
        </Section>
        <Section title="News impact" subtitle="Headlines in context">
          {asText(report.news_impact_assessment)}
        </Section>
      </div>

      <section className="panel">
        <div className="panel-head">
          <h3 className="text-sm font-bold">Sources ({citations.length})</h3>
        </div>
        <ul className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
          {citations.map((cite, idx) => (
            <li key={idx}>
              <a
                href={cite.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start justify-between gap-3 px-4 py-3.5 min-h-[var(--touch-min)] hover:bg-[var(--bg-hover)] active:bg-[var(--bg-hover)]"
              >
                <div className="min-w-0">
                  <div className="text-[12px] md:text-[11px] font-semibold" style={{ color: 'var(--accent)' }}>
                    {cite.source}
                  </div>
                  <div className="text-[15px] md:text-[13px] font-semibold mt-0.5">{cite.title}</div>
                  <div className="text-[12px] md:text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                    {formatDateTime(cite.published_at, cite.formatted_datetime)} · {asText(cite.claim_supported, '')}
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 shrink-0 mt-1" style={{ color: 'var(--text-muted)' }} />
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel" style={{ borderColor: 'var(--down)' }}>
        <div className="panel-head">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 down" />
            Key risks (keep these in mind)
          </h3>
        </div>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x" style={{ borderColor: 'var(--border-color)' }}>
          {risks.map((risk, idx) => (
            <li key={idx} className="p-4 text-[14px] md:text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
              {risk}
            </li>
          ))}
          {risks.length === 0 && (
            <li className="p-4 text-[14px] md:text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
              No key risks listed for this note.
            </li>
          )}
        </ul>
      </section>
    </article>
  );
};
