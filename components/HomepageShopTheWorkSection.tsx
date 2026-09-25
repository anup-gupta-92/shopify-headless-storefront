import Link from "next/link";
import InteractiveShopTheWork, { type ShopTheWorkHotspot } from "@/components/InteractiveShopTheWork";
import type { HomepageHotspotProductsResult } from "@/lib/shopify/products";

interface HomepageShopTheWorkSectionProps {
  products: HomepageHotspotProductsResult;
}

const hotspotConfig = [
  {
    key: "mask",
    id: "mask",
    label: "Mask",
    accessibleLabel: "View FFP3 mask",
    x: 58,
    y: 52,
    popoverClassName: "md:right-[4%] md:top-[57%]",
  },
  {
    key: "gloves",
    id: "gloves",
    label: "Gloves",
    accessibleLabel: "View Aurelia Bold gloves",
    x: 22,
    y: 48,
    popoverClassName: "md:left-[27%] md:top-[51%]",
  },
  {
    key: "sandingDisc",
    id: "sanding-disc",
    label: "Sanding disc",
    accessibleLabel: "View Sia sanding disc",
    x: 14,
    y: 31,
    popoverClassName: "md:left-[18%] md:top-[35%]",
  },
] as const;

const trustPoints = [
  {
    icon: "dispatch",
    title: "Same-Day Dispatch",
    text: "Orders placed before 3 PM",
  },
  {
    icon: "delivery",
    title: "Free Delivery Over £79",
    text: "Simple UK delivery threshold",
  },
  {
    icon: "bulk",
    title: "Bulk Ordering Made Easier",
    text: "Order multiple sizes and variants quickly",
  },
  {
    icon: "secure",
    title: "Secure Shopify Checkout",
    text: "Trusted checkout and payment infrastructure",
  },
] as const;

function TrustIcon({ name }: { name: string }) {
  const commonProps = {
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

  if (name === "delivery") {
    return <svg {...commonProps}><path d="M3 7h11v10H3z" /><path d="M14 10h4l3 3v4h-7z" /><circle cx="7" cy="18" r="2" /><circle cx="18" cy="18" r="2" /></svg>;
  }
  if (name === "bulk") {
    return <svg {...commonProps}><path d="M4 7h16M4 12h16M4 17h10" /><path d="m17 15 3 3-3 3" /></svg>;
  }
  if (name === "secure") {
    return <svg {...commonProps}><path d="M12 3 5 6v5c0 4.6 2.9 8.1 7 10 4.1-1.9 7-5.4 7-10V6z" /><path d="m9 12 2 2 4-4" /></svg>;
  }
  return <svg {...commonProps}><path d="M4 12h12" /><path d="m12 8 4 4-4 4" /><path d="M4 5h16v14H4z" /></svg>;
}

export default function HomepageShopTheWorkSection({ products }: HomepageShopTheWorkSectionProps) {
  const hotspots: ShopTheWorkHotspot[] = hotspotConfig.flatMap((hotspot) => {
    const product = products[hotspot.key];
    if (!product) return [];
    return [{
      ...hotspot,
      product: {
        handle: product.handle,
        title: product.title,
        imageUrl: product.featuredImage?.url ?? "",
        imageAlt: product.featuredImage?.altText ?? product.title,
      },
    }];
  });

  return (
    <section aria-labelledby="why-choose-apex-heading" className="mt-14 border-t border-border pt-12 sm:mt-16 sm:pt-14">
      <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(20rem,1fr)] lg:gap-10 xl:gap-14">
        <div aria-label="Shop the Work interactive product image">
          <InteractiveShopTheWork hotspots={hotspots} />
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Why Choose Apex</p>
          <h2 id="why-choose-apex-heading" className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Built for the way businesses work
          </h2>
          <p className="mt-4 max-w-2xl leading-7 text-muted">
            From workplace protection to surface preparation, Apex supplies the everyday products businesses rely on to get the job done.
          </p>

          <ul className="mt-7 grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {trustPoints.map((point) => (
              <li key={point.title} className="flex gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <TrustIcon name={point.icon} />
                </span>
                <div>
                  <h3 className="font-semibold text-foreground">{point.title}</h3>
                  <p className="mt-0.5 text-sm leading-5 text-muted">{point.text}</p>
                </div>
              </li>
            ))}
          </ul>

          <Link
            href="/shop"
            className="mt-8 inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary max-sm:w-full"
          >
            Shop All Products
          </Link>
        </div>
      </div>
    </section>
  );
}
