'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type AutoRefreshOptions = {
  /** Interval in ms */
  intervalMs: number;
  /** Whether the timer is armed */
  enabled: boolean;
  /** Extra gate (e.g. correct tab active) */
  active?: boolean;
  /** Pause when document is hidden */
  pauseWhenHidden?: boolean;
  /** Run once immediately when armed */
  runOnStart?: boolean;
};

/**
 * Calls `onTick` on an interval while enabled + active + (optionally) visible.
 * Skips overlapping ticks if the previous async refresh is still running.
 */
export function useAutoRefresh(
  onTick: () => void | Promise<void>,
  {
    intervalMs,
    enabled,
    active = true,
    pauseWhenHidden = true,
    runOnStart = false,
  }: AutoRefreshOptions
) {
  const [lastRanAt, setLastRanAt] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [visible, setVisible] = useState(true);
  const onTickRef = useRef(onTick);
  const inFlight = useRef(false);

  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);

  useEffect(() => {
    if (!pauseWhenHidden || typeof document === 'undefined') return;
    const onVis = () => setVisible(document.visibilityState === 'visible');
    onVis();
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [pauseWhenHidden]);

  const run = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setIsRunning(true);
    try {
      await onTickRef.current();
      setLastRanAt(Date.now());
    } finally {
      inFlight.current = false;
      setIsRunning(false);
    }
  }, []);

  const armed = enabled && active && (!pauseWhenHidden || visible);

  useEffect(() => {
    if (!armed) return;
    let cancelled = false;

    if (runOnStart) {
      void run();
    }

    const id = window.setInterval(() => {
      if (!cancelled) void run();
    }, intervalMs);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [armed, intervalMs, run, runOnStart]);

  return { lastRanAt, isRunning, armed, runNow: run };
}

export function formatRefreshAge(lastRanAt: number | null): string {
  if (!lastRanAt) return '—';
  const secs = Math.max(0, Math.round((Date.now() - lastRanAt) / 1000));
  if (secs < 5) return 'just now';
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.round(mins / 60)}h ago`;
}
