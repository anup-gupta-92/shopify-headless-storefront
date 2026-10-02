import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getCollectionByHandle } from "@/lib/shopify/collections";

interface CollectionLayoutProps {
  children: ReactNode;
  params: Promise<{ handle: string }>;
}

export default async function CollectionLayout({ children, params }: CollectionLayoutProps) {
  const { handle } = await params;
  const collection = await getCollectionByHandle(handle);

  if (!collection) notFound();

  return children;
}
