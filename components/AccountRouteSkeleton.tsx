import RouteLoadingSignal from "@/components/RouteLoadingSignal";

export default function AccountRouteSkeleton({ variant }: { variant: "orders" | "order" | "addresses" | "profile" }) {
  const skeleton = "rounded bg-surface-muted";
  const cards = variant === "orders" ? 4 : variant === "addresses" ? 3 : 1;
  return <main className="site-container min-h-[60vh] py-16" aria-busy="true" aria-label={`Loading ${variant}`}>
    <RouteLoadingSignal />
    <div className="motion-safe:animate-pulse">
      <div className={`h-4 w-48 ${skeleton}`} /><div className={`mt-6 h-3 w-40 ${skeleton}`} /><div className={`mt-4 h-10 w-64 max-w-full ${skeleton}`} /><div className={`mt-4 h-4 w-96 max-w-full ${skeleton}`} />
      <div className={`${variant === "profile" ? "grid sm:grid-cols-2" : ""} mt-8 gap-4`}>
        {Array.from({ length: cards }, (_, index) => <div key={index} className="rounded-xl border border-border bg-surface p-5">
          <div className={`h-6 w-40 max-w-full ${skeleton}`} /><div className={`mt-4 h-4 w-full ${skeleton}`} /><div className={`mt-3 h-4 w-3/4 ${skeleton}`} />{variant === "order" && <><div className={`mt-6 h-20 w-full ${skeleton}`} /><div className={`mt-4 h-20 w-full ${skeleton}`} /></>}
        </div>)}
      </div>
    </div>
  </main>;
}
