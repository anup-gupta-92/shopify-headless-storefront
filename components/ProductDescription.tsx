import "server-only";
import { Suspense } from "react";
import ProductCodeDetails, { type ProductCodeVariant } from "@/components/ProductCodeDetails";
import ShopifyRichText from "@/components/ShopifyRichText";

export default function ProductDescription({
  html,
  text,
  variants,
  defaultVariantId,
  productCode,
}: {
  html?: string;
  text: string;
  variants: ProductCodeVariant[];
  defaultVariantId?: string;
  productCode?: string;
}) {
  const hasDescription = Boolean(html?.trim() || text.trim());
  const hasProductCode = Boolean(productCode || variants.some((variant) => variant.productCode));
  if (!hasDescription && !hasProductCode) return null;

  return (
    <section
      className="mt-12 min-w-0 border-y border-border py-8"
      aria-labelledby="product-description"
    >
      <h2
        id="product-description"
        className="mb-5 text-xl font-bold"
      >
        Product Description
      </h2>

      <Suspense fallback={null}>
        <ProductCodeDetails
          variants={variants}
          defaultVariantId={defaultVariantId}
          fallbackProductCode={productCode}
        />
      </Suspense>
      {hasDescription && <ShopifyRichText html={html} text={text} />}
    </section>
  );
}
