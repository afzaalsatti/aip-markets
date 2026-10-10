import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'AIP Markets | Research Terminal',
  description:
    'Personal multi-asset research terminal — delayed public quotes, technicals, scenario forecasts, public RSS, and local LLM notes. Informational only; not a broker.',
  applicationName: 'AIP Markets',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f6f3' },
    { media: '(prefers-color-scheme: dark)', color: '#12141a' },
  ],
};

function ShellFallback() {
  return (
    <div className="app-shell min-h-screen flex flex-col">
      <div
        className="fixed top-0 inset-x-0 z-50 h-14 border-b"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
        aria-hidden
      />
      <main className="flex-1 flex items-center justify-center p-6">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Loading AIP Markets…
        </p>
      </main>
    </div>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('aip_theme');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t);else document.documentElement.setAttribute('data-theme','light');}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`,
          }}
        />
      </head>
      <body className="min-h-screen antialiased">
        <Suspense fallback={<ShellFallback />}>{children}</Suspense>
      </body>
    </html>
  );
}
