import ProductCardSkeleton from "@/components/ProductCardSkeleton";
import RouteLoadingSignal from "@/components/RouteLoadingSignal";

export default function SearchLoading() {
  return (
    <main className="min-h-screen bg-background py-8 text-foreground sm:py-10" aria-busy="true" aria-label="Loading search results">
      <RouteLoadingSignal />
      <div className="site-container motion-safe:animate-pulse">
        <div className="h-4 w-28 rounded bg-surface-muted" />
        <div className="mt-8 h-3 w-40 rounded bg-surface-muted" />
        <div className="mt-3 h-10 w-full max-w-xl rounded bg-surface-muted" />
        <div className="mt-4 h-4 w-32 rounded bg-surface-muted" />
        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => <ProductCardSkeleton key={index} />)}
        </div>
      </div>
    </main>
  );
}
