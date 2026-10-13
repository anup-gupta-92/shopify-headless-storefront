import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Apex Analytics",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminAnalyticsPage() {
  return (
    <main className="flex min-h-[60vh] items-center bg-background py-10 text-foreground sm:py-14">
      <div className="site-container flex justify-center">
        <section className="w-full max-w-2xl rounded-2xl border border-border bg-surface p-6 text-center shadow-sm sm:p-8" aria-labelledby="analytics-heading">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Internal dashboard</p>
          <h1 id="analytics-heading" className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Apex Analytics</h1>
          <p className="mt-3 text-muted">Analytics dashboard is being prepared.</p>
          <Link
            href="/"
            className="mt-7 inline-flex min-h-11 items-center justify-center rounded-xl border border-primary px-5 py-2.5 font-semibold text-primary transition hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Back to storefront
          </Link>
        </section>
      </div>
    </main>
  );
}
