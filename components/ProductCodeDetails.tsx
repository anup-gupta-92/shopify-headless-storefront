"use client";

import { useSearchParams } from "next/navigation";
import { variantUrlId } from "@/lib/product-options";

export interface ProductCodeVariant {
  id: string;
  available?: boolean;
  productCode?: string;
}

export default function ProductCodeDetails({
  variants,
  defaultVariantId,
  fallbackProductCode,
}: {
  variants: ProductCodeVariant[];
  defaultVariantId?: string;
  fallbackProductCode?: string;
}) {
  const searchParams = useSearchParams();
  const requestedId = searchParams.get("variant");
  const selectedVariant = variants.find((variant) =>
    variantUrlId(variant.id) === requestedId || variant.id === requestedId,
  ) ?? variants.find((variant) => variant.available !== false)
    ?? variants.find((variant) => variant.id === defaultVariantId)
    ?? variants[0];
  const productCode = selectedVariant?.productCode ?? fallbackProductCode;

  if (!productCode) return null;

  return (
    <dl className="mb-5 border-b border-border pb-5 text-sm">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <dt className="font-semibold text-foreground">Product Code</dt>
        <dd className="break-all font-mono text-muted">{productCode}</dd>
      </div>
    </dl>
  );
}
