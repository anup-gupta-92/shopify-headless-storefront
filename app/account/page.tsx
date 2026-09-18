import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import AccountError from "@/components/AccountError";
import AccountPageHeader from "@/components/AccountPageHeader";
import { requireCustomerAccountAccess } from "@/lib/shopify/customer-account/access";
import { CustomerAccountUnauthorizedError } from "@/lib/shopify/customer-account/client";
import { getAccountIdentity } from "@/lib/shopify/customer-account/data";

export const metadata: Metadata = { title: "My Account", description: "Your Apex Business Supplies customer account." };
export const revalidate = 0;

const accountLinks = [
  { href: "/account/orders", title: "Orders", description: "View your order history and fulfillment details." },
  { href: "/account/addresses", title: "Addresses", description: "Manage your saved delivery addresses." },
  { href: "/account/profile", title: "Profile", description: "View or update your account details." },
] as const;

export default async function AccountPage() {
  const access = await requireCustomerAccountAccess();
  let customer;
  try {
    customer = await getAccountIdentity(access);
  } catch (error) {
    if (error instanceof CustomerAccountUnauthorizedError) redirect("/account/refresh");
    return <main className="site-container min-h-[60vh] py-16"><AccountPageHeader title="My Account" /><AccountError retryHref="/account" /></main>;
  }

  const welcomeName = customer.firstName?.trim() || customer.displayName?.trim() || "there";
  return (
    <main className="site-container min-h-[60vh] py-16">
      <AccountPageHeader title="My Account" />
      <section className="mt-8 rounded-2xl border border-border bg-surface p-6 sm:p-8" aria-labelledby="account-welcome">
        <h2 id="account-welcome" className="text-2xl font-bold">Welcome, {welcomeName}</h2>
        {customer.emailAddress?.emailAddress && <p className="mt-2 break-all text-muted">{customer.emailAddress.emailAddress}</p>}
        {customer.phoneNumber?.phoneNumber && <p className="mt-1 text-muted">{customer.phoneNumber.phoneNumber}</p>}
      </section>

      <nav aria-label="Account sections" className="mt-6 grid gap-4 sm:grid-cols-3">
        {accountLinks.map((item) => <Link key={item.href} href={item.href} className="group rounded-xl border border-border bg-surface p-5 transition hover:border-primary hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          <span className="flex items-center justify-between gap-3 font-bold"><span>{item.title}</span><span aria-hidden="true" className="text-primary transition-transform group-hover:translate-x-1">→</span></span>
          <span className="mt-2 block text-sm text-muted">{item.description}</span>
        </Link>)}
      </nav>

      {access.source === "shopify" && <a href="/account/logout" className="mt-8 inline-flex rounded-lg border border-border bg-surface px-5 py-3 font-semibold hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Sign out</a>}
      {access.source === "development-fixture" && <p className="mt-8 text-sm text-muted">Development account fixture is active. No real customer data is being shown.</p>}
    </main>
  );
}
