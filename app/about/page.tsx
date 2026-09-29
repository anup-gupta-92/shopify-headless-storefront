import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import SupplyDepartments from "@/components/SupplyDepartments";
import { siteConfig } from "@/config/site";

const description =
  "Learn about Apex Business Supplies, a UK-based supplier of packaging, PPE, abrasives, cleaning and workplace essentials for businesses across the UK.";

export const metadata: Metadata = {
  title: { absolute: "About Apex Business Supplies | UK Business Supplier" },
  description,
  alternates: { canonical: "/about" },
};

const trustPoints = [
  { icon: "dispatch", title: "Same-Day Dispatch", copy: "Orders placed before 3 PM" },
  { icon: "delivery", title: "Free Delivery Over £79", copy: "Simple UK delivery threshold" },
  { icon: "bulk", title: "Bulk Ordering Made Easier", copy: "Order multiple sizes and variants quickly" },
  { icon: "range", title: "Broad Product Range", copy: "Packaging, PPE, abrasives and cleaning essentials in one place" },
  { icon: "secure", title: "Secure Shopify Checkout", copy: "Trusted checkout and payment infrastructure" },
  { icon: "uk", title: "UK-Based Business Supplier", copy: "Reliable support for UK business customers" },
] as const;

const heroTrustPoints = [
  { icon: "dispatch", title: "Same-Day Dispatch", copy: "Orders placed before 3 PM" },
  { icon: "delivery", title: "Free Delivery Over £79", copy: "Straightforward UK delivery threshold" },
  { icon: "bulk", title: "Bulk Ordering Available", copy: "Order multiple sizes and variants with ease" },
  { icon: "secure", title: "Secure Shopify Checkout", copy: "Trusted checkout and payment infrastructure" },
] as const;

const brands = [
  { name: "Sia Abrasives", image: "/images/home/sia-abrasives-logo.png", href: "/collections/sia-abrasives", width: 408, height: 200, padding: "p-6 sm:p-8" },
  { name: "Aurelia", image: "/images/home/aurelia-Logo.png", href: "/collections/aurelia", width: 640, height: 61, padding: "p-7 sm:p-10" },
  { name: "Ultimate Industrial", image: "/images/home/ultimate-industrial-listing-image.webp", href: "/collections/ultimate-industrial", width: 800, height: 450, padding: "p-5 sm:p-7" },
  { name: "Apex Business Supplies", image: "/images/home/apex-rec-logo.webp", href: "/collections/apex-business-supplies", width: 540, height: 298, padding: "p-5 sm:p-7" },
] as const;

const primaryButton =
  "inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-6 py-3 text-center font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const secondaryButton =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-primary px-6 py-3 text-center font-semibold text-primary transition hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

function TrustIcon({ name }: { name: string }) {
  const props = {
    width: 21,
    height: 21,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "delivery") return <svg {...props}><path d="M3 7h11v10H3z" /><path d="M14 10h4l3 3v4h-7z" /><circle cx="7" cy="18" r="2" /><circle cx="18" cy="18" r="2" /></svg>;
  if (name === "bulk") return <svg {...props}><path d="M4 7h16M4 12h16M4 17h10" /><path d="m17 15 3 3-3 3" /></svg>;
  if (name === "range") return <svg {...props}><path d="m4 7 8-4 8 4-8 4z" /><path d="m4 12 8 4 8-4M4 17l8 4 8-4" /></svg>;
  if (name === "secure") return <svg {...props}><path d="M12 3 5 6v5c0 4.6 2.9 8.1 7 10 4.1-1.9 7-5.4 7-10V6z" /><path d="m9 12 2 2 4-4" /></svg>;
  if (name === "uk") return <svg {...props}><path d="M12 21s7-3.5 7-10V5l-7-2-7 2v6c0 6.5 7 10 7 10Z" /><path d="m9 12 2 2 4-4" /></svg>;
  return <svg {...props}><path d="M4 12h12" /><path d="m12 8 4 4-4 4" /><path d="M4 5h16v14H4z" /></svg>;
}

function SocialIcon({ network }: { network: "instagram" | "linkedin" }) {
  const props = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (network === "linkedin") return <svg {...props}><path d="M6 9v9M6 6v.01M10 18v-5a4 4 0 0 1 8 0v5M10 9v9" /></svg>;
  return <svg {...props}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><path d="M17.5 6.5h.01" /></svg>;
}

export default function AboutPage() {
  const aboutPageSchema = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "About Apex Business Supplies",
    description,
    url: new URL("/about", siteConfig.url).toString(),
    about: { "@type": "Organization", name: siteConfig.name, url: siteConfig.url },
  };

  return (
    <main className="min-h-screen bg-background py-8 text-foreground sm:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutPageSchema) }} />
      <div className="site-container">
        <nav aria-label="Breadcrumb" className="mb-8 text-sm text-muted">
          <ol className="flex items-center gap-2">
            <li><Link href="/" className="rounded hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Home</Link></li>
            <li aria-hidden="true">&gt;</li>
            <li aria-current="page">About</li>
          </ol>
        </nav>

        <header className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.9fr)] lg:gap-10 xl:gap-14">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">About Apex</p>
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl min-[100rem]:text-6xl">About Apex Business Supplies</h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-muted">Apex Business Supplies is a UK-based supplier of packaging, PPE, abrasives, cleaning and workplace essentials, helping businesses source practical products with reliable supply and straightforward ordering.</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/shop" className={primaryButton}>Shop Products</Link>
              <Link href="/contact" className={secondaryButton}>Contact Us</Link>
            </div>
          </div>

          <aside aria-label="Apex service highlights" className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6 xl:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">UK Business Supplier</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Practical supplies for everyday business</h2>
            <p className="mt-3 text-sm font-medium leading-6 text-muted">Packaging <span aria-hidden="true">·</span> PPE <span aria-hidden="true">·</span> Abrasives <span aria-hidden="true">·</span> Cleaning</p>
            <ul className="mt-5 space-y-4 border-t border-border pt-5">
              {heroTrustPoints.map((point) => (
                <li key={point.title} className="flex gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><TrustIcon name={point.icon} /></span>
                  <div><h3 className="font-semibold text-foreground">{point.title}</h3><p className="mt-0.5 text-sm leading-5 text-muted">{point.copy}</p></div>
                </li>
              ))}
            </ul>
          </aside>
        </header>

        <section aria-labelledby="who-we-are-heading" className="mt-14 border-t border-border pt-12 sm:mt-16 sm:pt-14">
          <div className="grid items-center gap-8 md:grid-cols-2 md:gap-10 xl:gap-14">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Who We Are</p>
              <h2 id="who-we-are-heading" className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Business supplies that keep everyday operations moving</h2>
              <div className="mt-5 max-w-2xl space-y-4 leading-7 text-muted">
                <p>Apex Business Supplies Ltd supports organisations across the UK with practical products for day-to-day workplace and operational needs.</p>
                <p>Our range includes packaging materials, PPE and safety products, professional abrasives, cleaning products and surface-protection essentials. Alongside our own Apex-branded products, we also supply established specialist brands used across commercial, industrial and everyday workplace environments.</p>
                <p>Whether a customer needs a regular supply of essential products, a single order, or larger quantities across multiple variants, our aim is to make ordering straightforward while maintaining dependable service and competitive value.</p>
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
              <Image src="/images/home/about-home.jpg" alt="Packaging and workplace supplies used in everyday business operations" width={1150} height={1150} sizes="(max-width: 767px) calc(100vw - 2rem), (max-width: 1599px) calc(50vw - 2.75rem), (max-width: 1919px) calc(50vw - 4rem), 840px" className="h-auto w-full" />
            </div>
          </div>
        </section>

        <SupplyDepartments
          heading="What We Supply"
          description="Explore our core ranges for protection, preparation, dispatch and everyday workplace use."
          headingId="departments-heading"
        />

        <section aria-labelledby="why-apex-heading" className="mt-14 border-t border-border pt-12 sm:mt-16 sm:pt-14">
          <h2 id="why-apex-heading" className="text-3xl font-extrabold tracking-tight sm:text-4xl">Why Businesses Choose Apex</h2>
          <ul className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {trustPoints.map((point) => (
              <li key={point.title} className="flex gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><TrustIcon name={point.icon} /></span>
                <div><h3 className="font-semibold text-foreground">{point.title}</h3><p className="mt-1 text-sm leading-5 text-muted">{point.copy}</p></div>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="brands-heading" className="mt-14 border-t border-border pt-12 sm:mt-16 sm:pt-14">
          <div className="max-w-3xl">
            <h2 id="brands-heading" className="text-3xl font-extrabold tracking-tight sm:text-4xl">Brands We Supply</h2>
            <p className="mt-3 leading-7 text-muted">Shop established brands across abrasives, PPE and workplace essentials.</p>
          </div>
          <div className="mt-7 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {brands.map((brand) => (
              <Link key={brand.href} href={brand.href} aria-label={`Shop ${brand.name}`} className="group overflow-hidden rounded-xl border border-border bg-surface transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-primary hover:shadow-md focus-visible:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transform-none motion-reduce:transition-none">
                <span className="relative block aspect-video overflow-hidden bg-white"><span className={`absolute inset-0 ${brand.padding}`}><Image src={brand.image} alt={`${brand.name} logo`} width={brand.width} height={brand.height} sizes="(max-width: 1023px) calc((100vw - 3rem) / 2), (max-width: 1599px) calc((100vw - 6rem) / 4), 420px" className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-[1.02] motion-reduce:transition-none" /></span></span>
                <span className="block border-t border-border px-3 py-3 text-center text-sm font-semibold text-foreground sm:px-4 sm:text-base">{brand.name}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-14 grid gap-6 border-t border-border pt-12 sm:mt-16 sm:pt-14 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)] lg:gap-10">
          <div aria-labelledby="business-details-heading" className="rounded-2xl border border-border bg-surface p-5 sm:p-7">
            <h2 id="business-details-heading" className="text-2xl font-bold sm:text-3xl">Business Details</h2>
            <dl className="mt-6 divide-y divide-border">
              <div className="grid gap-1 py-4 first:pt-0 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-5"><dt className="font-semibold text-foreground">Company</dt><dd className="text-muted">Apex Business Supplies Ltd</dd></div>
              <div className="grid gap-1 py-4 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-5"><dt className="font-semibold text-foreground">VAT Number</dt><dd className="text-muted">GB 425770293</dd></div>
              <div className="grid gap-1 py-4 last:pb-0 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-5">
                <dt className="font-semibold text-foreground">Address</dt>
                <dd className="text-muted"><address className="not-italic">Apex Business Supplies Ltd<br />159 Hospital Street<br />Birmingham<br />B19 3XA<br />United Kingdom</address></dd>
              </div>
            </dl>
          </div>

          <div aria-labelledby="follow-apex-heading" className="rounded-2xl border border-border bg-surface p-5 sm:p-7">
            <h2 id="follow-apex-heading" className="text-2xl font-bold sm:text-3xl">Follow Apex</h2>
            <p className="mt-3 leading-7 text-muted">Follow Apex Business Supplies for product updates, new arrivals and business-supply news.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="https://www.instagram.com/apexbusinesssupplies/" target="_blank" rel="noopener noreferrer" className={secondaryButton} aria-label="Follow Apex Business Supplies on Instagram (opens in a new tab)"><SocialIcon network="instagram" />Instagram</a>
              <a href="https://www.linkedin.com/company/apex-business-supplies/" target="_blank" rel="noopener noreferrer" className={secondaryButton} aria-label="Follow Apex Business Supplies on LinkedIn (opens in a new tab)"><SocialIcon network="linkedin" />LinkedIn</a>
            </div>
          </div>
        </section>

        <section aria-labelledby="about-cta-heading" className="mt-14 rounded-2xl border border-primary/30 bg-primary/10 px-5 py-9 text-center sm:mt-16 sm:px-8 sm:py-10">
          <h2 id="about-cta-heading" className="text-3xl font-extrabold tracking-tight">Need supplies for your business?</h2>
          <p className="mx-auto mt-3 max-w-2xl leading-7 text-muted">Browse our full product range or get in touch if you need help finding the right products for your requirements.</p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/shop" className={primaryButton}>Shop All Products</Link>
            <Link href="/contact" className={secondaryButton}>Contact Apex</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
