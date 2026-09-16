import Link from "next/link";

export default function ProductNotFound() {
  return <main className="site-container py-16"><h1 className="text-3xl font-bold">Product not found</h1><p className="mt-4 text-muted">This product is no longer available at this address.</p><Link href="/" className="mt-6 inline-block text-primary underline">Return home</Link></main>;
}
