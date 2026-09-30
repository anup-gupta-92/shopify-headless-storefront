import "server-only";

import { cache } from "react";
import { storefrontRequest } from "./client";
import { SITEMAP_COLLECTIONS_QUERY, SITEMAP_PRODUCTS_QUERY } from "./queries";
import type { ShopifySitemapResource } from "./types";

const SITEMAP_PAGE_SIZE = 250;

interface SitemapConnection {
  nodes: ShopifySitemapResource[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
}

async function getPaginatedResources(
  query: string,
  connectionName: "products" | "collections",
): Promise<ShopifySitemapResource[]> {
  const resources: ShopifySitemapResource[] = [];
  let after: string | null = null;

  while (true) {
    const data: Record<string, SitemapConnection> = await storefrontRequest<Record<string, SitemapConnection>>(
      query,
      { first: SITEMAP_PAGE_SIZE, after },
      { revalidate: 300, tags: ["shopify-sitemap"] },
    );
    const connection = data[connectionName];
    resources.push(...connection.nodes.filter((resource) => resource.handle.trim()));

    if (!connection.pageInfo.hasNextPage) break;
    const nextCursor = connection.pageInfo.endCursor;
    if (!nextCursor || nextCursor === after) {
      throw new Error(`Shopify ${connectionName} sitemap pagination could not continue`);
    }
    after = nextCursor;
  }

  return resources;
}

export const getSitemapProducts = cache(() => getPaginatedResources(SITEMAP_PRODUCTS_QUERY, "products"));
export const getSitemapCollections = cache(() => getPaginatedResources(SITEMAP_COLLECTIONS_QUERY, "collections"));
