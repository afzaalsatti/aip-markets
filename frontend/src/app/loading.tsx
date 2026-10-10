export default function Loading() {
  return (
    <div className="app-shell min-h-screen flex flex-col">
      <div
        className="fixed top-0 inset-x-0 z-50 h-14 border-b flex items-center px-4"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
      >
        <span
          className="w-8 h-8 flex items-center justify-center text-[11px] font-bold text-white"
          style={{ background: 'var(--accent)' }}
        >
          AIP
        </span>
        <span className="ml-2 text-sm font-bold">AIP Markets</span>
      </div>
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-3 py-4 space-y-3">
        <div className="panel p-4">
          <div className="h-4 w-40 rounded skeleton mb-3" />
          <div className="flex gap-2 mb-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 w-16 rounded skeleton" />
            ))}
          </div>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-12 rounded skeleton mb-2" />
          ))}
        </div>
        <p className="text-center text-[12px]" style={{ color: 'var(--text-muted)' }}>
          Loading research terminal…
        </p>
      </main>
    </div>
  );
}
