import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Apex Admin",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-[100dvh] items-center bg-background py-10 text-foreground sm:py-14">
      <div className="site-container flex justify-center">
        <section className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 text-center shadow-sm sm:p-8" aria-labelledby="admin-login-heading">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Internal access</p>
          <h1 id="admin-login-heading" className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Apex Admin</h1>
          <p className="mt-3 text-muted">Internal analytics access</p>
          <a
            href="/admin/analytics"
            className="mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Continue with Google
          </a>
        </section>
      </div>
    </main>
  );
}
