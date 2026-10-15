import Image from "next/image";
import Link from "next/link";
import AdminMobileNavigation from "@/components/AdminMobileNavigation";
import ThemeToggle from "@/components/ThemeToggle";

const adminNavigation = [
  { label: "Overview", href: "/admin/analytics#overview" },
  { label: "Traffic", href: "/admin/analytics#traffic" },
  { label: "Search", href: "/admin/analytics#search" },
  { label: "Products", href: "/admin/analytics#products" },
  { label: "Cart & checkout", href: "/admin/analytics#cart-checkout" },
  { label: "Behaviour", href: "/admin/analytics#behaviour" },
  { label: "404s", href: "/admin/analytics#404s" },
] as const;

const navigationClass = "rounded-lg px-3 py-2 text-sm font-medium text-muted transition hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

function AdminNavigation() {
  return (
    <nav aria-label="Analytics sections" className="flex flex-col gap-1">
      {adminNavigation.map((item) => (
        <Link key={item.href} href={item.href} className={navigationClass}>{item.label}</Link>
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
            <Image src="/images/favicon.png" alt="" width={36} height={36} className="size-9 shrink-0 rounded-xl" />
            <span className="min-w-0">
              <span className="block truncate text-xs font-semibold uppercase tracking-[0.14em] text-muted">Apex</span>
              <span className="block truncate font-bold text-foreground">Analytics</span>
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-2 md:hidden">
            <ThemeToggle analyticsEnabled={false} />
            <AdminMobileNavigation>
              <AdminNavigation />
            </AdminMobileNavigation>
          </div>

          <div className="mt-7 hidden md:block">
            <AdminNavigation />
          </div>
        </div>
      </aside>

      <div className="min-w-0 md:pr-24">{children}</div>
      <div className="fixed right-5 top-5 z-20 hidden md:block lg:right-7 lg:top-7">
        <ThemeToggle analyticsEnabled={false} />
      </div>
    </div>
  );
}

