import ProductCardSkeleton from "@/components/ProductCardSkeleton";

export default function ShopLoading() {
  return (
    <main className="min-h-screen bg-background py-8 text-foreground sm:py-10" aria-busy="true" aria-label="Loading products">
      <div className="site-container motion-safe:animate-pulse">
        <div className="h-4 w-28 rounded bg-surface-muted" />
        <div className="mt-8 h-3 w-40 rounded bg-surface-muted" />
        <div className="mt-3 h-10 w-32 rounded bg-surface-muted" />
        <div className="mt-4 h-4 w-full max-w-xl rounded bg-surface-muted" />
        <div className="mt-8 grid min-w-0 gap-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <div className="hidden h-[30rem] rounded-xl border border-border bg-surface lg:block" />
          <div className="min-w-0">
            <div className="mb-5 ml-auto h-11 w-44 rounded-lg bg-surface-muted" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 9 }, (_, index) => <ProductCardSkeleton key={index} />)}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
