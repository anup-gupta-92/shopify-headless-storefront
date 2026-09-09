import fs from 'fs';
import path from 'path';
import Image from 'next/image';
import ProductCard from '@/components/ProductCard'; // Adjusted path to pull from sibling folder

interface ProductPageProps {
  params: Promise<{
    handle: string;
  }>;
}

// 1. Updated interface to match your new products.json schema perfectly
interface ProductData {
  title: string;
  price: string;
  description: string;
  sku: string;
  image: string;
  category: string;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { handle } = await params;

  // 2. Read the centralized database file securely on the server side
  const filePath = path.join(process.cwd(), 'data', 'products.json');
  const fileData = fs.readFileSync(filePath, 'utf8');
  const productsDatabase: Record<string, ProductData> = JSON.parse(fileData);

  // 3. Look up the specific item by its dynamic URL key
  const product = productsDatabase[handle];

  if (!product) {
    return (
      <div className="max-w-xl p-10 text-foreground">
        <h1 className="text-3xl font-bold text-red-500">Product Not Found</h1>
        <p className="mt-2 text-muted">Sorry, the product &quot;{handle}&quot; does not exist in our inventory.</p>
      </div>
    );
  }

  // 4. Filter out the current item to suggest other catalog pieces as relative choices
  const relatedProducts = Object.entries(productsDatabase)
    .filter(([key]) => key !== handle)
    .slice(0, 2) // Just grab the first two remaining elements for display
    .map(([key, value]) => ({ handle: key, ...value }));

  return (
    <main className="min-h-screen bg-background p-6 text-foreground md:p-12">
      <div className="max-w-6xl mx-auto">
        
        {/* Split Layout: Image Left, Details Right */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
          
          {/* Left Column: Image Container with aspect box ratio */}
          <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-border bg-surface">
            <Image
              src={product.image}
              alt={product.title}
              fill
              priority // Forces rapid pre-loading for the main LCP hero visual element
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          </div>

          {/* Right Column: Product Core Details */}
          <div className="flex flex-col h-full justify-center">
            <span className="text-sm text-primary font-mono font-bold uppercase tracking-wider">
              {product.category} • SKU: {product.sku}
            </span>
            
            <h1 className="mt-2 text-3xl md:text-5xl font-extrabold tracking-tight">
              {product.title}
            </h1>
            
            <p className="mt-4 text-3xl font-bold text-accent">
              {product.price}
            </p>
            
            <hr className="my-6 border-border" />
            
            <h2 className="text-xs text-muted font-bold uppercase tracking-widest mb-2">Overview</h2>
            <p className="text-muted leading-relaxed text-lg">
              {product.description}
            </p>

            <button
              type="button"
              disabled
              title="Cart functionality is coming soon"
              className="mt-8 cursor-not-allowed rounded-xl bg-surface-muted px-6 py-3 text-center font-bold text-muted"
            >
              Cart coming soon
            </button>
          </div>
        </div>

        {/* Dynamic Related Section */}
        <div className="mt-16 border-t border-border pt-10">
          <h2 className="text-2xl font-bold mb-6">Frequently Bought Together</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
            {relatedProducts.map((related) => (
              <ProductCard
                key={related.handle}
                title={related.title}
                price={related.price}
                imageUrl={related.image}
                sku={related.sku}
                handle={related.handle} 
              />
            ))}
          </div>
        </div>

      </div>
    </main>
  );
}
