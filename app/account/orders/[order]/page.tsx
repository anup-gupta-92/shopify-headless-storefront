import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import AccountError from "@/components/AccountError";
import AccountPageHeader from "@/components/AccountPageHeader";
import WriteReviewLink from "@/components/WriteReviewLink";
import { getJudgeMeWriteReviewUrl } from "@/lib/judgeme/write-review";
import { getProductReferencesByIds, type ProductReference } from "@/lib/shopify/products";
import { formatMoney } from "@/lib/shopify/pricing";
import { requireCustomerAccountAccess } from "@/lib/shopify/customer-account/access";
import { CustomerAccountUnauthorizedError } from "@/lib/shopify/customer-account/client";
import { getAccountOrder } from "@/lib/shopify/customer-account/data";
import type { CustomerAddress, CustomerOrderLine } from "@/lib/shopify/customer-account/types";

export const metadata: Metadata = { title: "Order details", description: "View your Apex Business Supplies order details." };
export const revalidate = 0;

function readableStatus(status: string | null): string {
  return status ? status.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Not available";
}

function Address({ title, address }: { title: string; address: CustomerAddress | null }) {
  if (!address) return null;
  return <section className="rounded-xl border border-border bg-surface p-5"><h2 className="font-bold">{title}</h2><address className="mt-3 not-italic text-sm text-muted">{address.formatted.map((line, index) => <span className="block" key={`${line}-${index}`}>{line}</span>)}{address.phoneNumber && <span className="mt-2 block">{address.phoneNumber}</span>}</address></section>;
}

function OrderLine({ line, product }: { line: CustomerOrderLine; product?: ProductReference }) {
  const productHref = product ? `/products/${encodeURIComponent(product.handle)}` : null;
  const writeReviewUrl = product ? getJudgeMeWriteReviewUrl(product.id) : null;
  const image = line.image ? <Image src={line.image.url} alt={line.image.altText || line.name} fill sizes="80px" className="object-contain p-1" /> : <span className="flex h-full items-center justify-center text-xs text-muted">No image</span>;

  return <article className="grid gap-4 p-5 sm:grid-cols-[5rem_minmax(0,1fr)_auto] sm:items-center">
    {productHref && line.image ? <Link href={productHref} aria-label={`View ${line.name}`} className="relative aspect-square overflow-hidden rounded-lg border border-border bg-white transition hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">{image}</Link> : <div className="relative aspect-square overflow-hidden rounded-lg border border-border bg-white">{image}</div>}
    <div className="min-w-0">
      <h3 className="font-semibold">{productHref ? <Link href={productHref} className="rounded underline-offset-4 hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">{line.name}</Link> : line.name}</h3>
      {line.variantOptions.length > 0 && <p className="mt-1 text-sm text-muted">{line.variantOptions.map((option) => `${option.name}: ${option.value}`).join(" · ")}</p>}
      {line.sku && <p className="mt-1 text-xs text-muted">Product Code: {line.sku}</p>}
      <p className="mt-2 text-sm">Quantity: {line.quantity}{line.price && <> · {formatMoney(line.price)} each</>}</p>
      {Number(line.totalDiscount.amount) > 0 && <p className="mt-1 text-sm text-primary">Line discount: {formatMoney(line.totalDiscount)}</p>}
      {productHref && <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link href={productHref} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">View product</Link>
        {writeReviewUrl && <WriteReviewLink href={writeReviewUrl} productName={line.name} compact />}
      </div>}
    </div>
    {line.totalPrice && <strong className="sm:text-right">{formatMoney(line.totalPrice)}</strong>}
  </article>;
}

export default async function OrderDetailPage({ params }: { params: Promise<{ order: string }> }) {
  const { order: key } = await params;
  const access = await requireCustomerAccountAccess();
  let order;
  try {
    order = await getAccountOrder(access, key);
  } catch (error) {
    if (error instanceof CustomerAccountUnauthorizedError) redirect("/account/refresh");
    return <main className="site-container min-h-[60vh] py-16"><AccountPageHeader title="Order details" /><AccountError title="Order temporarily unavailable" retryHref={`/account/orders/${encodeURIComponent(key)}`} /></main>;
  }
  if (!order) notFound();
  let productsById = new Map<string, ProductReference>();
  try {
    productsById = await getProductReferencesByIds(order.lines.flatMap((line) => line.productId ? [line.productId] : []));
  } catch {
    // Product navigation is an enhancement; historical order details remain authoritative.
    console.warn("Order product references temporarily unavailable");
  }

  return <main className="site-container min-h-[60vh] py-16">
    <AccountPageHeader title={`Order ${order.name}`} description={`Placed ${new Intl.DateTimeFormat("en-GB", { dateStyle: "long" }).format(new Date(order.processedAt))}`} />
    <div className="mt-6 flex flex-wrap gap-2 text-sm"><span className="rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">{readableStatus(order.fulfillmentStatus)}</span><span className="rounded-full border border-border px-3 py-1 text-muted">Payment: {readableStatus(order.financialStatus)}</span></div>

    <section className="mt-8 overflow-hidden rounded-2xl border border-border bg-surface" aria-labelledby="order-items">
      <h2 id="order-items" className="border-b border-border px-5 py-4 text-xl font-bold">Items</h2>
      <div className="divide-y divide-border">{order.lines.map((line) => <OrderLine key={line.id} line={line} product={line.productId ? productsById.get(line.productId) : undefined} />)}</div>
    </section>

    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="grid gap-4 sm:grid-cols-2"><Address title="Shipping address" address={order.shippingAddress} /><Address title="Billing address" address={order.billingAddress} /></div>
      <section className="rounded-xl border border-border bg-surface p-5" aria-labelledby="order-summary"><h2 id="order-summary" className="font-bold">Order summary</h2><dl className="mt-4 space-y-3 text-sm">
        {order.subtotal && <div className="flex justify-between gap-4"><dt className="text-muted">Subtotal</dt><dd>{formatMoney(order.subtotal)}</dd></div>}
        <div className="flex justify-between gap-4"><dt className="text-muted">Shipping</dt><dd>{formatMoney(order.totalShipping)}</dd></div>
        {order.totalTax && <div className="flex justify-between gap-4"><dt className="text-muted">Tax</dt><dd>{formatMoney(order.totalTax)}</dd></div>}
        <div className="flex justify-between gap-4 border-t border-border pt-3 text-base font-bold"><dt>Total</dt><dd>{formatMoney(order.totalPrice)}</dd></div>
      </dl></section>
    </div>

    {order.fulfillments.length > 0 && <section className="mt-6 rounded-xl border border-border bg-surface p-5"><h2 className="font-bold">Delivery and tracking</h2><div className="mt-4 space-y-4">{order.fulfillments.map((fulfillment) => <div key={fulfillment.id} className="text-sm"><p>{readableStatus(fulfillment.latestShipmentStatus || fulfillment.status)}</p>{fulfillment.estimatedDeliveryAt && <p className="mt-1 text-muted">Estimated delivery: {new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(fulfillment.estimatedDeliveryAt))}</p>}{fulfillment.trackingInformation.map((tracking, index) => tracking.url ? <a key={`${tracking.number}-${index}`} href={tracking.url} rel="noreferrer" target="_blank" className="mt-2 inline-flex rounded text-primary underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Track {tracking.number || "shipment"}{tracking.company ? ` with ${tracking.company}` : ""}</a> : <p key={`${tracking.number}-${index}`} className="mt-2 text-muted">Tracking: {tracking.number || "Pending"}</p>)}</div>)}</div></section>}
    <Link href="/account/orders" className="mt-8 inline-flex rounded-lg border border-border bg-surface px-5 py-3 font-semibold hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Back to orders</Link>
  </main>;
}
