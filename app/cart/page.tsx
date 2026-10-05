import type { Metadata } from "next";
import Link from "next/link";
import CartPageContent from "@/components/CartPageContent";

export const metadata: Metadata = {
  title: "Your Cart",
  robots: {
    index: false,
    follow: false,
  },
};

const buyAgainMessages = {
  invalid: "This Buy Again link is invalid. Your existing cart was left unchanged.",
  partial: "Some products from your previous order are no longer available and were not added.",
  unavailable: "No products from your previous order could be added. Your existing cart was left unchanged.",
  error: "We could not rebuild your previous order. Your existing cart was left unchanged.",
} as const;

export default async function CartPage({
  searchParams,
}: {
  searchParams: Promise<{ buy_again?: string | string[] }>;
}) {
  const requestedNotice = (await searchParams).buy_again;
  const noticeKey = Array.isArray(requestedNotice) ? requestedNotice[0] : requestedNotice;
  const notice = noticeKey && noticeKey in buyAgainMessages
    ? buyAgainMessages[noticeKey as keyof typeof buyAgainMessages]
    : undefined;

  return (
    <main className="min-h-[60vh] bg-background py-8 text-foreground sm:py-10">
      <div className="site-container">
        <nav aria-label="Breadcrumb" className="mb-5 text-sm text-muted">
          <ol className="flex items-center gap-2">
            <li>
              <Link href="/" className="rounded hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Home</Link>
            </li>
            <li aria-hidden="true">&gt;</li>
            <li aria-current="page">Cart</li>
          </ol>
        </nav>

        <header className="mb-7 sm:mb-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">Your order</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl">Your Cart</h1>
          <p className="mt-3 max-w-2xl text-muted">Review your products and quantities before continuing to secure Shopify checkout.</p>
        </header>

        {notice && (
          <p role="status" className="mb-6 rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm text-foreground">
            {notice}
          </p>
        )}

        <CartPageContent />
      </div>
    </main>
  );
}
