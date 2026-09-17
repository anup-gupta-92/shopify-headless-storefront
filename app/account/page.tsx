import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Customer Account",
  description: "Customer account functionality for Apex Business Supplies.",
};

export default function AccountPage() {
  return (
    <main className="site-container min-h-[60vh] py-16">
      <p className="text-sm font-semibold uppercase tracking-widest text-primary">Coming next</p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">Customer Account</h1>
      <p className="mt-4 max-w-2xl text-muted">Customer account functionality is coming next.</p>
    </main>
  );
}
