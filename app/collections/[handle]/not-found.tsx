import Link from "next/link";

export default function CollectionNotFound() {
  return (
    <main className="site-container min-h-[60vh] py-16">
      <h1 className="text-3xl font-bold">Collection not found</h1>
      <p className="mt-4 text-muted">This collection is no longer available at this address.</p>
      <Link href="/shop" className="mt-6 inline-flex min-h-11 items-center text-primary underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Browse all products</Link>
    </main>
  );
}
