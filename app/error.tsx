"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-3xl font-bold">Products are temporarily unavailable</h1>
      <p className="mt-4 text-muted">We couldn’t load the latest product information. Please try again shortly.</p>
      <button onClick={reset} className="mt-6 rounded-lg bg-primary px-4 py-3 text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Try again</button>
    </main>
  );
}
