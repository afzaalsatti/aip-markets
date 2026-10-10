'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="app-shell min-h-screen flex flex-col items-center justify-center px-4">
      <div className="panel max-w-md w-full p-6 space-y-4 text-center">
        <div
          className="w-10 h-10 mx-auto flex items-center justify-center text-[12px] font-bold text-white"
          style={{ background: 'var(--accent)' }}
        >
          AIP
        </div>
        <h1 className="text-lg font-bold">Something went wrong</h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          The UI hit an unexpected error. Market data is not invented when this happens — check that
          the API is running at{' '}
          <span className="mono">http://localhost:8000</span> and try again.
        </p>
        {error?.message && (
          <p className="text-[12px] mono break-all" style={{ color: 'var(--text-muted)' }}>
            {error.message}
          </p>
        )}
        <button type="button" className="btn btn-primary touch-target w-full" onClick={reset}>
          Retry
        </button>
      </div>
    </div>
  );
}
