import Link from "next/link";

export default function OrderNotFound() {
  return <main className="site-container min-h-[60vh] py-16"><p className="text-sm font-semibold uppercase tracking-widest text-primary">Customer account</p><h1 className="mt-2 text-4xl font-bold">Order not found</h1><p className="mt-4 text-muted">This order is not available for the signed-in customer.</p><Link href="/account/orders" className="mt-6 inline-flex rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Back to orders</Link></main>;
}
