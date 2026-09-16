import { getProductByHandle, getProductRecommendations } from '@/lib/shopify/products';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import ProductGallery from '@/components/ProductGallery';
import ProductDescription from '@/components/ProductDescription';
import ProductCard from '@/components/ProductCard';
import Link from 'next/link';
import ProductInformation from '@/components/ProductInformation';

interface ProductPageProps {
  params: Promise<{
    handle: string;
  }>;
}


export default async function ProductPage({ params }: ProductPageProps) {
  const { handle } = await params;

  const product = await getProductByHandle(handle);
  if (!product) notFound();
  const recommendations = product.id ? await getProductRecommendations(product.id) : [];
  const images = [...new Map([
    ...(product.image ? [{ url: product.image, altText: product.imageAlt || product.title, width: null, height: null }] : []),
    ...(product.images ?? []),
  ].map((image) => [image.url, image])).values()];

  return (
    <main className="min-h-screen bg-background py-8 text-foreground md:py-12">
      <div className="site-container">
        
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted">
          <ol className="flex flex-wrap items-center gap-2">
            <li><Link href="/" className="rounded hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary">Home</Link></li>
            <li aria-hidden="true">&gt;</li>
            <li aria-current="page" className="min-w-0 break-words">{product.title}</li>
          </ol>
        </nav>
        {/* Split Layout: Image Left, Details Right */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
          
          <ProductGallery key={handle} images={images} title={product.title} />
          <Suspense fallback={<p className="text-muted">Loading product options…</p>}>
            <ProductInformation key={handle} product={product} />
          </Suspense>
        </div>

        <ProductDescription html={product.descriptionHtml} text={product.description} />
        {recommendations.length > 0 && <section className="mt-12" aria-labelledby="recommendations">
          <h2 id="recommendations" className="mb-6 text-2xl font-bold">You May Also Like</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recommendations.map((related) => <ProductCard key={related.id} title={related.title} price={related.price} vendor={related.vendor} category={related.category} available={related.available} imageUrl={related.image} imageAlt={related.imageAlt} handle={related.handle} cardAction={related.cardAction} />)}
          </div>
        </section>}
      </div>
    </main>
  );
}
