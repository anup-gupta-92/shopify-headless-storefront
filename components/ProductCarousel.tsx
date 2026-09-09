"use client";

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface ProductCardData {
  handle: string;
  title: string;
  price: string;
  sku: string;
  image: string;
  category: string;
}

interface ProductCarouselProps {
  products: ProductCardData[];
}

export default function ProductCarousel({ products }: ProductCarouselProps) {
  // Track the sliding window starting index
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Show 4 items on large screens, fallback for safety
  const itemsPerPage = 4;
  const maxIndex = Math.max(0, products.length - itemsPerPage);

  const handlePrev = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => Math.min(maxIndex, prev + 1));
  };

  return (
    <div className="relative group">
      {/* Slider Controls Container */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-foreground">Top Selling Products</h2>
        <div className="flex space-x-2">
          <button 
            onClick={handlePrev}
            disabled={currentIndex === 0}
            aria-label="Show previous products"
            className="rounded-lg border border-border bg-surface p-2 transition hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            ←
          </button>
          <button 
            onClick={handleNext}
            disabled={currentIndex === maxIndex}
            aria-label="Show next products"
            className="rounded-lg border border-border bg-surface p-2 transition hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            →
          </button>
        </div>
      </div>

      {/* Carousel Window Mask */}
      <div className="overflow-hidden rounded-xl">
        <div 
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${currentIndex * 25}%)` }} // Moves viewport by exactly 1 card slot size (25% when displaying 4 items)
        >
          {products.map((product) => (
            <div 
              key={product.handle} 
              className="w-full sm:w-1/2 md:w-1/3 lg:w-1/4 flex-shrink-0 p-2"
            >
              <div className="group/card flex h-full flex-col rounded-xl border border-border bg-surface p-4 transition hover:border-primary/50">
                {/* Product Image Box */}
                <div className="relative mb-4 aspect-square w-full overflow-hidden rounded-lg bg-surface-muted">
                  <Image 
                    src={product.image}
                    alt={product.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 25vw"
                    className="object-cover group-hover/card:scale-105 transition duration-300"
                  />
                </div>

                {/* Info */}
                <span className="block font-mono text-xs text-muted">{product.category}</span>
                <h3 className="mt-1 line-clamp-1 text-base font-bold text-foreground transition group-hover/card:text-primary">
                  {product.title}
                </h3>
                <p className="mt-auto pt-3 text-sm font-semibold text-accent">
                  {product.price}
                </p>

                {/* Dynamic Route Navigation */}
                <Link 
                  href={`/products/${product.handle}`}
                  className="mt-3 block w-full rounded-lg bg-surface-muted py-2 text-center text-xs font-medium text-foreground transition hover:bg-border"
                >
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
