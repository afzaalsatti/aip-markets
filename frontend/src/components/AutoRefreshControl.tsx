'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw, Pause, Play } from 'lucide-react';
import { formatRefreshAge } from '@/hooks/useAutoRefresh';

interface AutoRefreshControlProps {
  enabled: boolean;
  onToggle: () => void;
  intervalLabel: string;
  lastRanAt: number | null;
  isRunning?: boolean;
  onRefreshNow?: () => void;
  compact?: boolean;
}

export const AutoRefreshControl: React.FC<AutoRefreshControlProps> = ({
  enabled,
  onToggle,
  intervalLabel,
  lastRanAt,
  isRunning = false,
  onRefreshNow,
  compact = false,
}) => {
  const [, bump] = useState(0);

  // Keep "Xs ago" fresh without remounting parents
  useEffect(() => {
    if (!enabled && !lastRanAt) return;
    const id = window.setInterval(() => bump((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [enabled, lastRanAt]);

  return (
    <div
      className={`inline-flex items-center gap-1.5 flex-wrap ${compact ? 'text-[10px]' : 'text-[11px]'}`}
      style={{ color: 'var(--text-muted)' }}
    >
      <button
        type="button"
        className="btn touch-target px-2.5"
        style={{
          minHeight: compact ? 32 : undefined,
          background: enabled ? 'var(--up-bg)' : 'var(--bg-surface)',
          color: enabled ? 'var(--up)' : 'var(--text-secondary)',
          borderColor: enabled ? 'var(--up)' : 'var(--border-color)',
        }}
        onClick={onToggle}
        title={enabled ? 'Pause auto-refresh' : 'Enable auto-refresh'}
        aria-pressed={enabled}
      >
        {enabled ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        <span className="font-semibold">{enabled ? 'Auto' : 'Paused'}</span>
      </button>

      {onRefreshNow && (
        <button
          type="button"
          className="btn touch-target px-2.5"
          onClick={onRefreshNow}
          disabled={isRunning}
          title="Refresh now"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Now</span>
        </button>
      )}

      <span className="mono whitespace-nowrap">
        {intervalLabel}
        {enabled ? ` · updated ${formatRefreshAge(lastRanAt)}` : ''}
        {isRunning ? ' · refreshing…' : ''}
      </span>
    </div>
  );
};
