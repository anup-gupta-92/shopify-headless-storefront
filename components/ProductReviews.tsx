import { getProductReviewPage } from "@/lib/judgeme/client";
import ReviewsList from "@/components/ReviewsList";
import ReviewStars from "@/components/ReviewStars";
import WriteReviewLink from "@/components/WriteReviewLink";
import type { ReviewRating } from "@/lib/judgeme/types";
import { getJudgeMeWriteReviewUrl } from "@/lib/judgeme/write-review";

export function ReviewsSkeleton() {
  return <section className="mt-12 border-b border-border pb-10" aria-label="Loading customer reviews">
    <div className="mb-6 h-8 w-48 animate-pulse rounded bg-surface-muted" />
    <div className="grid gap-4 md:grid-cols-2">{[0, 1].map((item) => <div key={item} className="h-40 animate-pulse rounded-xl bg-surface-muted" />)}</div>
  </section>;
}

export default async function ProductReviews({ productId, productTitle, rating }: { productId: string; productTitle: string; rating?: ReviewRating }) {
  const firstPage = await getProductReviewPage(productId);
  const writeReviewUrl = getJudgeMeWriteReviewUrl(productId);
  if (!firstPage && !rating && !writeReviewUrl) return null;
  const completeReviews = firstPage && firstPage.totalPages <= 1 ? firstPage.reviews : null;
  const derivedRating = completeReviews?.length ? {
    average: completeReviews.reduce((sum, review) => sum + review.rating, 0) / completeReviews.length,
    count: completeReviews.length,
  } : undefined;
  const summaryRating = rating ?? derivedRating;
  // A distribution is exact only when the single fetched page contains every
  // review and agrees with Judge.me's published total count.
  const distribution = completeReviews && summaryRating?.count === completeReviews.length
    ? [5, 4, 3, 2, 1].map((stars) => ({ stars, count: completeReviews.filter((review) => review.rating === stars).length }))
    : null;
  return <section id="customer-reviews" tabIndex={-1} aria-labelledby="reviews-heading" className="mt-12 scroll-mt-28 border-b border-border pb-10 focus:outline-none">
    <h2 id="reviews-heading" className="text-2xl font-bold">Customer Reviews</h2>
    <div className={`mt-6 grid gap-6 rounded-2xl border border-border bg-surface p-5 sm:p-6 md:items-center ${distribution ? "md:grid-cols-[minmax(0,1fr)_minmax(13rem,1fr)_auto]" : "md:grid-cols-[minmax(0,1fr)_auto]"}`}>
      <div className="min-w-0">
        {summaryRating ? <>
          <ReviewStars {...summaryRating} showCount={false} showValue={false} />
          <p className="mt-2 text-2xl font-bold tabular-nums">{summaryRating.average.toFixed(1)} out of 5</p>
          <p className="mt-1 text-sm text-muted">Based on {summaryRating.count} {summaryRating.count === 1 ? "review" : "reviews"}</p>
        </> : firstPage ? <>
          <p className="font-semibold">No reviews yet</p>
          <p className="mt-1 text-sm text-muted">Be the first to share your experience.</p>
        </> : <>
          <p className="font-semibold">Reviews are temporarily unavailable</p>
          <p className="mt-1 text-sm text-muted">You can still share your experience with Judge.me.</p>
        </>}
      </div>
      {distribution && <div className="space-y-2" aria-label="Rating distribution">
        {distribution.map(({ stars, count }) => <div key={stars} className="grid grid-cols-[2.5rem_minmax(5rem,1fr)_2rem] items-center gap-2 text-sm">
          <span aria-hidden="true">{stars} ★</span>
          <progress aria-label={`${stars} stars: ${count} reviews`} max={summaryRating!.count} value={count} className="h-2 w-full accent-primary">{count} of {summaryRating!.count}</progress>
          <span className="text-right tabular-nums text-muted">{count}</span>
        </div>)}
      </div>}
      {writeReviewUrl && <div className="shrink-0"><WriteReviewLink href={writeReviewUrl} productName={productTitle} /></div>}
    </div>
    {firstPage?.reviews.length ? <div className="mt-6"><ReviewsList productId={productId} initialPage={firstPage} /></div> : rating ? <p className="mt-6 text-sm text-muted">Individual reviews are temporarily unavailable.</p> : null}
  </section>;
}
