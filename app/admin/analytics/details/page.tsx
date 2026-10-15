import type { Metadata } from "next";
import Link from "next/link";
import { refreshAnalytics } from "@/app/admin/analytics/actions";
import { analyticsDashboardQueryString } from "@/lib/analytics/dashboard";
import {
  getAnalyticsDetails,
  parseAnalyticsDetailsQuery,
  type AnalyticsDetailsQuery,
  type AnalyticsDetailsResult,
  type AnalyticsDetailTab,
  type LandingPageDetailRow,
  type ProductDetailRow,
  type SearchTermDetailRow,
} from "@/lib/analytics/details";

export const metadata: Metadata = {
  title: "Analytics details | Apex",
  robots: { index: false, follow: false },
};

const numberFormatter = new Intl.NumberFormat("en-GB");
const percentFormatter = new Intl.NumberFormat("en-GB", { style: "percent", maximumFractionDigits: 1 });
const tabLabels: Record<AnalyticsDetailTab, string> = {
  products: "Products",
  "landing-pages": "Landing pages",
  "search-terms": "Search terms",
};

function detailsHref(query: AnalyticsDetailsQuery, overrides: Partial<Pick<AnalyticsDetailsQuery, "tab" | "page" | "search" | "sort" | "direction">> = {}): string {
  const next = { ...query, ...overrides };
  const params = new URLSearchParams(analyticsDashboardQueryString(next));
  params.set("tab", next.tab);
  if (next.page > 1) params.set("page", String(next.page));
  if (next.search) params.set("q", next.search);
  params.set("sort", next.sort);
  params.set("direction", next.direction);
  return `/admin/analytics/details?${params.toString()}`;
}

function filterContext(query: AnalyticsDetailsQuery): string[] {
  const values = [`Last ${query.range.slice(0, -1)} days`];
  if (query.country) values.push(`${query.countryMode === "exclude" ? "Exclude" : "Country"}: ${query.country}`);
  if (query.device) values.push(`Device: ${query.device}`);
  if (query.browser) values.push(`Browser: ${query.browser}`);
  if (query.os) values.push(`OS: ${query.os}`);
  return values;
}

function SortHeader({ label, sortKey, query }: Readonly<{ label: string; sortKey: string; query: AnalyticsDetailsQuery }>) {
  const active = query.sort === sortKey;
  const direction = active && query.direction === "desc" ? "asc" : "desc";
  const indicator = active ? (query.direction === "asc" ? " ↑" : " ↓") : "";
  return (
    <th scope="col" className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
      <Link href={detailsHref(query, { sort: sortKey, direction, page: 1 })} className="rounded-sm underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
        {label}{indicator}
      </Link>
    </th>
  );
}

function readableProduct(row: ProductDetailRow): string {
  if (row.productHandle) return row.productHandle.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  return row.productId ?? "Unknown product";
}

function ProductsTable({ rows, query }: Readonly<{ rows: ProductDetailRow[]; query: AnalyticsDetailsQuery }>) {
  if (!rows.length) return <EmptyState>No product data for this period</EmptyState>;
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-sm">
      <table className="w-full min-w-[64rem] border-collapse text-sm">
        <thead className="border-b border-border bg-surface-muted/60">
          <tr>
            <SortHeader label="Product" sortKey="product" query={query} />
            <SortHeader label="SKU" sortKey="sku" query={query} />
            <SortHeader label="Product views" sortKey="views" query={query} />
            <SortHeader label="Unique visitors" sortKey="visitors" query={query} />
            <SortHeader label="Add to cart events" sortKey="adds" query={query} />
            <SortHeader label="Unique visitors with add" sortKey="addVisitors" query={query} />
            <SortHeader label="View → add rate" sortKey="rate" query={query} />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => {
            const label = readableProduct(row);
            return (
              <tr key={row.productId ?? row.productHandle ?? label}>
                <td className="max-w-xs px-4 py-3 font-medium text-foreground">
                  {row.productHandle ? (
                    <a href={`/products/${encodeURIComponent(row.productHandle)}?analytics_preview=1`} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:text-primary hover:underline">
                      {label}
                    </a>
                  ) : label}
                </td>
                <td className="px-4 py-3 text-muted">{row.sku ?? "—"}</td>
                <NumberCell value={row.productViews} />
                <NumberCell value={row.uniqueViewVisitors} />
                <NumberCell value={row.addToCartEvents} />
                <NumberCell value={row.uniqueAddToCartVisitors} />
                <td className="px-4 py-3 text-right font-medium tabular-nums text-foreground">{row.viewToAddRate === null ? "—" : percentFormatter.format(row.viewToAddRate)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function safeLandingHref(path: string): string | null {
  return path.startsWith("/") && !path.startsWith("//") ? `${path}?analytics_preview=1` : null;
}

function LandingPagesTable({ rows, query }: Readonly<{ rows: LandingPageDetailRow[]; query: AnalyticsDetailsQuery }>) {
  if (!rows.length) return <EmptyState>No landing-page data for this period</EmptyState>;
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-sm">
      <table className="w-full min-w-[72rem] border-collapse text-sm">
        <thead className="border-b border-border bg-surface-muted/60">
          <tr>
            <SortHeader label="Landing page" sortKey="path" query={query} />
            <SortHeader label="Sessions" sortKey="sessions" query={query} />
            <SortHeader label="Unique visitors" sortKey="visitors" query={query} />
            <SortHeader label="Page views" sortKey="pageViews" query={query} />
            <SortHeader label="Product views" sortKey="productViews" query={query} />
            <SortHeader label="Add to cart events" sortKey="adds" query={query} />
            <SortHeader label="Checkout start events" sortKey="checkouts" query={query} />
            <SortHeader label="Top acquisition" sortKey="acquisition" query={query} />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => {
            const href = safeLandingHref(row.landingPath);
            return (
              <tr key={row.landingPath}>
                <td className="max-w-sm px-4 py-3 font-medium text-foreground">
                  {href ? <a href={href} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:text-primary hover:underline">{row.landingPath}</a> : row.landingPath}
                </td>
                <NumberCell value={row.sessions} />
                <NumberCell value={row.uniqueVisitors} />
                <NumberCell value={row.pageViews} />
                <NumberCell value={row.productViews} />
                <NumberCell value={row.addToCartEvents} />
                <NumberCell value={row.checkoutStartEvents} />
                <td className="whitespace-nowrap px-4 py-3 text-muted">{row.topAcquisitionChannel?.replaceAll("_", " ") ?? "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SearchTermsTable({ rows, query }: Readonly<{ rows: SearchTermDetailRow[]; query: AnalyticsDetailsQuery }>) {
  if (!rows.length) return <EmptyState>No search data for this period</EmptyState>;
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-sm">
      <table className="w-full min-w-[44rem] border-collapse text-sm">
        <thead className="border-b border-border bg-surface-muted/60">
          <tr>
            <SortHeader label="Search term" sortKey="query" query={query} />
            <SortHeader label="Search count" sortKey="searches" query={query} />
            <SortHeader label="Unique sessions" sortKey="sessions" query={query} />
            <SortHeader label="Zero-result count" sortKey="zeroResults" query={query} />
            <th scope="col" className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Result status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => {
            const status = row.zeroResultCount === 0 ? "Results found"
              : row.zeroResultCount === row.searchCount ? "Zero results" : "Mixed results";
            return (
              <tr key={row.query}>
                <td className="max-w-md px-4 py-3 font-medium text-foreground">
                  <a href={`/search?q=${encodeURIComponent(row.query)}&analytics_preview=1`} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:text-primary hover:underline">{row.query}</a>
                </td>
                <NumberCell value={row.searchCount} />
                <NumberCell value={row.uniqueSessions} />
                <NumberCell value={row.zeroResultCount} />
                <td className="whitespace-nowrap px-4 py-3 text-muted">{status}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function NumberCell({ value }: Readonly<{ value: number }>) {
  return <td className="px-4 py-3 text-right font-medium tabular-nums text-foreground">{numberFormatter.format(value)}</td>;
}

function EmptyState({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="rounded-xl border border-border bg-surface px-5 py-10 text-center text-sm text-muted shadow-sm">{children}</div>;
}

function Pagination({ data }: Readonly<{ data: AnalyticsDetailsResult }>) {
  const previous = data.query.page > 1 ? detailsHref(data.query, { page: data.query.page - 1 }) : null;
  const next = data.query.page < data.totalPages ? detailsHref(data.query, { page: data.query.page + 1 }) : null;
  const buttonClass = "inline-flex min-h-10 items-center rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
  const disabledClass = "inline-flex min-h-10 items-center rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-muted opacity-50";
  return (
    <nav aria-label="Details pagination" className="mt-4 flex flex-wrap items-center justify-between gap-3">
      {previous ? <Link href={previous} className={buttonClass}>Previous</Link> : <span className={disabledClass}>Previous</span>}
      <span className="text-sm text-muted">Page {data.query.page} of {data.totalPages} · {numberFormatter.format(data.totalRows)} rows</span>
      {next ? <Link href={next} className={buttonClass}>Next</Link> : <span className={disabledClass}>Next</span>}
    </nav>
  );
}

function SearchRowsForm({ query }: Readonly<{ query: AnalyticsDetailsQuery }>) {
  const filters = new URLSearchParams(analyticsDashboardQueryString(query));
  return (
    <form action="/admin/analytics/details" method="get" className="flex w-full flex-col gap-2 sm:max-w-xl sm:flex-row">
      {[...filters.entries()].map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
      <input type="hidden" name="tab" value={query.tab} />
      <input type="hidden" name="sort" value={query.sort} />
      <input type="hidden" name="direction" value={query.direction} />
      <label className="min-w-0 flex-1">
        <span className="sr-only">Filter table rows</span>
        <input name="q" defaultValue={query.search} maxLength={100} placeholder={`Filter ${tabLabels[query.tab].toLowerCase()}`} className="min-h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20" />
      </label>
      <button type="submit" className="min-h-10 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Search</button>
      {query.search ? <Link href={detailsHref(query, { search: "", page: 1 })} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground hover:bg-surface-muted">Clear</Link> : null}
    </form>
  );
}

function DetailsContent({ data }: Readonly<{ data: AnalyticsDetailsResult }>) {
  if (data.tab === "products") return <ProductsTable rows={data.rows} query={data.query} />;
  if (data.tab === "landing-pages") return <LandingPagesTable rows={data.rows} query={data.query} />;
  return <SearchTermsTable rows={data.rows} query={data.query} />;
}

export default async function AnalyticsDetailsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const query = parseAnalyticsDetailsQuery(await searchParams);
  let data: AnalyticsDetailsResult | null = null;
  try {
    data = await getAnalyticsDetails(query);
  } catch {
    // Normal Next development has no Workers binding. Production and vinext
    // resolve ANALYTICS_DB through the Cloudflare runtime.
  }
  const returnTo = detailsHref(query);
  const overviewHref = `/admin/analytics?${analyticsDashboardQueryString(query)}`;

  return (
    <main className="min-h-[100dvh] px-4 py-5 text-foreground sm:px-6 sm:py-7 lg:px-10 lg:py-9">
      <div className="mx-auto w-full max-w-[100rem]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Analytics details</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">{tabLabels[query.tab]}</h1>
            <Link href={overviewHref} className="mt-2 inline-block text-sm font-medium text-muted underline-offset-4 hover:text-primary hover:underline">← Back to overview</Link>
          </div>
          <form action={refreshAnalytics}>
            <input type="hidden" name="returnTo" value={returnTo} />
            <button type="submit" className="min-h-10 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Refresh analytics</button>
          </form>
        </div>

        <nav aria-label="Analytics detail views" className="mt-6 flex max-w-full gap-1 overflow-x-auto border-b border-border">
          {(Object.keys(tabLabels) as AnalyticsDetailTab[]).map((tab) => (
            <Link key={tab} href={detailsHref(query, { tab, page: 1, search: "", sort: tab === "products" ? "views" : tab === "landing-pages" ? "sessions" : "searches", direction: "desc" })} aria-current={query.tab === tab ? "page" : undefined} className={`shrink-0 border-b-2 px-4 py-3 text-sm font-semibold transition ${query.tab === tab ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"}`}>
              {tabLabels[tab]}
            </Link>
          ))}
        </nav>

        <div className="mt-4 flex flex-wrap gap-2" aria-label="Active analytics filters">
          {filterContext(query).map((value) => <span key={value} className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted">{value}</span>)}
        </div>

        <div className="mt-5">
          <SearchRowsForm query={query} />
        </div>

        <div className="mt-5">
          {data ? (
            <>
              <DetailsContent data={data} />
              {data.totalRows ? <Pagination data={data} /> : null}
            </>
          ) : (
            <EmptyState>The analytics database could not be reached. Try again from the Cloudflare vinext runtime.</EmptyState>
          )}
        </div>
      </div>
    </main>
  );
}
