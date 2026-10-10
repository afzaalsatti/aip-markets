'use client';

import React from 'react';
import { Radio, AlertTriangle, WifiOff, Sparkles } from 'lucide-react';

export type FreshnessStatus = 'ok' | 'degraded' | 'unavailable' | 'fallback';

export type FreshnessInfo = {
  source?: string;
  realtime?: boolean;
  status?: FreshnessStatus | string;
  as_of?: string;
  detail?: string;
};

interface DataFreshnessProps {
  freshness?: FreshnessInfo | null;
  /** Explicit overrides when API has no freshness block */
  realtime?: boolean;
  label?: string;
  className?: string;
  compact?: boolean;
}

function resolve(props: DataFreshnessProps): {
  kind: 'live' | 'degraded' | 'fallback' | 'offline';
  text: string;
  title: string;
} {
  const f = props.freshness;
  const realtime = props.realtime ?? f?.realtime;
  const status = (f?.status || (realtime ? 'ok' : 'unavailable')) as string;
  const detail = f?.detail || props.label || '';

  if (status === 'fallback' || (f?.source || '').includes('fallback') || (f?.source || '').includes('mock')) {
    return {
      kind: 'fallback',
      text: props.label || 'LLM fallback',
      title: detail || 'Using grounded template because live LLM is unavailable',
    };
  }
  if (realtime && (status === 'ok' || status === 'degraded')) {
    return {
      kind: status === 'degraded' ? 'degraded' : 'live',
      text: props.label || (status === 'degraded' ? 'Live · partial' : 'Live'),
      title: detail || 'Pulled from live upstream this session',
    };
  }
  if (status === 'degraded') {
    const cached =
      /cache|rate-?limit/i.test(detail) || /cache|rate-?limit/i.test(props.label || '');
    return {
      kind: 'degraded',
      text: props.label || (cached ? 'Cached' : 'Partial'),
      title: detail || 'Some live fields missing',
    };
  }
  return {
    kind: 'offline',
    text: props.label || 'Unavailable',
    title: detail || 'Live data could not be fetched',
  };
}

const STYLES: Record<string, { bg: string; color: string; Icon: typeof Radio }> = {
  live: { bg: 'var(--up-bg)', color: 'var(--up)', Icon: Radio },
  degraded: { bg: 'var(--warn-bg)', color: 'var(--warn)', Icon: AlertTriangle },
  fallback: { bg: 'var(--accent-soft)', color: 'var(--accent)', Icon: Sparkles },
  offline: { bg: 'var(--bg-surface-elevated)', color: 'var(--text-muted)', Icon: WifiOff },
};

export const DataFreshness: React.FC<DataFreshnessProps> = ({
  freshness,
  realtime,
  label,
  className = '',
  compact = false,
}) => {
  const { kind, text, title } = resolve({ freshness, realtime, label });
  const style = STYLES[kind];
  const Icon = style.Icon;

  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold whitespace-nowrap ${compact ? 'text-[10px] px-1.5 py-0.5' : 'text-[11px] px-2 py-1'} ${className}`}
      style={{
        background: style.bg,
        color: style.color,
        border: '1px solid var(--border-color)',
      }}
      title={title}
      aria-label={`${text}. ${title}`}
    >
      <Icon className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      {text}
    </span>
  );
};
