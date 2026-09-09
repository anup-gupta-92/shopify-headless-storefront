import Link from 'next/link';
import Image from 'next/image';

// 1. Add "handle" to the contract so the card knows where to navigate
interface ProductCardProps {
  title: string;
  price: string;
  sku: string;
  handle: string; 
  imageUrl: string;
}

export default function ProductCard({ title, price, sku, handle, imageUrl }: ProductCardProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 transition hover:border-zinc-700 flex flex-col h-full">
        {/* Product Image Box */}
        <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-zinc-900 mb-4">
            <Image 
            src={imageUrl}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, 25vw"
            className="object-cover group-hover/card:scale-105 transition duration-300"
            />
        </div>
      <span className="text-xs text-zinc-500 font-mono block mb-1">{sku}</span>
      <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
      <p className="text-emerald-400 font-medium mt-auto">{price}</p>
      
      {/* 2. Change <button> to Next.js <Link> pointing to the dynamic path */}
      <Link 
        href={`/products/${handle}`}
        className="mt-4 w-full bg-white text-black font-semibold py-2 px-4 rounded-lg text-sm hover:bg-zinc-200 transition text-center block"
      >
        View Product
      </Link>
    </div>
  );
}