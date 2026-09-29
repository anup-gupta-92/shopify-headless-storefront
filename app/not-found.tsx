import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import SupplyDepartments from "@/components/SupplyDepartments";

export const metadata: Metadata = {
  title: "Page not found",
};

const focusClasses =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export default function NotFound() {
  return (
    <main className="bg-background py-10 text-foreground sm:py-14 lg:py-16">
      <div className="site-container">
        <div className="grid min-h-[55vh] items-center gap-9 lg:grid-cols-2 lg:gap-12 xl:gap-16">
          <div className="overflow-hidden rounded-2xl border border-border bg-surface-muted p-3 sm:p-5">
            <Image
              src="/images/404.png"
              alt="Warehouse shelves and parcels with a missing-item search illustration"
              width={1024}
              height={512}
              sizes="(max-width: 1023px) calc(100vw - 2rem), (max-width: 1599px) calc(50vw - 3.5rem), 840px"
              className="h-auto w-full object-contain"
              priority
            />
          </div>

          <section aria-labelledby="not-found-heading" className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">404</p>
            <h1 id="not-found-heading" className="mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl">
              Page not found
            </h1>
            <div className="mt-5 space-y-3 text-base leading-7 text-muted sm:text-lg sm:leading-8">
              <p>The page you’re looking for may have moved, been removed, or the web address may be incorrect.</p>
              <p>You can return home or continue browsing our main product departments.</p>
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/"
                className={`inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-6 py-3 text-center font-semibold text-primary-foreground transition hover:opacity-90 ${focusClasses}`}
              >
                Return Home
              </Link>
              <Link
                href="/shop"
                className={`inline-flex min-h-12 items-center justify-center rounded-xl border border-primary px-6 py-3 text-center font-semibold text-primary transition hover:bg-primary/10 ${focusClasses}`}
              >
                Shop All Products
              </Link>
            </div>

          </section>
        </div>

        <SupplyDepartments
          heading="Browse our departments"
          description="Not sure where to go next? Explore our core product ranges."
          headingId="not-found-departments-heading"
        />
      </div>
    </main>
  );
}
