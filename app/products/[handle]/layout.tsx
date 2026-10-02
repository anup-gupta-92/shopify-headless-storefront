import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getProductByHandle } from "@/lib/shopify/products";

interface ProductLayoutProps {
  children: ReactNode;
  params: Promise<{ handle: string }>;
}

export default async function ProductLayout({ children, params }: ProductLayoutProps) {
  const { handle } = await params;
  const product = await getProductByHandle(handle);

  if (!product) notFound();

  return children;
}
