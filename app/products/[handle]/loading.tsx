export default function ProductLoading() {
  const line = "rounded bg-surface-muted";

  return (
    <main className="min-h-screen bg-background py-8 text-foreground md:py-12" aria-busy="true" aria-label="Loading product">
      <div className="site-container motion-safe:animate-pulse">
        <div className={`mb-6 h-4 w-56 ${line}`} />
        <div className="grid grid-cols-1 items-start gap-10 md:grid-cols-2">
          <div className="aspect-square w-full rounded-xl border border-border bg-surface-muted" />
          <div className="min-w-0">
            <div className={`h-3 w-2/5 ${line}`} />
            <div className={`mt-4 h-10 w-full ${line}`} />
            <div className={`mt-3 h-10 w-4/5 ${line}`} />
            <div className={`mt-5 h-4 w-1/3 ${line}`} />
            <div className={`mt-5 h-9 w-2/5 ${line}`} />
            <div className={`mt-7 h-12 w-full ${line}`} />
            <div className={`mt-4 h-12 w-2/3 ${line}`} />
            <div className={`mt-7 h-12 w-full ${line}`} />
          </div>
        </div>
        <section className="mt-12 border-t border-border pt-8">
          <div className={`h-7 w-52 ${line}`} />
          <div className={`mt-6 h-4 w-full ${line}`} />
          <div className={`mt-3 h-4 w-full ${line}`} />
          <div className={`mt-3 h-4 w-5/6 ${line}`} />
          <div className={`mt-8 h-5 w-1/3 ${line}`} />
          <div className={`mt-3 h-4 w-4/5 ${line}`} />
        </section>
      </div>
    </main>
  );
}
