import type { Metadata } from "next";
import {
  analyticsDashboardQueryString,
  getAnalyticsOverview,
  parseAnalyticsDashboardQuery,
  type AnalyticsBreakdownItem,
  type AnalyticsDashboardQuery,
  type AnalyticsOverview,
  type AnalyticsOverviewRange,
} from "@/lib/analytics/dashboard";
import { refreshAnalytics } from "@/app/admin/analytics/actions";

export const metadata: Metadata = {
  title: "Apex Analytics",
  robots: { index: false, follow: false },
};

const rangeOptions: Array<{ value: AnalyticsOverviewRange; label: string }> = [
  { value: "7d", label: "Last 7 days" },
  { value: "15d", label: "Last 15 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "60d", label: "Last 60 days" },
  { value: "90d", label: "Last 90 days" },
];

const numberFormatter = new Intl.NumberFormat("en-GB");
const controlClass = "min-h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

function formatRelativeRefresh(timestamp: number): string {
  const elapsed = Math.max(0, Math.floor(Date.now() / 1000) - timestamp);
  if (elapsed < 60) return "Updated just now";
  if (elapsed < 3600) {
    const minutes = Math.floor(elapsed / 60);
    return `Updated ${minutes} min${minutes === 1 ? "" : "s"} ago`;
  }
  if (elapsed < 86_400) {
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    return `Updated ${hours}h${minutes ? ` ${minutes}m` : ""} ago`;
  }
  if (elapsed < 172_800) return "Updated yesterday";
  return `Updated ${Math.floor(elapsed / 86_400)} days ago`;
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

function withSelectedOption(values: string[], selected: string | null): string[] {
  return selected && !values.includes(selected) ? [selected, ...values] : values;
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

function SelectField({ label, name, defaultValue, children }: Readonly<{
  label: string;
  name: string;
  defaultValue: string;
  children: React.ReactNode;
}>) {
  return (
    <label className="min-w-0 text-xs font-semibold text-muted">
      <span className="mb-1 block">{label}</span>
      <select name={name} defaultValue={defaultValue} className={controlClass}>{children}</select>
    </label>
  );
}

function DashboardFilters({ data, query }: Readonly<{
  data: AnalyticsOverview | null;
  query: AnalyticsDashboardQuery;
}>) {
  const options = data?.filterOptions ?? { countries: [], devices: [], browsers: [], operatingSystems: [] };
  const countries = withSelectedOption(options.countries, query.country);
  const devices = withSelectedOption(options.devices, query.device);
  const browsers = withSelectedOption(options.browsers, query.browser);
  const operatingSystems = withSelectedOption(options.operatingSystems, query.os);
  const returnTo = `/admin/analytics?${analyticsDashboardQueryString(query)}`;

  return (
    <div className="mt-4 rounded-xl border border-border bg-surface p-3 shadow-sm sm:p-4">
      <form action="/admin/analytics" method="get" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-7 xl:items-end">
        <SelectField label="Date range" name="range" defaultValue={query.range}>
          {rangeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </SelectField>
        <SelectField label="Country rule" name="countryMode" defaultValue={query.countryMode}>
          <option value="all">All countries</option>
          <option value="include">Include country</option>
          <option value="exclude">Exclude country</option>
        </SelectField>
        <SelectField label="Country" name="country" defaultValue={query.country ?? ""}>
          <option value="">Select country…</option>
          {countries.map((country) => <option key={country} value={country}>{countryLabel(country)}</option>)}
        </SelectField>
        <SelectField label="Device" name="device" defaultValue={query.device ?? ""}>
          <option value="">All devices</option>
          {devices.map((device) => <option key={device} value={device}>{humaniseLabel(device)}</option>)}
        </SelectField>
        <SelectField label="Browser" name="browser" defaultValue={query.browser ?? ""}>
          <option value="">All browsers</option>
          {browsers.map((browser) => <option key={browser} value={browser}>{browser}</option>)}
        </SelectField>
        <SelectField label="Operating system" name="os" defaultValue={query.os ?? ""}>
          <option value="">All operating systems</option>
          {operatingSystems.map((os) => <option key={os} value={os}>{os}</option>)}
        </SelectField>
        <button type="submit" className="min-h-10 self-end rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          Apply filters
        </button>
      </form>
      <div className="mt-3 flex justify-end border-t border-border pt-3">
        <form action={refreshAnalytics}>
          <input type="hidden" name="returnTo" value={returnTo} />
          <button type="submit" className="min-h-10 rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            Refresh analytics
          </button>
        </form>
      </div>
    </div>
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
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const query = parseAnalyticsDashboardQuery(await searchParams);
  let data: AnalyticsOverview | null = null;

  try {
    data = await getAnalyticsOverview(query);
  } catch {
    // Normal Next development has no Workers binding. Production and vinext
    // resolve ANALYTICS_DB through the Cloudflare runtime.
  }

  return (
    <main className="min-h-[100dvh] px-4 py-5 text-foreground sm:px-6 sm:py-7 lg:px-10 lg:py-9">
      <div className="mx-auto w-full max-w-[100rem]">
        <section id="overview" aria-labelledby="overview-heading">
          <div className="border-b border-border pb-5">
            <h1 id="overview-heading" className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Overview</h1>
            <p className="mt-1 text-sm text-muted">
              {data ? formatRelativeRefresh(data.refreshedAt) : "Analytics data is temporarily unavailable."}
            </p>
            <DashboardFilters data={data} query={query} />
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
