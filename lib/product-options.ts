import type { ProductVariant } from "@/types/product";

export function resolveVariant(variants: ProductVariant[], selections: Record<string, string>) {
  return variants.find((variant) => variant.selectedOptions?.length && variant.selectedOptions.every(({ name, value }) => selections[name] === value));
}

export function variantUrlId(id: string) {
  return id.startsWith("gid://shopify/ProductVariant/") ? id.split("/").pop()! : id;
}
