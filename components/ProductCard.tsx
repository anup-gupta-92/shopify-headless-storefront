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
    <div className="flex h-full flex-col rounded-xl border border-border bg-surface p-6 transition hover:border-primary/50">
        {/* Product Image Box */}
        <div className="relative mb-4 aspect-square w-full overflow-hidden rounded-lg bg-surface-muted">
            <Image 
            src={imageUrl}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, 25vw"
            className="object-cover group-hover/card:scale-105 transition duration-300"
            />
        </div>
      <span className="mb-1 block font-mono text-xs text-muted">{sku}</span>
      <h3 className="mb-1 text-lg font-bold text-foreground">{title}</h3>
      <p className="mt-auto font-medium text-accent">{price}</p>
      
      {/* 2. Change <button> to Next.js <Link> pointing to the dynamic path */}
      <Link 
        href={`/products/${handle}`}
        className="mt-4 block w-full rounded-lg bg-foreground px-4 py-2 text-center text-sm font-semibold text-background transition hover:opacity-90"
      >
        View Product
      </Link>
    </div>
  );
}
