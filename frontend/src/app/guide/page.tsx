'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { AppGuidePanel } from '@/components/AppGuidePanel';
import { ThemeToggle } from '@/components/ThemeToggle';
import { GUIDE_PRODUCT_BLURB, GuideSectionId } from '@/components/AppGuideData';

export default function GuidePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const topic = searchParams.get('topic') || searchParams.get('section') || 'welcome';

  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('aip_theme') : null;
    if (saved === 'dark' || saved === 'light') setTheme(saved);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('aip_theme', theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const syncUrl = useCallback(
    (section: GuideSectionId, glossaryId?: string) => {
      const next =
        section === 'glossary' && glossaryId
          ? `/guide?topic=${encodeURIComponent(glossaryId)}`
          : `/guide?topic=${encodeURIComponent(section)}`;
      router.replace(next, { scroll: false });
    },
    [router]
  );

  return (
    <div className="app-shell min-h-screen flex flex-col pb-20 md:pb-0">
      <header
        className="app-header fixed top-0 inset-x-0 z-50 border-b safe-top"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
      >
        <div className="h-14 max-w-[1100px] mx-auto px-3 flex items-center gap-2">
          <Link
            href="/?tab=overview"
            className="btn btn-ghost touch-target px-2.5 shrink-0"
            title="Back to Markets"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="sr-only">Back to Markets</span>
          </Link>

          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span
              className="w-8 h-8 flex items-center justify-center text-[11px] font-bold text-white shrink-0"
              style={{ background: 'var(--accent)' }}
            >
              AIP
            </span>
            <div className="leading-tight min-w-0">
              <div className="text-[15px] font-bold flex items-center gap-1.5 truncate">
                <BookOpen className="w-4 h-4 shrink-0" style={{ color: 'var(--accent)' }} />
                How to use
              </div>
              <div className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                {GUIDE_PRODUCT_BLURB}
              </div>
            </div>
          </div>

          <ThemeToggle
            theme={theme}
            onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          />
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1100px] mx-auto px-3 sm:px-4 py-3 sm:py-5">
        <AppGuidePanel topic={topic} onSectionChange={syncUrl} />
      </main>

      {/* Mobile sticky CTA */}
      <div
        className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t safe-bottom"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
      >
        <div className="px-3 py-2.5 flex gap-2">
          <Link href="/?tab=overview" className="btn btn-primary touch-target flex-1 text-[13px]">
            Open Markets
          </Link>
          <Link href="/?tab=terminal" className="btn touch-target flex-1 text-[13px]">
            Open Chart
          </Link>
        </div>
      </div>

      <footer
        className="hidden md:flex border-t text-[11px] px-4 py-2 justify-between gap-2"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
      >
        <span>Research only · not advice · free OSS + public data</span>
        <span className="flex gap-3">
          <Link href="/?tab=governance" className="hover:underline" style={{ color: 'var(--accent)' }}>
            Disclosures
          </Link>
          <Link href="/?tab=overview" className="hover:underline" style={{ color: 'var(--accent)' }}>
            Open Markets →
          </Link>
        </span>
      </footer>
    </div>
  );
}
