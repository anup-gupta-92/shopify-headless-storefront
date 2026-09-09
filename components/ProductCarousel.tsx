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
        <h2 className="text-xl font-bold text-zinc-300">Top Selling Products</h2>
        <div className="flex space-x-2">
          <button 
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ←
          </button>
          <button 
            onClick={handleNext}
            disabled={currentIndex === maxIndex}
            className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
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
              <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 flex flex-col h-full hover:border-zinc-800 transition group/card">
                {/* Product Image Box */}
                <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-zinc-900 mb-4">
                  <Image 
                    src={product.image}
                    alt={product.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 25vw"
                    className="object-cover group-hover/card:scale-105 transition duration-300"
                  />
                </div>

                {/* Info */}
                <span className="text-xs font-mono text-zinc-500 block">{product.category}</span>
                <h3 className="text-base font-bold text-white mt-1 line-clamp-1 group-hover/card:text-blue-400 transition">
                  {product.title}
                </h3>
                <p className="text-sm text-emerald-400 font-semibold mt-auto pt-3">
                  {product.price}
                </p>

                {/* Dynamic Route Navigation */}
                <Link 
                  href={`/products/${product.handle}`}
                  className="mt-3 block w-full bg-zinc-900 text-white text-center font-medium py-2 rounded-lg text-xs hover:bg-zinc-800 transition"
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