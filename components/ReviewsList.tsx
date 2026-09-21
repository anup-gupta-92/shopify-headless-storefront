"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import ReviewStars from "@/components/ReviewStars";
import type { Review, ReviewPage } from "@/lib/judgeme/types";

function ReviewCard({ review }: { review: Review }) {
  return <article className="min-w-0 rounded-xl border border-border bg-surface p-5 sm:p-6">
    <header className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
      <span className="font-semibold text-foreground">{review.reviewerName}</span>
      {review.verifiedBuyer && <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">Verified buyer</span>}
      {review.date && <time dateTime={review.date}>{new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(review.date))}</time>}
    </header>
    <ReviewStars average={review.rating} count={1} compact showCount={false} />
    {review.title && <h3 className="mt-3 break-words font-bold">{review.title}</h3>}
    {review.body && <p className="mt-3 whitespace-pre-line break-words text-sm leading-relaxed text-foreground">{review.body}</p>}
    {review.images.length > 0 && <div className="mt-4 flex flex-wrap gap-3">{review.images.map((url, index) => <Image key={url} src={url} alt={`Photo ${index + 1} attached to review by ${review.reviewerName}`} width={112} height={112} unoptimized className="size-28 rounded-lg border border-border object-cover" />)}</div>}
    
  </article>;
}

export default function ReviewsList({ productId, initialPage }: { productId: string; initialPage: ReviewPage }) {
  const [reviews, setReviews] = useState(initialPage.reviews);
  const [page, setPage] = useState(initialPage.page);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const requestInProgress = useRef(false);

  async function loadMore() {
    if (requestInProgress.current || page >= initialPage.totalPages) return;
    requestInProgress.current = true;
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({ productId, page: String(page + 1) });
      const response = await fetch(`/api/reviews?${params}`, { cache: "no-store" });
      const next: ReviewPage | null = response.ok ? await response.json() : null;
      if (!next || next.page !== page + 1) throw new Error("Review page unavailable");
      setReviews((current) => {
        const seen = new Set(current.map((review) => review.id));
        return [...current, ...next.reviews.filter((review) => !seen.has(review.id))];
      });
      setPage(next.page);
    } catch {
      setError(true);
    } finally {
      requestInProgress.current = false;
      setLoading(false);
    }
  }

  return <div>
    <div className="grid gap-4 md:grid-cols-2">{reviews.map((review) => <ReviewCard key={review.id} review={review} />)}</div>
    {error && <p role="alert" className="mt-5 text-sm text-muted">More reviews could not be loaded. Please try again.</p>}
    {page < initialPage.totalPages && <button type="button" onClick={() => void loadMore()} disabled={loading} className="mt-6 min-h-11 rounded-lg border border-border bg-surface px-5 font-semibold hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60">{loading ? "Loading reviews…" : "Load more reviews"}</button>}
  </div>;
}
