import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import AccountError from "@/components/AccountError";
import AccountPageHeader from "@/components/AccountPageHeader";
import { formatMoney } from "@/lib/shopify/pricing";
import { requireCustomerAccountAccess } from "@/lib/shopify/customer-account/access";
import { CustomerAccountUnauthorizedError } from "@/lib/shopify/customer-account/client";
import { getAccountOrders } from "@/lib/shopify/customer-account/data";

export const metadata: Metadata = { title: "Orders", description: "View your Apex Business Supplies order history." };
export const revalidate = 0;
const ORDERS_PAGE_SIZE = 10;

function readableStatus(status: string | null): string {
  return status ? status.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Not available";
}

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ after?: string | string[] }> }) {
  const rawAfter = (await searchParams).after;
  const after = typeof rawAfter === "string" && rawAfter.length <= 512 ? rawAfter : null;
  const access = await requireCustomerAccountAccess();
  let page;
  try {
    page = await getAccountOrders(access, { first: ORDERS_PAGE_SIZE, after });
  } catch (error) {
    if (error instanceof CustomerAccountUnauthorizedError) redirect("/account/refresh");
    return <main className="site-container min-h-[60vh] py-16"><AccountPageHeader title="Orders" /><AccountError title="Orders temporarily unavailable" retryHref="/account/orders" /></main>;
  }

  return <main className="site-container min-h-[60vh] py-16">
    <AccountPageHeader title="Orders" description="Review your order history and delivery progress." />
    {page.orders.length === 0 ? <section className="mt-8 rounded-2xl border border-border bg-surface p-8 text-center">
      <h2 className="text-xl font-bold">You haven&rsquo;t placed any orders yet.</h2>
      <Link href="/shop" className="mt-5 inline-flex rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Browse products</Link>
    </section> : <div className="mt-8 space-y-4">
      {page.orders.map((order) => <Link key={order.id} href={`/account/orders/${order.key}`} className="group grid gap-4 rounded-xl border border-border bg-surface p-5 transition hover:border-primary hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:grid-cols-[5rem_minmax(0,1fr)_auto] sm:items-center">
        <div className="relative aspect-square overflow-hidden rounded-lg border border-border bg-white">
          {order.image ? <Image src={order.image.url} alt={order.image.altText || ""} fill sizes="80px" className="object-contain p-1" /> : <span className="flex h-full items-center justify-center text-xs text-muted">No image</span>}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><h2 className="font-bold">Order {order.name}</h2><span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{readableStatus(order.fulfillmentStatus)}</span></div>
          <p className="mt-2 text-sm text-muted">Placed {new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(order.processedAt))} · {order.itemCount} {order.itemCount === 1 ? "item" : "items"}</p>
          <p className="mt-1 text-sm text-muted">Payment: {readableStatus(order.financialStatus)}</p>
        </div>
        <div className="flex items-center justify-between gap-3 sm:block sm:text-right"><strong>{formatMoney(order.totalPrice)}</strong><span aria-hidden="true" className="ml-3 text-primary transition-transform group-hover:translate-x-1">→</span></div>
      </Link>)}
    </div>}
    <nav aria-label="Order history pages" className="mt-8 flex flex-wrap justify-between gap-3">
      {after ? <Link href="/account/orders" className="rounded-lg border border-border bg-surface px-4 py-3 font-semibold hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Back to latest orders</Link> : <span />}
      {page.pageInfo.hasNextPage && page.pageInfo.endCursor && <Link href={`/account/orders?after=${encodeURIComponent(page.pageInfo.endCursor)}`} className="rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Older orders</Link>}
    </nav>
  </main>;
}
