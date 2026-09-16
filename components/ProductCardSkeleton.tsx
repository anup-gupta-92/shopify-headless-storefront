export default function ProductCardSkeleton() {
  return (
    <div aria-hidden="true" className="h-full rounded-xl border border-border bg-surface p-5 motion-safe:animate-pulse">
      <div className="aspect-square w-full rounded-lg bg-surface-muted" />
      <div className="mt-4 h-3 w-2/5 rounded bg-surface-muted" />
      <div className="mt-3 h-5 w-full rounded bg-surface-muted" />
      <div className="mt-2 h-5 w-3/4 rounded bg-surface-muted" />
      <div className="mt-5 h-4 w-1/3 rounded bg-surface-muted" />
      <div className="mt-4 h-10 w-full rounded-lg bg-surface-muted" />
    </div>
  );
}
