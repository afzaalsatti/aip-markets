'use client';

import React from 'react';
import {
  BarChart3,
  LineChart,
  FileText,
  Newspaper,
  Activity,
  Shield,
} from 'lucide-react';

const NAV = [
  { id: 'overview', label: 'Markets', icon: BarChart3 },
  { id: 'terminal', label: 'Chart', icon: LineChart },
  { id: 'ai-report', label: 'Research', icon: FileText },
  { id: 'news', label: 'News', icon: Newspaper },
  { id: 'calibration', label: 'Models', icon: Activity },
  { id: 'governance', label: 'Disclose', icon: Shield },
];

interface MobileBottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
}) => {
  return (
    <nav
      className="app-bottom-nav md:hidden fixed bottom-0 inset-x-0 z-50 border-t safe-bottom"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
      aria-label="Primary"
    >
      <ul className="grid grid-cols-6 h-14">
        {NAV.map((item) => {
          const active = activeTab === item.id;
          const Icon = item.icon;
          return (
            <li key={item.id} className="min-w-0">
              <button
                type="button"
                className="relative w-full h-full flex flex-col items-center justify-center gap-0.5 px-0.5"
                style={{
                  color: active ? 'var(--accent)' : 'var(--text-muted)',
                  background: active ? 'var(--accent-soft)' : 'transparent',
                }}
                aria-current={active ? 'page' : undefined}
                onClick={() => setActiveTab(item.id)}
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute top-0 inset-x-2 h-0.5"
                    style={{ background: 'var(--accent)' }}
                  />
                )}
                <Icon className="w-5 h-5 shrink-0" strokeWidth={active ? 2.4 : 2} />
                <span className="text-[9px] font-semibold leading-none truncate max-w-full">
                  {item.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
