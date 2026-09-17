import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sign-in issue" };

const messages: Record<string, string> = {
  cancelled: "Sign-in was cancelled. No changes were made to your account.",
  invalid: "That sign-in attempt expired or could not be verified. Please start again.",
  failed: "We could not complete sign-in. Please try again.",
  unavailable: "Customer sign-in is temporarily unavailable. Please try again shortly.",
  account: "Your account details are temporarily unavailable. Please try again.",
};

export default async function AccountErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const message = messages[reason ?? ""] ?? messages.failed;

  return (
    <main className="site-container min-h-[60vh] py-16">
      <p className="text-sm font-semibold uppercase tracking-widest text-primary">Customer account</p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">We could not sign you in</h1>
      <p role="alert" className="mt-4 max-w-2xl text-muted">{message}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/account/login" className="rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          Try again
        </Link>
        <Link href="/" className="rounded-lg border border-border bg-surface px-5 py-3 font-semibold text-foreground hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          Return home
        </Link>
      </div>
    </main>
  );
}
