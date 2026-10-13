import type { Metadata } from "next";
import Link from "next/link";
import {
  getAnalyticsOverview,
  parseAnalyticsOverviewRange,
  type AnalyticsBreakdownItem,
  type AnalyticsOverview,
  type AnalyticsOverviewRange,
} from "@/lib/analytics/dashboard";

export const metadata: Metadata = {
  title: "Apex Analytics",
  robots: {
    index: false,
    follow: false,
  },
};

const rangeOptions: Array<{ value: AnalyticsOverviewRange; label: string }> = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
];

const numberFormatter = new Intl.NumberFormat("en-GB");

function formatRefreshedAt(timestamp: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(timestamp * 1000));
}

function humaniseLabel(label: string): string {
  return label.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function countryLabel(code: string): string {
  if (code === "Unknown") return code;
  try {
    return new Intl.DisplayNames(["en-GB"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

function MetricCard({ label, value }: Readonly<{ label: string; value: number }>) {
  return (
    <article className="rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-5">
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="mt-2 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
        {numberFormatter.format(value)}
      </p>
    </article>
  );
}

function BreakdownTable({
  title,
  items,
  formatLabel = humaniseLabel,
}: Readonly<{
  title: string;
  items: AnalyticsBreakdownItem[];
  formatLabel?: (label: string) => string;
}>) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <h2 className="border-b border-border px-4 py-3 text-base font-bold text-foreground sm:px-5">{title}</h2>
      {items.length ? (
        <div className="divide-y divide-border">
          {items.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-4 px-4 py-3 text-sm sm:px-5">
              <span className="min-w-0 truncate text-muted" title={formatLabel(item.label)}>{formatLabel(item.label)}</span>
              <span className="shrink-0 font-semibold tabular-nums text-foreground">{numberFormatter.format(item.count)}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="px-4 py-6 text-sm text-muted sm:px-5">No data in this range.</p>
      )}
    </section>
  );
}

function Dashboard({ data }: Readonly<{ data: AnalyticsOverview }>) {
  const metrics = [
    ["Sessions", data.metrics.sessions],
    ["Unique visitors", data.metrics.uniqueVisitors],
    ["Page views", data.metrics.pageViews],
    ["Product views", data.metrics.productViews],
    ["Add to cart", data.metrics.addToCart],
    ["Checkout started", data.metrics.checkoutStarted],
  ] as const;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 2xl:grid-cols-6">
        {metrics.map(([label, value]) => <MetricCard key={label} label={label} value={value} />)}
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
        <BreakdownTable title="Top countries" items={data.countries} formatLabel={countryLabel} />
        <BreakdownTable title="Devices" items={data.devices} />
        <BreakdownTable title="Browsers" items={data.browsers} formatLabel={(label) => label} />
        <BreakdownTable title="Acquisition channels" items={data.acquisitionChannels} />
      </div>
    </>
  );
}

export default async function AdminAnalyticsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ range?: string | string[] }>;
}>) {
  const range = parseAnalyticsOverviewRange((await searchParams).range);
  let data: AnalyticsOverview | null = null;

  try {
    data = await getAnalyticsOverview(range);
  } catch {
    // Local `next dev` does not provide Workers bindings; production and the
    // vinext preview resolve ANALYTICS_DB through the Cloudflare environment.
  }

  return (
    <main className="min-h-[100dvh] px-4 py-6 text-foreground sm:px-6 sm:py-8 lg:px-10 lg:py-10">
      <div className="mx-auto w-full max-w-[100rem]">
        <section id="overview" aria-labelledby="analytics-heading">
          <div className="flex flex-col gap-5 border-b border-border pb-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Overview</p>
              <h1 id="analytics-heading" className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">Apex Analytics</h1>
              <p className="mt-2 text-sm text-muted">
                {data ? `Last refreshed: ${formatRefreshedAt(data.refreshedAt)}` : "Analytics data is temporarily unavailable."}
              </p>
            </div>
            <nav aria-label="Analytics date range" className="flex w-full rounded-xl border border-border bg-surface p-1 sm:w-fit">
              {rangeOptions.map((option) => {
                const active = option.value === range;
                return (
                  <Link
                    key={option.value}
                    href={`/admin/analytics?range=${option.value}`}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-10 flex-1 items-center justify-center rounded-lg px-3 py-2 text-center text-sm font-semibold transition sm:flex-none ${active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted hover:bg-surface-muted hover:text-foreground"}`}
                  >
                    {option.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="pt-6">
            {data ? (
              <Dashboard data={data} />
            ) : (
              <div className="rounded-xl border border-border bg-surface p-6 text-sm text-muted shadow-sm">
                The analytics database could not be reached. Try again from the Cloudflare vinext runtime.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
