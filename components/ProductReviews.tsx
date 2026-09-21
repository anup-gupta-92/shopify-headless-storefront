import { getProductReviewPage } from "@/lib/judgeme/client";
import ReviewsList from "@/components/ReviewsList";

export function ReviewsSkeleton() {
  return <section className="mt-12 border-t border-border pt-10" aria-label="Loading customer reviews">
    <div className="mb-6 h-8 w-48 animate-pulse rounded bg-surface-muted" />
    <div className="grid gap-4 md:grid-cols-2">{[0, 1].map((item) => <div key={item} className="h-40 animate-pulse rounded-xl bg-surface-muted" />)}</div>
  </section>;
}

export default async function ProductReviews({ productId }: { productId: string }) {
  const firstPage = await getProductReviewPage(productId);
  if (!firstPage || firstPage.reviews.length === 0) return null;
  return <section id="customer-reviews" tabIndex={-1} aria-labelledby="reviews-heading" className="mt-12 scroll-mt-28 border-t border-border pt-10 focus:outline-none">
    <h2 id="reviews-heading" className="mb-6 text-2xl font-bold">Customer Reviews</h2>
    <ReviewsList productId={productId} initialPage={firstPage} />
  </section>;
}
