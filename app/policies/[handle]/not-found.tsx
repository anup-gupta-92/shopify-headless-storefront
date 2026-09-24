import Link from "next/link";

export default function PolicyNotFound() {
  return (
    <main className="site-container min-h-[60vh] py-16">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">Store policy</p>
        <h1 className="mt-2 text-3xl font-bold">Policy not found</h1>
        <p className="mt-4 text-muted">This policy is not currently available at this address.</p>
        <Link
          href="/"
          className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-primary px-5 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Return home
        </Link>
      </div>
    </main>
  );
}
