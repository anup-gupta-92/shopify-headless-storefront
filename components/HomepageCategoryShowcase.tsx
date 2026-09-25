"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import ProductCard from "@/components/ProductCard";
import type { ProductSummary } from "@/types/product";

export interface HomepageCategory {
  handle: string;
  title: string;
  description: string;
  image: string;
  href: string;
  products: ProductSummary[];
}

interface HomepageCategoryShowcaseProps {
  categories: HomepageCategory[];
}

export default function HomepageCategoryShowcase({ categories }: HomepageCategoryShowcaseProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeCategory = categories[activeIndex];

  if (!activeCategory) return null;

  function selectCategory(index: number, focus = false) {
    setActiveIndex(index);
    if (focus) tabRefs.current[index]?.focus();
  }

  function handleTabKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number | undefined;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (index + 1) % categories.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (index - 1 + categories.length) % categories.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = categories.length - 1;
    }

    if (nextIndex === undefined) return;
    event.preventDefault();
    selectCategory(nextIndex, true);
  }

  return (
    <>
      <section aria-labelledby="homepage-categories-heading">
        <div className="mb-5 sm:mb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Shop by department</p>
          <h2 id="homepage-categories-heading" className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
            Explore Our Main Categories
          </h2>
        </div>

        <div
          role="tablist"
          aria-label="Main product categories"
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-2 md:gap-4 md:overflow-visible md:pb-0 lg:grid-cols-4"
        >
          {categories.map((category, index) => {
            const isActive = index === activeIndex;

            return (
              <button
                key={category.handle}
                ref={(node) => { tabRefs.current[index] = node; }}
                id={`category-tab-${category.handle}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls="homepage-category-products"
                tabIndex={isActive ? 0 : -1}
                onClick={() => selectCategory(index)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
                className={`group flex w-28 shrink-0 snap-start flex-col overflow-hidden rounded-t-xl rounded-b-none border-x-2 border-b-0 border-t-2 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:w-32 md:w-auto md:flex-row ${
                  isActive
                    ? "border-x-primary border-t-primary bg-primary/5"
                    : "border-x-border border-t-border bg-surface hover:border-x-primary/40 hover:border-t-primary/40 hover:bg-surface-muted"
                }`}
              >
                <span className="relative block aspect-square w-full shrink-0 overflow-hidden bg-surface-muted md:size-28 lg:size-24 xl:size-28">
                  <Image
                    src={category.image}
                    alt={`${category.title} supplies`}
                    fill
                    sizes="(max-width: 639px) 112px, (max-width: 767px) 128px, (max-width: 1279px) 112px, 112px"
                    className="object-cover object-center transition duration-300 group-hover:scale-[1.025]"
                  />
                </span>
                <span className="flex min-h-[4.25rem] flex-1 flex-col justify-center p-2.5 md:min-h-0 md:min-w-0 md:p-3">
                  <span className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold leading-4 text-foreground sm:text-sm sm:leading-5 xl:text-base">{category.title}</span>
                    <span aria-hidden="true" className={`size-2 shrink-0 rounded-full transition ${isActive ? "bg-primary" : "bg-border"}`} />
                  </span>
                  <span className="mt-1.5 hidden text-xs leading-4 text-muted md:block">{category.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section
        id="homepage-category-products"
        role="tabpanel"
        aria-labelledby={`category-tab-${activeCategory.handle}`}
        className="mt-4 sm:mt-5"
      >
        {activeCategory.products.length ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {activeCategory.products.map((product) => (
              <ProductCard
                key={product.id}
                title={product.title}
                price={product.price}
                compareAtPrice={product.compareAtPrice}
                vendor={product.vendor}
                category={product.category}
                available={product.available}
                imageUrl={product.image}
                imageAlt={product.imageAlt}
                handle={product.handle}
                cardAction={product.cardAction}
                reviewRating={product.reviewRating}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-surface px-6 py-12 text-center">
            <h3 className="text-lg font-semibold">No products are available in this category just yet.</h3>
            <p className="mt-2 text-sm text-muted">Browse the full collection for the latest availability.</p>
          </div>
        )}

        <div className="mt-8 flex justify-center">
          <Link
            href={activeCategory.href}
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Shop More {activeCategory.title}
          </Link>
        </div>
      </section>
    </>
  );
}
