import type { Metadata } from "next";
import Link from "next/link";
import { refreshAnalytics } from "@/app/admin/analytics/actions";
import { formatAnalyticsTimestamp } from "@/lib/analytics/admin-date";
import {
  getPaidTrafficReport,
  type PaidTrafficChannelComparison,
  type PaidTrafficReport,
} from "@/lib/analytics/paid-traffic";
import {
  funnelRate,
  PAID_TRAFFIC_CHANNELS,
  PAID_TRAFFIC_RANGES,
  paidTrafficQueryString,
  parsePaidTrafficQuery,
  type PaidTrafficQuery,
} from "@/lib/analytics/paid-traffic-shared";

export const metadata: Metadata = {
  title: "Paid traffic | Apex Analytics",
  robots: { index: false, follow: false },
};

const numberFormatter = new Intl.NumberFormat("en-GB");
const percentFormatter = new Intl.NumberFormat("en-GB", { style: "percent", maximumFractionDigits: 1 });
const controlClass = "min-h-10 min-w-0 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

function humanise(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function countryLabel(code: string): string {
  try {
    return new Intl.DisplayNames(["en-GB"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

function selectedOption(values: string[], selected: string | null): string[] {
  return selected && !values.includes(selected) ? [selected, ...values] : values;
}

function formatRelativeRefresh(timestamp: number): string {
  const elapsed = Math.max(0, Math.floor(Date.now() / 1000) - timestamp);
  if (elapsed < 60) return "Updated just now";
  if (elapsed < 3600) return `Updated ${Math.floor(elapsed / 60)} mins ago`;
  if (elapsed < 86_400) return `Updated ${Math.floor(elapsed / 3600)}h ago`;
  return `Updated ${Math.floor(elapsed / 86_400)} days ago`;
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

function PaidTrafficFilters({ data, query }: Readonly<{
  data: PaidTrafficReport | null;
  query: PaidTrafficQuery;
}>) {
  const options = data?.filterOptions ?? {
    countries: [], devices: [], acquisitionChannels: [], utmSources: [], utmMediums: [], utmCampaigns: [],
  };
  const countries = selectedOption(options.countries, query.country);
  const devices = selectedOption(options.devices, query.device);
  const channels = selectedOption(options.acquisitionChannels, query.acquisition);
  const sources = selectedOption(options.utmSources, query.utmSource);
  const mediums = selectedOption(options.utmMediums, query.utmMedium);
  const campaigns = selectedOption(options.utmCampaigns, query.utmCampaign);
  const countryFilter = query.countryMode !== "all" && query.country
    ? `${query.countryMode}:${query.country}`
    : "";
  const returnTo = `/admin/analytics/paid-traffic?${paidTrafficQueryString(query)}`;

  return (
    <section className="rounded-xl border border-border bg-surface p-3 shadow-sm sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Paid traffic</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground">Acquisition funnel</h1>
          <p className="mt-1 text-sm text-muted">{data ? formatRelativeRefresh(data.refreshedAt) : "Analytics data is temporarily unavailable."}</p>
        </div>
        <form action={refreshAnalytics}>
          <input type="hidden" name="returnTo" value={returnTo} />
          <button type="submit" className="min-h-10 rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            Refresh analytics
          </button>
        </form>
      </div>

      <form action="/admin/analytics/paid-traffic" method="get" className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-[repeat(8,minmax(0,1fr))_auto] 2xl:items-end">
        <SelectField label="Date range" name="range" defaultValue={query.range}>
          {PAID_TRAFFIC_RANGES.map((range) => <option key={range} value={range}>Last {range.slice(0, -1)} days</option>)}
        </SelectField>
        <SelectField label="Country" name="countryFilter" defaultValue={countryFilter}>
          <option value="">All countries</option>
          {countries.map((country) => <option key={`include:${country}`} value={`include:${country}`}>{countryLabel(country)}</option>)}
          {countries.map((country) => <option key={`exclude:${country}`} value={`exclude:${country}`}>Exclude {countryLabel(country)}</option>)}
        </SelectField>
        <SelectField label="Acquisition" name="acquisition" defaultValue={query.acquisition ?? "all"}>
          <option value="all">All acquisition channels</option>
          {PAID_TRAFFIC_CHANNELS.filter((channel) => channels.includes(channel) || ["paid_search", "google_shopping", "google_merchant", "organic_search", "direct"].includes(channel)).map((channel) => (
            <option key={channel} value={channel}>{humanise(channel)}</option>
          ))}
        </SelectField>
        <SelectField label="UTM source" name="utmSource" defaultValue={query.utmSource ?? ""}>
          <option value="">All sources</option>
          {sources.map((source) => <option key={source} value={source}>{source}</option>)}
        </SelectField>
        <SelectField label="UTM medium" name="utmMedium" defaultValue={query.utmMedium ?? ""}>
          <option value="">All mediums</option>
          {mediums.map((medium) => <option key={medium} value={medium}>{medium}</option>)}
        </SelectField>
        <SelectField label="UTM campaign" name="utmCampaign" defaultValue={query.utmCampaign ?? ""}>
          <option value="">All campaigns</option>
          {campaigns.map((campaign) => <option key={campaign} value={campaign}>{campaign}</option>)}
        </SelectField>
        <SelectField label="Device" name="device" defaultValue={query.device ?? ""}>
          <option value="">All devices</option>
          {devices.map((device) => <option key={device} value={device}>{humanise(device)}</option>)}
        </SelectField>
        <SelectField label="Session activity" name="activity" defaultValue={query.activity}>
          <option value="all">All sessions</option>
          <option value="added_to_cart">Added to Cart</option>
          <option value="checkout_started">Checkout Started</option>
          <option value="no_cart_activity">No Cart Activity</option>
        </SelectField>
        <button type="submit" className="min-h-10 self-end rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          Apply filters
        </button>
      </form>
    </section>
  );
}

function FunnelStage({ label, value, rate, unavailable = false }: Readonly<{
  label: string;
  value: number;
  rate: number | null;
  unavailable?: boolean;
}>) {
  return (
    <article className="rounded-xl border border-border bg-surface p-4 shadow-sm">
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="mt-2 text-2xl font-extrabold tracking-tight text-foreground">
        {unavailable ? "Not available" : numberFormatter.format(value)}
      </p>
      <p className="mt-1 text-xs text-muted">
        {unavailable ? "No reliable Shopify purchase reconciliation yet" : rate === null ? "Starting cohort" : `${percentFormatter.format(rate)} of previous stage`}
      </p>
    </article>
  );
}

function Funnel({ data }: Readonly<{ data: PaidTrafficReport }>) {
  const funnel = data.funnel;
  return (
    <section className="pt-7" aria-labelledby="paid-funnel-heading">
      <h2 id="paid-funnel-heading" className="text-sm font-semibold uppercase tracking-[0.14em] text-muted">Session funnel</h2>
      <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">
        Each stage counts distinct sessions with that activity. Product pages can be skipped when customers add from another storefront surface.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <FunnelStage label="Sessions" value={funnel.sessions} rate={null} />
        <FunnelStage label="Sessions with product views" value={funnel.productViewSessions} rate={funnelRate(funnel.productViewSessions, funnel.sessions)} />
        <FunnelStage label="Sessions with add to cart" value={funnel.addToCartSessions} rate={funnelRate(funnel.addToCartSessions, funnel.productViewSessions)} />
        <FunnelStage label="Sessions with checkout start" value={funnel.checkoutStartSessions} rate={funnelRate(funnel.checkoutStartSessions, funnel.addToCartSessions)} />
        <FunnelStage label="Confirmed purchases" value={0} rate={null} unavailable />
      </div>
      <p className="mt-3 text-sm font-medium text-foreground">
        Overall session → checkout-start rate: {funnelRate(funnel.checkoutStartSessions, funnel.sessions) === null ? "—" : percentFormatter.format(funnelRate(funnel.checkoutStartSessions, funnel.sessions)!)}
      </p>
    </section>
  );
}

function ChannelComparison({ rows }: Readonly<{ rows: PaidTrafficChannelComparison[] }>) {
  const byChannel = new Map(rows.map((row) => [row.channel, row]));
  const channels = ["paid_search", "google_shopping", "google_merchant", "organic_search", "direct"] as const;
  return (
    <section className="pt-8" aria-labelledby="channel-comparison-heading">
      <h2 id="channel-comparison-heading" className="text-sm font-semibold uppercase tracking-[0.14em] text-muted">Channel comparison</h2>
      <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-surface shadow-sm">
        <table className="w-full min-w-[52rem] border-collapse text-sm">
          <thead className="border-b border-border bg-surface-muted/60">
            <tr>
              {[
                "Acquisition channel", "Sessions", "Product-view sessions", "Add-to-cart sessions", "Checkout-start sessions", "Session → checkout",
              ].map((label) => <th key={label} scope="col" className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">{label}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {channels.map((channel) => {
              const row = byChannel.get(channel);
              const sessions = row?.sessions ?? 0;
              const checkouts = row?.checkoutStartSessions ?? 0;
              return (
                <tr key={channel}>
                  <td className="px-4 py-3 font-medium text-foreground">{humanise(channel)}</td>
                  <NumberCell value={sessions} />
                  <NumberCell value={row?.productViewSessions ?? 0} />
                  <NumberCell value={row?.addToCartSessions ?? 0} />
                  <NumberCell value={checkouts} />
                  <td className="px-4 py-3 text-right font-medium tabular-nums text-foreground">{sessions ? percentFormatter.format(checkouts / sessions) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs leading-5 text-muted">Google Merchant is shown separately because the current classifier does not treat Merchant traffic as proof of a paid ad click.</p>
    </section>
  );
}

function sessionHref(query: PaidTrafficQuery, sessionId: string | null, page = query.page): string {
  return `/admin/analytics/paid-traffic?${paidTrafficQueryString({ ...query, sessionId, page })}`;
}

function NumberCell({ value }: Readonly<{ value: number }>) {
  return <td className="px-4 py-3 text-right font-medium tabular-nums text-foreground">{numberFormatter.format(value)}</td>;
}

function ActivityCell({ active }: Readonly<{ active: boolean }>) {
  return (
    <td className="whitespace-nowrap px-4 py-3 text-center font-semibold">
      {active ? (
        <span className="text-emerald-600 dark:text-emerald-400"><span aria-hidden="true">✓</span> Yes</span>
      ) : (
        <span className="text-muted" aria-label="No">—</span>
      )}
    </td>
  );
}

function SessionsTable({ data }: Readonly<{ data: PaidTrafficReport }>) {
  if (!data.sessions.length) {
    return <div className="mt-3 rounded-xl border border-border bg-surface px-5 py-10 text-center text-sm text-muted shadow-sm">No sessions match these filters.</div>;
  }
  return (
    <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-surface shadow-sm">
      <table className="w-full min-w-[88rem] border-collapse text-sm">
        <thead className="border-b border-border bg-surface-muted/60">
          <tr>
            {[
              "Session", "Started (UK)", "Acquisition", "Landing page", "UTM source", "UTM medium", "UTM campaign", "Product views", "Added to Cart", "Checkout Started",
            ].map((label) => <th key={label} scope="col" className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">{label}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.sessions.map((session) => (
            <tr key={session.sessionId} className={data.query.sessionId === session.sessionId ? "bg-primary/5" : undefined}>
              <td className="px-4 py-3 font-mono text-xs">
                <Link href={sessionHref(data.query, session.sessionId)} className="text-primary underline-offset-4 hover:underline" title={session.sessionId}>
                  {session.sessionId.slice(0, 8)}…
                </Link>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-muted">{formatAnalyticsTimestamp(session.startedAt)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-muted">{humanise(session.acquisitionChannel)}</td>
              <td className="max-w-xs truncate px-4 py-3 text-muted" title={session.landingPath}>{session.landingPath}</td>
              <td className="px-4 py-3 text-muted">{session.utmSource ?? "—"}</td>
              <td className="px-4 py-3 text-muted">{session.utmMedium ?? "—"}</td>
              <td className="max-w-xs truncate px-4 py-3 text-muted" title={session.utmCampaign ?? undefined}>{session.utmCampaign ?? "—"}</td>
              <NumberCell value={session.productViews} />
              <ActivityCell active={session.addedToCart} />
              <ActivityCell active={session.checkoutStarted} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Pagination({ data }: Readonly<{ data: PaidTrafficReport }>) {
  const previous = data.query.page > 1 ? sessionHref(data.query, null, data.query.page - 1) : null;
  const next = data.query.page < data.totalPages ? sessionHref(data.query, null, data.query.page + 1) : null;
  const buttonClass = "inline-flex min-h-10 items-center rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-surface-muted";
  const disabledClass = `${buttonClass} pointer-events-none opacity-50`;
  return (
    <nav aria-label="Session pagination" className="mt-4 flex flex-wrap items-center justify-between gap-3">
      {previous ? <Link href={previous} className={buttonClass}>Previous</Link> : <span className={disabledClass}>Previous</span>}
      <span className="text-sm text-muted">Page {data.query.page} of {data.totalPages} · {numberFormatter.format(data.totalRows)} sessions</span>
      {next ? <Link href={next} className={buttonClass}>Next</Link> : <span className={disabledClass}>Next</span>}
    </nav>
  );
}

function sessionProductLabel(event: PaidTrafficReport["timeline"][number]): string | null {
  if (event.productHandle) return event.productHandle.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  return event.sku ?? event.variantId ?? event.productId;
}

function SessionTimeline({ data }: Readonly<{ data: PaidTrafficReport }>) {
  if (!data.query.sessionId) return null;
  const session = data.selectedSession;
  return (
    <section className="pt-8" aria-labelledby="session-timeline-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="session-timeline-heading" className="text-sm font-semibold uppercase tracking-[0.14em] text-muted">Session timeline</h2>
          <p className="mt-1 font-mono text-xs text-muted">{data.query.sessionId}</p>
        </div>
        <Link href={sessionHref(data.query, null)} className="inline-flex min-h-10 items-center rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground hover:bg-surface-muted">Close timeline</Link>
      </div>
      {!session ? (
        <div className="mt-3 rounded-xl border border-border bg-surface px-5 py-8 text-sm text-muted shadow-sm">This session is outside the active filters or current page.</div>
      ) : data.timeline.length ? (
        <ol className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
          {data.timeline.map((event) => {
            const product = sessionProductLabel(event);
            return (
              <li key={event.eventId} className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4 sm:px-5">
                <time className="text-xs tabular-nums text-muted">{formatAnalyticsTimestamp(event.occurredAt)}</time>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">{humanise(event.eventName)}</p>
                  <p className="mt-0.5 break-words text-xs text-muted">
                    {[product, event.pagePath, event.sourceSurface ? humanise(event.sourceSurface) : null, event.quantity !== null ? `Quantity ${event.quantity}` : null].filter(Boolean).join(" · ") || "No additional event context"}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="mt-3 rounded-xl border border-border bg-surface px-5 py-8 text-sm text-muted shadow-sm">No events were recorded for this session.</div>
      )}
    </section>
  );
}

export default async function PaidTrafficPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const query = parsePaidTrafficQuery(await searchParams);
  let data: PaidTrafficReport | null = null;
  try {
    data = await getPaidTrafficReport(query);
  } catch {
    // Normal Next development has no Workers binding. Production and vinext
    // resolve ANALYTICS_DB through the Cloudflare runtime.
  }

  return (
    <main className="min-h-[100dvh] px-4 py-5 text-foreground sm:px-6 sm:py-7 lg:px-10 lg:py-9">
      <div className="mx-auto w-full max-w-[100rem]">
        <PaidTrafficFilters data={data} query={query} />
        {data ? (
          <>
            <Funnel data={data} />
            <ChannelComparison rows={data.channelComparison} />
            <section className="pt-8" aria-labelledby="paid-session-heading">
              <h2 id="paid-session-heading" className="text-sm font-semibold uppercase tracking-[0.14em] text-muted">Anonymous session activity</h2>
              <p className="mt-1 text-sm text-muted">Checkout status means checkout was started; completed purchases are not yet reconciled.</p>
              <SessionsTable data={data} />
              <Pagination data={data} />
            </section>
            <SessionTimeline data={data} />
          </>
        ) : (
          <div className="mt-6 rounded-xl border border-border bg-surface p-6 text-sm text-muted shadow-sm">
            The analytics database could not be reached. Try again from the Cloudflare vinext runtime.
          </div>
        )}
      </div>
    </main>
  );
}
