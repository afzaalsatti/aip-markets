import React from 'react';
import Link from 'next/link';
import { BookOpen, ArrowLeft } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { SymbolSearch, type SearchAsset } from './SymbolSearch';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  searchAssets?: SearchAsset[];
  onSelectSymbol?: (symbol: string) => void;
  onOpenResearch?: (symbol: string) => void;
  canGoBack?: boolean;
  backLabel?: string;
  onBack?: () => void;
}

const NAV = [
  { id: 'overview', label: 'Markets' },
  { id: 'terminal', label: 'Chart' },
  { id: 'ai-report', label: 'Research' },
  { id: 'news', label: 'News' },
  { id: 'calibration', label: 'Models' },
  { id: 'governance', label: 'Disclosures' },
];

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  theme,
  onToggleTheme,
  searchQuery,
  onSearchChange,
  searchAssets = [],
  onSelectSymbol,
  onOpenResearch,
  canGoBack = false,
  backLabel = 'Back',
  onBack,
}) => {
  return (
    <>
      <a href="#main-content" className="skip-to-content">Skip to content</a>

      <header
        className="app-header fixed top-0 inset-x-0 z-50 border-b safe-top"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
      >
        <div className="h-14 md:h-[var(--header-h)] max-w-[1600px] mx-auto px-3 md:px-4 flex items-center gap-2 md:gap-3">
          {canGoBack && onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1.5 shrink-0 touch-target px-1.5 -ml-1"
              aria-label={backLabel}
              title={backLabel}
            >
              <ArrowLeft className="w-5 h-5" style={{ color: 'var(--accent)' }} />
              <span className="text-[13px] font-semibold hidden sm:inline" style={{ color: 'var(--accent)' }}>
                {backLabel.replace(/^Back to\s+/i, '') || 'Back'}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className="flex items-center gap-2 shrink-0 touch-target"
            >
              <span
                className="w-9 h-9 md:w-7 md:h-7 flex items-center justify-center text-[11px] font-bold text-white"
                style={{ background: 'var(--accent)' }}
              >
                AIP
              </span>
              <div className="text-left leading-tight hidden sm:block">
                <div className="text-[14px] md:text-[13px] font-bold tracking-tight">AIP Markets</div>
                <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  Research terminal · not a broker
                </div>
              </div>
            </button>
          )}

          {/* Desktop primary nav */}
          <nav className="hidden md:flex items-stretch h-full ml-2" aria-label="Primary">
            {NAV.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  aria-current={active ? 'page' : undefined}
                  className="px-3 text-[12.5px] font-semibold border-b-2 h-full transition-colors"
                  style={{
                    borderColor: active ? 'var(--accent)' : 'transparent',
                    color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                    background: 'transparent',
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <SymbolSearch
            query={searchQuery}
            onQueryChange={onSearchChange}
            assets={searchAssets}
            onSelectSymbol={onSelectSymbol || (() => undefined)}
            onOpenResearch={onOpenResearch}
            placeholder="AAPL, gold, bitcoin…"
          />

          <div className="flex items-center gap-1 shrink-0">
            <Link
              href="/guide"
              className="btn btn-ghost touch-target px-2.5"
              title="How to use AIP Markets"
            >
              <BookOpen className="w-4 h-4" />
              <span className="hidden lg:inline">How to use</span>
            </Link>
            <ThemeToggle theme={theme} onToggleTheme={onToggleTheme} />
          </div>
        </div>
      </header>
    </>
  );
};
