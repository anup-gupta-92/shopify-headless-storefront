export default function PolicyLoading() {
  return (
    <main className="min-h-screen bg-background py-8 sm:py-10" aria-busy="true" aria-label="Loading policy">
      <div className="site-container motion-safe:animate-pulse">
        <div className="mx-auto max-w-4xl">
          <div className="h-4 w-44 rounded bg-surface-muted" />
          <div className="mt-8 h-3 w-28 rounded bg-surface-muted" />
          <div className="mt-3 h-10 w-72 max-w-full rounded bg-surface-muted" />
          <div className="mt-8 space-y-5 rounded-xl border border-border bg-surface px-5 py-6 sm:px-8 sm:py-8">
            <div className="h-4 w-full rounded bg-surface-muted" />
            <div className="h-4 w-11/12 rounded bg-surface-muted" />
            <div className="h-4 w-4/5 rounded bg-surface-muted" />
            <div className="h-7 w-52 rounded bg-surface-muted" />
            <div className="h-4 w-full rounded bg-surface-muted" />
            <div className="h-4 w-5/6 rounded bg-surface-muted" />
          </div>
        </div>
      </div>
    </main>
  );
}
