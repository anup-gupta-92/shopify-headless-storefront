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
      <div className="p-10 font-sans text-white max-w-xl">
        <h1 className="text-3xl font-bold text-red-500">Product Not Found</h1>
        <p className="mt-2 text-zinc-400">Sorry, the product "{handle}" does not exist in our inventory.</p>
      </div>
    );
  }

  // 4. Filter out the current item to suggest other catalog pieces as relative choices
  const relatedProducts = Object.entries(productsDatabase)
    .filter(([key]) => key !== handle)
    .slice(0, 2) // Just grab the first two remaining elements for display
    .map(([key, value]) => ({ handle: key, ...value }));

  return (
    <main className="min-h-screen bg-black text-white p-6 md:p-12 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* Split Layout: Image Left, Details Right */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
          
          {/* Left Column: Image Container with aspect box ratio */}
          <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800">
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
            <span className="text-sm text-blue-400 font-mono font-bold uppercase tracking-wider">
              {product.category} • SKU: {product.sku}
            </span>
            
            <h1 className="mt-2 text-3xl md:text-5xl font-extrabold tracking-tight">
              {product.title}
            </h1>
            
            <p className="mt-4 text-3xl font-bold text-emerald-400">
              {product.price}
            </p>
            
            <hr className="my-6 border-zinc-850" />
            
            <h2 className="text-xs text-zinc-400 font-bold uppercase tracking-widest mb-2">Overview</h2>
            <p className="text-zinc-300 leading-relaxed text-lg">
              {product.description}
            </p>

            <button className="mt-8 bg-white text-black font-bold py-3 px-6 rounded-xl hover:bg-zinc-200 transition text-center shadow-lg shadow-white/5">
              Add to Cart
            </button>
          </div>
        </div>

        {/* Dynamic Related Section */}
        <div className="mt-16 pt-10 border-t border-zinc-900">
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