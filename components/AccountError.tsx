import Link from "next/link";

export default function AccountError({ title = "Account temporarily unavailable", retryHref }: { title?: string; retryHref: string }) {
  return (
    <section className="mt-8 rounded-2xl border border-border bg-surface p-6 sm:p-8" role="alert">
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="mt-2 text-muted">We could not load this information right now. Your account session has not been changed.</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link href={retryHref} className="rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Try again</Link>
        <a href="/account/logout" className="rounded-lg border border-border bg-surface px-5 py-3 font-semibold hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Sign out</a>
      </div>
    </section>
  );
}
