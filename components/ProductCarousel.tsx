"use client";

import { useEffect, useRef, useState } from 'react';
import ProductCard from '@/components/ProductCard';
import type { ProductSummary } from '@/types/product';

interface ProductCarouselProps {
  products: ProductSummary[];
}

export default function ProductCarousel({ products }: ProductCarouselProps) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const currentIndexRef = useRef(0);
  // Track the first visible product in the carousel.
  const [currentIndex, setCurrentIndex] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(4);

  // Match the responsive card widths below:
  // mobile = 1, sm = 2, md = 3, lg = 4 and wide desktop = 5 products.
  useEffect(() => {
    const updateItemsPerPage = () => {
      const width = window.innerWidth;

      if (width >= 1536) {
        setItemsPerPage(5);
      } else if (width >= 1024) {
        setItemsPerPage(4);
      } else if (width >= 768) {
        setItemsPerPage(3);
      } else if (width >= 640) {
        setItemsPerPage(2);
      } else {
        setItemsPerPage(1);
      }
    };

    updateItemsPerPage();
    window.addEventListener('resize', updateItemsPerPage);

    return () => window.removeEventListener('resize', updateItemsPerPage);
  }, []);

  const maxIndex = Math.max(0, products.length - itemsPerPage);
  const visibleIndex = Math.min(currentIndex, maxIndex);

  // Keep the visible card aligned when crossing responsive breakpoints.
  useEffect(() => {
    const nextMaxIndex = Math.max(0, products.length - itemsPerPage);
    const nextIndex = Math.min(currentIndexRef.current, nextMaxIndex);
    const carousel = carouselRef.current;
    if (carousel) {
      carousel.scrollTo({
        left: nextIndex * (carousel.clientWidth / itemsPerPage),
      });
    }
  }, [itemsPerPage, products.length]);

  const scrollToIndex = (index: number) => {
    const nextIndex = Math.max(0, Math.min(maxIndex, index));
    const carousel = carouselRef.current;

    currentIndexRef.current = nextIndex;
    setCurrentIndex(nextIndex);
    carousel?.scrollTo({
      left: nextIndex * (carousel.clientWidth / itemsPerPage),
      behavior: 'smooth',
    });
  };

  const handlePrev = () => {
    scrollToIndex(visibleIndex - 1);
  };

  const handleNext = () => {
    scrollToIndex(visibleIndex + 1);
  };

  const handleScroll = () => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    const cardWidth = carousel.clientWidth / itemsPerPage;
    if (cardWidth === 0) return;

    const nextIndex = Math.min(maxIndex, Math.round(carousel.scrollLeft / cardWidth));
    currentIndexRef.current = nextIndex;
    setCurrentIndex(nextIndex);
  };

  return (
    <div className="relative group">
      {/* Slider Controls Container */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-foreground">Top Selling Products</h2>
        <div className="hidden space-x-2 lg:flex">
          <button 
            onClick={handlePrev}
            disabled={visibleIndex === 0}
            aria-label="Show previous products"
            className="rounded-lg border border-border bg-surface p-2 transition hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            ←
          </button>
          <button 
            onClick={handleNext}
            disabled={visibleIndex === maxIndex}
            aria-label="Show next products"
            className="rounded-lg border border-border bg-surface p-2 transition hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            →
          </button>
        </div>
      </div>

      {/* Native scrolling provides touch swiping and is also controlled by the desktop arrows. */}
      <div
        ref={carouselRef}
        onScroll={handleScroll}
        className="touch-auto snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-xl scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex">
          {products.map((product) => (
            <div 
              key={product.id}
              className="w-full flex-shrink-0 snap-start p-2 [scroll-snap-stop:always] sm:w-1/2 md:w-1/3 lg:w-1/4 2xl:w-1/5"
            >
              <ProductCard
                title={product.title}
                price={product.price}
                vendor={product.vendor}
                category={product.category}
                available={product.available}
                imageUrl={product.image}
                imageAlt={product.imageAlt}
                handle={product.handle}
                cardAction={product.cardAction}
                reviewRating={product.reviewRating}
              />
            </div>
          ))}
        </div>
      </div>
      {maxIndex > 0 && <div className="mt-3 flex justify-center lg:hidden">
        <div className="flex max-w-full items-center rounded-full border border-border bg-surface px-1.5 py-1" aria-label="Choose carousel position">
          {Array.from({ length: maxIndex + 1 }, (_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => scrollToIndex(index)}
              aria-label={`Show product position ${index + 1} of ${maxIndex + 1}`}
              aria-current={visibleIndex === index ? "true" : undefined}
              className="flex size-4 shrink-0 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
            >
              <span className={`h-1.5 rounded-full transition-all ${visibleIndex === index ? "w-3 bg-primary" : "w-1.5 bg-border"}`} />
            </button>
          ))}
        </div>
      </div>}
    </div>
  );
}
