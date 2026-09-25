import Image from "next/image";
import Link from "next/link";

const brands = [
  {
    name: "Sia Abrasives",
    href: "/collections/sia-abrasives",
    image: "/images/home/sia-abrasives-logo.png",
    imageWidth: 408,
    imageHeight: 200,
    imageClassName: "p-6 sm:p-8",
  },
  {
    name: "Aurelia",
    href: "/collections/aurelia",
    image: "/images/home/aurelia-Logo.png",
    imageWidth: 640,
    imageHeight: 61,
    imageClassName: "p-7 sm:p-10",
  },
  {
    name: "Ultimate Industrial",
    href: "/collections/ultimate-industrial",
    image: "/images/home/ultimate-industrial-listing-image.webp",
    imageWidth: 800,
    imageHeight: 450,
    imageClassName: "p-5 sm:p-7",
  },
  {
    name: "Apex Business Supplies",
    href: "/collections/apex-business-supplies",
    image: "/images/home/apex-rec-logo.webp",
    imageWidth: 540,
    imageHeight: 298,
    imageClassName: "p-5 sm:p-7",
  },
] as const;

export default function HomepageBrandsSection() {
  return (
    <section aria-labelledby="brands-heading" className="mt-14 border-t border-border pt-12 sm:mt-16 sm:pt-14">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Brands We Supply</p>
        <h2 id="brands-heading" className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Trusted brands for professional work
        </h2>
        <p className="mt-3 leading-7 text-muted">Shop established brands across abrasives, PPE and workplace essentials.</p>
      </div>

      <div className="mt-7 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
        {brands.map((brand) => (
          <Link
            key={brand.name}
            href={brand.href}
            aria-label={`Shop ${brand.name}`}
            className="group overflow-hidden rounded-xl border border-border bg-surface transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-primary hover:shadow-md focus-visible:-translate-y-0.5 focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transform-none motion-reduce:transition-none"
          >
            <span className="relative block aspect-video overflow-hidden bg-white">
              <span className={`absolute inset-0 ${brand.imageClassName}`}>
                <Image
                  src={brand.image}
                  alt={`${brand.name} logo`}
                  width={brand.imageWidth}
                  height={brand.imageHeight}
                  sizes="(max-width: 1023px) calc((100vw - 3rem) / 2), (max-width: 1439px) calc((100vw - 6rem) / 4), 360px"
                  className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-[1.02] group-focus-visible:scale-[1.02] motion-reduce:transform-none motion-reduce:transition-none"
                />
              </span>
            </span>
            <span className="block border-t border-border px-3 py-3 text-center text-sm font-semibold text-foreground sm:px-4 sm:text-base">
              {brand.name}
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-8 flex justify-center">
        <Link
          href="/shop"
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Shop All Products
        </Link>
      </div>
    </section>
  );
}
