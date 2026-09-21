import type { ReviewRating } from "@/lib/judgeme/types";

export default function ReviewStars({ average, count, compact = false, showCount = true }: ReviewRating & { compact?: boolean; showCount?: boolean }) {
  return <span role="img" aria-label={showCount ? `Rated ${average.toFixed(1)} out of 5 from ${count} ${count === 1 ? "review" : "reviews"}` : `Rated ${average.toFixed(1)} out of 5`} className={`inline-flex items-center gap-2 ${compact ? "text-xs" : "text-sm"}`}>
    <span aria-hidden="true" className="relative inline-block shrink-0 overflow-hidden whitespace-nowrap tracking-tight text-muted/40">
      ★★★★★
      <span className="absolute inset-y-0 left-0 overflow-hidden whitespace-nowrap text-amber-500" style={{ width: `${average * 20}%` }}>★★★★★</span>
    </span>
    <span className="font-semibold tabular-nums text-foreground">{average.toFixed(1)}</span>
    {showCount && <span className="text-muted">({count})</span>}
  </span>;
}
