export const SHOP_QUERY = `query ShopConnection { shop { name } }`;

const imageFields = `url altText width height`;
const variantFields = `
  id title sku availableForSale selectedOptions { name value }
  price { amount currencyCode } compareAtPrice { amount currencyCode }
  unitPrice { amount currencyCode }
  unitPriceMeasurement { measuredType quantityUnit quantityValue referenceUnit referenceValue }
`;
const cardVariantFields = `variants(first: 2) { nodes { id availableForSale } }`;

export const HOMEPAGE_PRODUCTS_QUERY = `
  query HomepageProducts($first: Int!) {
    products(first: $first, sortKey: BEST_SELLING) {
      nodes {
        id handle title productType vendor availableForSale
        featuredImage { ${imageFields} }
        priceRange { minVariantPrice { amount currencyCode } maxVariantPrice { amount currencyCode } }
        ${cardVariantFields}
      }
    }
  }
`;

export const PRODUCT_QUERY = `
  query ProductByHandle($handle: String!) {
    product(handle: $handle) {
      id handle title description descriptionHtml productType vendor availableForSale
      featuredImage { ${imageFields} }
      images(first: 15) { nodes { ${imageFields} } }
      collections(first: 20) { nodes { handle title } }
      options { name values }
      priceRange { minVariantPrice { amount currencyCode } maxVariantPrice { amount currencyCode } }
      variants(first: 100) {
        nodes { ${variantFields} }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`;

// Only paginate variants of the requested product, never the entire catalog.
export const PRODUCT_VARIANTS_QUERY = `
  query ProductVariants($handle: String!, $after: String!) {
    product(handle: $handle) {
      variants(first: 100, after: $after) {
        nodes { ${variantFields} }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`;

export const PRODUCT_RECOMMENDATIONS_QUERY = `
  query RelatedProducts($productId: ID!) {
    productRecommendations(productId: $productId, intent: RELATED) {
      id handle title productType vendor availableForSale
      featuredImage { ${imageFields} }
      priceRange { minVariantPrice { amount currencyCode } maxVariantPrice { amount currencyCode } }
      ${cardVariantFields}
    }
  }
`;

export const SHOP_PRODUCTS_QUERY = `
  query ShopProducts(
    $first: Int!
    $after: String
    $sortKey: ProductSortKeys!
    $reverse: Boolean!
    $query: String
  ) {
    products(first: $first, after: $after, sortKey: $sortKey, reverse: $reverse, query: $query) {
      nodes {
        id handle title productType vendor availableForSale
        featuredImage { ${imageFields} }
        priceRange { minVariantPrice { amount currencyCode } maxVariantPrice { amount currencyCode } }
        ${cardVariantFields}
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

export const SHOP_FACETS_QUERY = `
  query ShopFacets($first: Int!, $after: String) {
    products(first: $first, after: $after, sortKey: ID) {
      nodes { id vendor productType availableForSale }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

export const COLLECTION_QUERY = `
  query CollectionByHandle($handle: String!) {
    collection(handle: $handle) {
      id handle title description descriptionHtml
      image { ${imageFields} }
    }
  }
`;

export const COLLECTION_PRODUCTS_QUERY = `
  query CollectionProducts(
    $handle: String!
    $first: Int!
    $after: String
    $sortKey: ProductCollectionSortKeys!
    $reverse: Boolean!
    $filters: [ProductFilter!]
  ) {
    collection(handle: $handle) {
      products(first: $first, after: $after, sortKey: $sortKey, reverse: $reverse, filters: $filters) {
        nodes {
          id handle title productType vendor availableForSale
          featuredImage { ${imageFields} }
          priceRange { minVariantPrice { amount currencyCode } maxVariantPrice { amount currencyCode } }
          ${cardVariantFields}
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`;

export const COLLECTION_FACETS_QUERY = `
  query CollectionFacets($handle: String!, $first: Int!, $after: String) {
    collection(handle: $handle) {
      products(first: $first, after: $after, sortKey: ID) {
        nodes { id vendor availableForSale }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`;
