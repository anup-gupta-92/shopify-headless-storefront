import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CustomerAccountUnauthorizedError,
  getCustomerIdentity,
  type CustomerIdentity,
} from "@/lib/shopify/customer-account/client";
import {
  customerSessionNeedsRefresh,
  readCustomerSession,
} from "@/lib/shopify/customer-account/session";

export const metadata: Metadata = {
  title: "My Account",
  description: "Your Apex Business Supplies customer account.",
};

// Customer identity is always resolved from the current request cookie and is
// never eligible for the public catalogue response cache.
export const revalidate = 0;

export default async function AccountPage() {
  const session = await readCustomerSession();
  if (!session) redirect("/account/login");
  if (customerSessionNeedsRefresh(session)) redirect("/account/refresh");

  let customer: CustomerIdentity;
  try {
    customer = await getCustomerIdentity(session.accessToken);
  } catch (error) {
    if (error instanceof CustomerAccountUnauthorizedError) redirect("/account/refresh");
    return (
      <main className="site-container min-h-[60vh] py-16">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">Customer account</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">Account temporarily unavailable</h1>
        <p role="alert" className="mt-4 max-w-2xl text-muted">
          We could not load your account details right now. Your session has not been changed.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/account" className="rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Try again</Link>
          <a href="/account/logout" className="rounded-lg border border-border bg-surface px-5 py-3 font-semibold hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Sign out</a>
        </div>
      </main>
    );
  }

  const firstName = customer.firstName?.trim();
  const welcomeName = firstName || customer.displayName?.trim() || "there";
  const email = customer.emailAddress?.emailAddress;
  const phone = customer.phoneNumber?.phoneNumber;

  return (
    <main className="site-container min-h-[60vh] py-16">
      <p className="text-sm font-semibold uppercase tracking-widest text-primary">Customer account</p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">My Account</h1>
      <section className="mt-8 rounded-2xl border border-border bg-surface p-6 sm:p-8" aria-labelledby="account-welcome">
        <h2 id="account-welcome" className="text-2xl font-bold">Welcome, {welcomeName}</h2>
        {email && <p className="mt-2 break-all text-muted">{email}</p>}
        {phone && <p className="mt-1 text-muted">{phone}</p>}
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          ["Orders", "Order history is coming next."],
          ["Addresses", "Address management is coming next."],
          ["Profile", "Profile editing is coming next."],
        ].map(([title, description]) => (
          <section key={title} className="rounded-xl border border-border bg-surface p-5">
            <h2 className="font-bold">{title}</h2>
            <p className="mt-2 text-sm text-muted">{description}</p>
          </section>
        ))}
      </div>

      <a href="/account/logout" className="mt-8 inline-flex rounded-lg border border-border bg-surface px-5 py-3 font-semibold hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
        Sign out
      </a>
    </main>
  );
}
