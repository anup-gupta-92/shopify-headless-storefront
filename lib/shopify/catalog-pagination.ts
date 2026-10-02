interface CursorPage {
  products: unknown[];
  pageInfo: {
    hasNextPage: boolean;
    endCursor: string | null;
  };
}

type PageParam = string | string[] | undefined;

export function parseCatalogPageNumber(value: PageParam): number | null {
  if (value === undefined) return 1;
  if (Array.isArray(value) || !/^[1-9]\d*$/.test(value)) return null;

  const page = Number(value);
  return Number.isSafeInteger(page) ? page : null;
}

export async function resolveCatalogPage<TPage extends CursorPage>(
  pageNumber: number,
  fetchPage: (after?: string) => Promise<TPage | null>,
): Promise<TPage | null> {
  let page = await fetchPage();
  if (!page || !page.products.length) return pageNumber === 1 ? page : null;

  for (let currentPage = 2; currentPage <= pageNumber; currentPage += 1) {
    if (!page.pageInfo.hasNextPage || !page.pageInfo.endCursor) return null;
    page = await fetchPage(page.pageInfo.endCursor);
    if (!page?.products.length) return null;
  }

  return page;
}

export function catalogPaginationHref(basePath: string, queryString: string, pageNumber: number): string {
  const params = new URLSearchParams(queryString);
  params.delete("cursor");
  params.delete("page");
  // Availability is an invariant of the public catalogue, not a user-selected facet.
  params.delete("filter.v.availability");
  if (pageNumber > 1) params.set("page", String(pageNumber));

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function hasCatalogSeoFilters(queryString: string): boolean {
  const params = new URLSearchParams(queryString);
  params.delete("cursor");
  params.delete("page");
  params.delete("filter.v.availability");
  return params.size > 0;
}
