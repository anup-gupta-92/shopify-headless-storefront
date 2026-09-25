import Image from "next/image";
import Link from "next/link";
import HomepageAboutSection from "@/components/HomepageAboutSection";
import HomepageBrandsSection from "@/components/HomepageBrandsSection";
import HomepageCategoryShowcase, { type HomepageCategory } from "@/components/HomepageCategoryShowcase";
import HomepageShopTheWorkSection from "@/components/HomepageShopTheWorkSection";
import ProductCarousel from "@/components/ProductCarousel";
import { getHomepageCollectionProducts } from "@/lib/shopify/collections";
import { getHomepageHotspotProducts, getHomepageProducts } from "@/lib/shopify/products";

const homepageCategories = [
  {
    handle: "safety-gear",
    title: "PPE Gear",
    description: "Masks, gloves and workplace protection",
    image: "/images/home/ppe-gear.jpg",
    href: "/collections/safety-gear",
  },
  {
    handle: "packaging-supplies",
    title: "Packaging Supplies",
    description: "Mailing, boxes, tapes and shipping essentials",
    image: "/images/home/packaging-supplies.jpg",
    href: "/collections/packaging-supplies",
  },
  {
    handle: "abrasives",
    title: "Abrasives",
    description: "Professional sanding and surface preparation",
    image: "/images/home/abrasives.jpg",
    href: "/collections/abrasives",
  },
  {
    handle: "protection-cleaning",
    title: "Surface Protection & Cleaning",
    description: "Cloths, waxes and cleaning essentials",
    image: "/images/home/surface-protection-cleaning.jpg",
    href: "/collections/protection-cleaning",
  },
] as const;

export default async function HomePage() {
  const [productSets, hotspotProducts, bestSellers] = await Promise.all([
    Promise.all(homepageCategories.map((category) => getHomepageCollectionProducts(category.handle))),
    getHomepageHotspotProducts(),
    getHomepageProducts(),
  ]);
  const categories: HomepageCategory[] = homepageCategories.map((category, index) => ({
    ...category,
    products: productSets[index] ?? [],
  }));

  return (
    <main className="min-h-screen bg-background pb-14 pt-5 text-foreground sm:pb-16 sm:pt-8">
      <div className="site-container">
        <h1 className="sr-only">Business Supplies for Packaging, PPE, Abrasives &amp; Cleaning</h1>

        <section aria-label="Apex Business Supplies overview">
          <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
            <Image
              src="/images/home/homepage_banner.jpg"
              alt="Everything Your Business Needs from Apex Business Supplies, including PPE, packaging, abrasives and cleaning essentials"
              width={1672}
              height={825}
              sizes="(max-width: 639px) calc(100vw - 2rem), (max-width: 1439px) calc(100vw - 3rem), 1440px"
              preload
              className="h-auto w-full"
            />
          </div>
        </section>

        <div className="mt-12 sm:mt-16">
          <HomepageCategoryShowcase categories={categories} />
        </div>

        <HomepageShopTheWorkSection products={hotspotProducts} />

        <section aria-label="Best sellers" className="mt-14 border-t border-border pt-12 sm:mt-16 sm:pt-14">
          {bestSellers.length ? (
            <ProductCarousel
              products={bestSellers}
              eyebrow="Best Sellers"
              heading="Popular Products"
              description="Shop some of our most popular business essentials."
            />
          ) : (
            <p className="text-muted">Our best sellers are temporarily unavailable.</p>
          )}
          <div className="mt-8 flex justify-center">
            <Link
              href="/shop"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Shop All Products
            </Link>
          </div>
        </section>

        <HomepageAboutSection />
        <HomepageBrandsSection />
      </div>
    </main>
  );
}
