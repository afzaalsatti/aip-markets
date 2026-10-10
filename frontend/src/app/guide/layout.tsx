import type { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'How to use | AIP Markets',
  description: 'Guide to AIP Markets: markets screener, charts, research notes, news, and metric glossary.',
};

export default function GuideLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>
          Loading guide…
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
