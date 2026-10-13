import Link from "next/link";

const adminNavigation = [
  { label: "Overview", href: "#overview" },
  { label: "Traffic", href: "#traffic" },
  { label: "Countries", href: "#countries" },
  { label: "Devices", href: "#devices" },
  { label: "Search terms", href: "#search-terms" },
  { label: "Products", href: "#products" },
  { label: "Cart & checkout", href: "#cart-checkout" },
  { label: "Bulk ordering", href: "#bulk-ordering" },
  { label: "Theme", href: "#theme" },
  { label: "Consent", href: "#consent" },
  { label: "404s", href: "#404s" },
] as const;

const navigationClass = "rounded-lg px-3 py-2 text-sm font-medium text-muted transition hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

function AdminNavigation() {
  return (
    <nav aria-label="Analytics sections" className="flex flex-col gap-1">
      {adminNavigation.map((item) => (
        <a key={item.href} href={item.href} className={navigationClass}>{item.label}</a>
      ))}
      <div className="my-2 border-t border-border" />
      <Link href="/" className={navigationClass}>Go to main site</Link>
    </nav>
  );
}

export default function AnalyticsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-[100dvh] md:grid md:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="border-b border-border bg-surface md:sticky md:top-0 md:h-[100dvh] md:border-b-0 md:border-r">
        <div className="flex min-h-16 items-center justify-between gap-4 px-4 py-3 md:block md:px-5 md:py-6">
          <Link href="/admin/analytics" className="flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-extrabold text-primary-foreground">A</span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-semibold uppercase tracking-[0.14em] text-muted">Apex</span>
              <span className="block truncate font-bold text-foreground">Apex Analytics</span>
            </span>
          </Link>

          <details className="relative md:hidden">
            <summary className="flex min-h-11 cursor-pointer list-none items-center rounded-lg border border-border bg-background px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
              Menu
            </summary>
            <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-xl border border-border bg-surface p-2 shadow-xl">
              <AdminNavigation />
            </div>
          </details>

          <div className="mt-7 hidden md:block">
            <AdminNavigation />
          </div>
        </div>
      </aside>

      <div className="min-w-0">{children}</div>
    </div>
  );
}

