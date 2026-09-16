import Link from 'next/link';
import Image from 'next/image';

// 1. Add "handle" to the contract so the card knows where to navigate
interface ProductCardProps {
  title: string;
  price: string;
  sku?: string;
  imageAlt?: string;
  handle: string; 
  imageUrl: string;
}

export default function ProductCard({ title, price, sku, handle, imageUrl, imageAlt }: ProductCardProps) {
  return (
    <Link href={`/products/${handle}`} className="group/card flex h-full flex-col rounded-xl border border-border bg-surface p-6 transition hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
        {/* Product Image Box */}
        <div className="relative mb-4 aspect-square w-full overflow-hidden rounded-lg bg-surface-muted">
            {imageUrl ? <Image
            src={imageUrl}
            alt={imageAlt || title}
            fill
            sizes="(max-width: 768px) 100vw, 25vw"
            className="object-cover group-hover/card:scale-105 transition duration-300"
            /> : <div className="flex h-full items-center justify-center text-muted">Image unavailable</div>}
        </div>
      {sku && <span className="mb-1 block font-mono text-xs text-muted">Product Code: {sku}</span>}
      <h3 className="mb-1 text-lg font-bold text-foreground">{title}</h3>
      <p className="mt-auto font-medium text-accent">{price}</p>
      
      <span className="mt-4 block w-full rounded-lg bg-foreground px-4 py-2 text-center text-sm font-semibold text-background">View Product</span>
    </Link>
  );
}
