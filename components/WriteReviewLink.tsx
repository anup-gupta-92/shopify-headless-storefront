interface WriteReviewLinkProps {
  href: string;
  productName: string;
  compact?: boolean;
}

export default function WriteReviewLink({ href, productName, compact = false }: WriteReviewLinkProps) {
  return <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    aria-label={`Write a review for ${productName} on Judge.me (opens in a new tab)`}
    className={compact
      ? "inline-flex min-h-11 items-center justify-center rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      : "inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"}
  >Write a review</a>;
}
