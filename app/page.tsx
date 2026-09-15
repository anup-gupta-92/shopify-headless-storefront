import { getHomepageProducts } from '@/lib/shopify/products';
import ProductCarousel from '../components/ProductCarousel';
import { siteConfig } from '@/config/site';

export default async function HomePage() {
  const productsArray = await getHomepageProducts();

  return (
    <main className="min-h-screen bg-background p-6 text-foreground sm:p-10">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10">
          <span className="text-sm font-bold tracking-widest text-primary uppercase">{siteConfig.shortName} Inventory</span>
          <h1 className="text-4xl font-extrabold tracking-tight mt-1">Featured Packing Supplies</h1>
          <p className="text-muted mt-2">Premium industrial grade logistics and moving gear.</p>
        </header>

        {/* 4. Render our reusable slider and pass the array down */}
        {productsArray.length ? <ProductCarousel products={productsArray} /> : <p className="text-muted">No products are available just yet. Please check back soon.</p>}
      </div>
    </main>
  );
}
