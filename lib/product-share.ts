export function buildProductShareUrl(canonicalUrl: string, variant?: string): string {
  const url = new URL(canonicalUrl);
  url.search = "";
  url.hash = "";
  if (variant?.trim()) url.searchParams.set("variant", variant.trim());
  return url.toString();
}
