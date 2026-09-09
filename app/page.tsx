import fs from 'fs';
import path from 'path';
import ProductCarousel from '../components/ProductCarousel';
import { siteConfig } from '@/config/site';

// 1. Interface matching our data/products.json structure
interface ProductItem {
  title: string;
  price: string;
  description: string;
  sku: string;
  image: string;
  category: string;
}

export default async function HomePage() {
  // 2. Read the products.json file using Node's File System (fs) securely on the server
  const filePath = path.join(process.cwd(), 'data', 'products.json');
  const fileData = fs.readFileSync(filePath, 'utf8');
  const productsData: Record<string, ProductItem> = JSON.parse(fileData);

  // 3. Convert the dictionary object into an array so our carousel can map over it
  const productsArray = Object.entries(productsData).map(([handle, details]) => ({
    handle,
    ...details,
  }));

  return (
    <main className="min-h-screen bg-background p-6 text-foreground sm:p-10">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10">
          <span className="text-sm font-bold tracking-widest text-primary uppercase">{siteConfig.shortName} Inventory</span>
          <h1 className="text-4xl font-extrabold tracking-tight mt-1">Featured Packing Supplies</h1>
          <p className="text-muted mt-2">Premium industrial grade logistics and moving gear.</p>
        </header>

        {/* 4. Render our reusable slider and pass the array down */}
        <ProductCarousel products={productsArray} />
      </div>
    </main>
  );
}
