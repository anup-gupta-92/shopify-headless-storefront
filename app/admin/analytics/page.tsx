import type { Metadata } from "next";
import {
  analyticsDashboardQueryString,
  getAnalyticsOverview,
  parseAnalyticsDashboardQuery,
  type AnalyticsBreakdownItem,
  type AnalyticsDashboardQuery,
  type AnalyticsOverview,
  type AnalyticsOverviewRange,
  type AnalyticsProductItem,
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
const controlClass = "min-h-10 min-w-0 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

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

function MetricCard({ label, value, help }: Readonly<{ label: string; value: number; help?: string }>) {
  return (
    <article className="rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-5">
      <p className="text-sm font-medium text-muted" title={help} aria-label={help ? `${label}. ${help}` : undefined}>{label}</p>
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

function SummaryCard({
  title,
  stats,
  details,
  detailsTitle,
  formatDetailLabel = humaniseLabel,
  detailHref,
}: Readonly<{
  title: string;
  stats: Array<{ label: string; value: string | number }>;
  details?: AnalyticsBreakdownItem[];
  detailsTitle?: string;
  formatDetailLabel?: (label: string) => string;
  detailHref?: (item: AnalyticsBreakdownItem) => string | null;
}>) {
  return (
    <article className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <h3 className="border-b border-border px-4 py-3 text-base font-bold text-foreground sm:px-5">{title}</h3>
      <dl className="divide-y divide-border">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center justify-between gap-4 px-4 py-3 text-sm sm:px-5">
            <dt className="text-muted">{stat.label}</dt>
            <dd className="shrink-0 font-semibold tabular-nums text-foreground">
              {typeof stat.value === "number" ? numberFormatter.format(stat.value) : stat.value}
            </dd>
          </div>
        ))}
      </dl>
      {details?.length ? (
        <div className="border-t border-border px-4 py-3 sm:px-5">
          {detailsTitle ? <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{detailsTitle}</p> : null}
          <div className="space-y-2">
            {details.map((item) => {
              const href = detailHref?.(item);
              const label = formatDetailLabel(item.label);
              return (
              <div key={item.label} className="flex items-center justify-between gap-4 text-sm">
                {href ? (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate text-primary underline-offset-4 hover:underline" title={label}>
                    {label}
                  </a>
                ) : (
                  <span className="min-w-0 truncate text-muted" title={label}>{label}</span>
                )}
                <span className="shrink-0 font-semibold tabular-nums text-foreground">{numberFormatter.format(item.count)}</span>
              </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function readableProductLabel(item: AnalyticsProductItem): string {
  if (!item.handle) return item.label;
  return item.handle.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function TopProductsCard({ items }: Readonly<{ items: AnalyticsProductItem[] }>) {
  return (
    <article className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <h3 className="border-b border-border px-4 py-3 text-base font-bold text-foreground sm:px-5">Top viewed products</h3>
      {items.length ? (
        <div className="divide-y divide-border">
          {items.map((item) => {
            const label = readableProductLabel(item);
            const content = (
              <span className="min-w-0">
                <span className="block truncate" title={label}>{label}</span>
                {item.sku ? <span className="mt-0.5 block truncate text-xs text-muted">SKU: {item.sku}</span> : null}
              </span>
            );
            return (
              <div key={`${item.handle ?? item.productId ?? item.label}:${item.sku ?? ""}`} className="flex items-center justify-between gap-4 px-4 py-3 text-sm sm:px-5">
                {item.handle ? (
                  <a
                    href={`/products/${encodeURIComponent(item.handle)}?analytics_preview=1`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-w-0 text-primary underline-offset-4 hover:underline"
                    title={item.productId ?? label}
                  >
                    {content}
                  </a>
                ) : <span className="min-w-0 text-muted">{content}</span>}
                <span className="shrink-0 font-semibold tabular-nums text-foreground">{numberFormatter.format(item.count)}</span>
              </div>
            );
          })}
        </div>
      ) : <p className="px-4 py-6 text-sm text-muted sm:px-5">No data in this range.</p>}
    </article>
  );
}

function SectionHeading({ children }: Readonly<{ children: React.ReactNode }>) {
  return <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-muted">{children}</h2>;
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
  const countryFilter = query.countryMode !== "all" && query.country
    ? `${query.countryMode}:${query.country}`
    : "";

  return (
    <div className="rounded-xl border border-border bg-surface p-3 shadow-sm sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 id="overview-heading" className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Overview</h1>
          <p className="mt-1 text-sm text-muted">
            {data ? formatRelativeRefresh(data.refreshedAt) : "Analytics data is temporarily unavailable."}
          </p>
        </div>
        <form action={refreshAnalytics} className="shrink-0">
          <input type="hidden" name="returnTo" value={returnTo} />
          <button type="submit" className="min-h-10 rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:px-4">
            Refresh analytics
          </button>
        </form>
      </div>
      <form action="/admin/analytics" method="get" className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3 md:grid-cols-3 xl:grid-cols-[repeat(5,minmax(0,1fr))_auto] xl:items-end">
        <SelectField label="Date range" name="range" defaultValue={query.range}>
          {rangeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </SelectField>
        <SelectField label="Country" name="countryFilter" defaultValue={countryFilter}>
          <option value="">All countries</option>
          {countries.map((country) => <option key={`include:${country}`} value={`include:${country}`}>{countryLabel(country)}</option>)}
          {countries.map((country) => <option key={`exclude:${country}`} value={`exclude:${country}`}>Exclude {countryLabel(country)}</option>)}
        </SelectField>
        <SelectField label="Device" name="device" defaultValue={query.device ?? ""}>
          <option value="">All devices</option>
          {devices.map((device) => <option key={device} value={device}>{humaniseLabel(device)}</option>)}
        </SelectField>
        <SelectField label="Browser" name="browser" defaultValue={query.browser ?? ""}>
          <option value="">All browsers</option>
          {browsers.map((browser) => <option key={browser} value={browser}>{browser}</option>)}
        </SelectField>
        <SelectField label="OS" name="os" defaultValue={query.os ?? ""}>
          <option value="">All OS</option>
          {operatingSystems.map((os) => <option key={os} value={os}>{os}</option>)}
        </SelectField>
        <button type="submit" className="min-h-10 self-end rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          Apply filters
        </button>
      </form>
    </div>
  );
}

function Dashboard({ data }: Readonly<{ data: AnalyticsOverview }>) {
  const metrics = [
    ["Sessions", data.metrics.sessions, undefined],
    ["Unique visitors", data.metrics.uniqueVisitors, undefined],
    ["Page views", data.metrics.pageViews, undefined],
    ["Product views", data.metrics.productViews, undefined],
    ["Add to cart events", data.metrics.addToCart, "Event count may include multiple actions from the same session."],
    ["Checkout start events", data.metrics.checkoutStarted, "Event count may include multiple actions from the same session."],
  ] as const;
  const percentage = (value: number | null) => value === null
    ? "—"
    : new Intl.NumberFormat("en-GB", { style: "percent", maximumFractionDigits: 1 }).format(value);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 2xl:grid-cols-6">
        {metrics.map(([label, value, help]) => <MetricCard key={label} label={label} value={value} help={help} />)}
      </div>

      <section id="traffic" className="scroll-mt-6 pt-8">
        <SectionHeading>Traffic summaries</SectionHeading>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <BreakdownTable title="Top countries" items={data.countries} formatLabel={countryLabel} />
          <BreakdownTable title="Devices" items={data.devices} />
          <BreakdownTable title="Browsers" items={data.browsers} formatLabel={(label) => label} />
          <BreakdownTable title="Operating systems" items={data.operatingSystems} formatLabel={(label) => label} />
          <BreakdownTable title="Acquisition channels" items={data.acquisitionChannels} />
          <BreakdownTable title="Landing pages" items={data.landingPages} formatLabel={(label) => label} />
        </div>
      </section>

      <div className="grid gap-8 pt-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <section id="search" className="scroll-mt-6">
          <SectionHeading>Search</SectionHeading>
          <SummaryCard
            title="Search overview"
            stats={[
              { label: "Total searches", value: data.search.total },
              { label: "Unique search queries", value: data.search.uniqueQueries },
              { label: "Zero-result searches", value: data.search.zeroResults },
            ]}
            details={data.search.topTerms}
            detailsTitle="Top search terms"
            formatDetailLabel={(label) => label}
            detailHref={(item) => `/search?q=${encodeURIComponent(item.label)}&analytics_preview=1`}
          />
        </section>

        <section id="products" className="scroll-mt-6">
          <SectionHeading>Products</SectionHeading>
          <div className="grid gap-4 md:grid-cols-2">
            <TopProductsCard items={data.topViewedProducts} />
            <SummaryCard
              title="Homepage interactions"
              stats={[{ label: "Hotspot product clicks", value: data.homepageInteractions.hotspotClicks }]}
              details={data.homepageInteractions.topProducts}
              detailsTitle="Top clicked products"
              formatDetailLabel={(label) => label}
            />
          </div>
        </section>
      </div>

      <section id="cart-checkout" className="scroll-mt-6 pt-8">
        <SectionHeading>Cart &amp; checkout</SectionHeading>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <SummaryCard
            title="Commerce funnel"
            stats={[
              { label: "Add to cart events", value: data.commerce.addToCart },
              { label: "Unique visitors with add to cart", value: data.commerce.addToCartVisitors },
              { label: "Cart opened events", value: data.commerce.cartOpened },
              { label: "Checkout start events", value: data.commerce.checkoutStarted },
              { label: "Unique visitors with checkout start", value: data.commerce.checkoutStartedVisitors },
            ]}
          />
          <SummaryCard
            title="Bulk ordering"
            stats={[
              { label: "Bulk-order interactions", value: data.bulkOrdering.interactions },
              { label: "Sessions using bulk ordering", value: data.bulkOrdering.sessions },
            ]}
          />
        </div>
      </section>

      <section id="behaviour" className="scroll-mt-6 pt-8">
        <SectionHeading>Behaviour</SectionHeading>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <SummaryCard
            title="Theme usage"
            stats={[
              { label: "Initial light", value: data.theme.initialLight },
              { label: "Initial dark", value: data.theme.initialDark },
              { label: "Switched to light", value: data.theme.switchedToLight },
              { label: "Switched to dark", value: data.theme.switchedToDark },
              { label: "Total theme switches", value: data.theme.totalSwitches },
            ]}
          />
          <SummaryCard
            title="Consent"
            stats={[
              { label: "Accepted", value: data.consent.accepted },
              { label: "Rejected", value: data.consent.rejected },
              { label: "Acceptance rate", value: percentage(data.consent.acceptanceRate) },
            ]}
          />
          <SummaryCard
            title="PWA"
            stats={[
              { label: "Prompt shown", value: data.pwa.promptShown },
              { label: "Install clicked", value: data.pwa.installClicked },
              { label: "Dismissed", value: data.pwa.dismissed },
              { label: "Installed", value: data.pwa.installed },
              { label: "Standalone launches", value: data.pwa.standaloneLaunches },
            ]}
          />
        </div>
      </section>

      <section id="404s" className="scroll-mt-6 pt-8">
        <SectionHeading>404s</SectionHeading>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <SummaryCard
            title="Missing pages"
            stats={[
              { label: "Total 404 views", value: data.notFound.total },
              { label: "Unique missing paths", value: data.notFound.uniquePaths },
            ]}
            details={data.notFound.topPaths}
            detailsTitle="Top missing paths"
            formatDetailLabel={(label) => label}
          />
        </div>
      </section>
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
