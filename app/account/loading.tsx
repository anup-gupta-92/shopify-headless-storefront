import RouteLoadingSignal from "@/components/RouteLoadingSignal";

export default function AccountLoading() {
  const skeleton = "rounded bg-surface-muted";

  return (
    <main
      className="site-container min-h-[60vh] py-16"
      aria-busy="true"
      aria-label="Loading customer account"
    >
      <RouteLoadingSignal />
      <div className="motion-safe:animate-pulse">
        <div className={`h-3 w-40 ${skeleton}`} />
        <div className={`mt-4 h-10 w-56 max-w-full ${skeleton}`} />

        <section className="mt-8 rounded-2xl border border-border bg-surface p-6 sm:p-8">
          <div className={`h-7 w-52 max-w-full ${skeleton}`} />
          <div className={`mt-4 h-4 w-64 max-w-full ${skeleton}`} />
          <div className={`mt-3 h-4 w-40 max-w-full ${skeleton}`} />
        </section>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="rounded-xl border border-border bg-surface p-5">
              <div className={`h-5 w-24 ${skeleton}`} />
              <div className={`mt-4 h-4 w-full ${skeleton}`} />
              <div className={`mt-2 h-4 w-3/4 ${skeleton}`} />
            </div>
          ))}
        </div>

        <div className={`mt-8 h-12 w-28 ${skeleton}`} />
      </div>
    </main>
  );
}
