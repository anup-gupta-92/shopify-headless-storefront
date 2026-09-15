export const SHOP_QUERY = `query ShopConnection { shop { name } }`;

const imageFields = `url altText width height`;
const variantFields = `
  id title sku availableForSale selectedOptions { name value }
  price { amount currencyCode } compareAtPrice { amount currencyCode }
  unitPrice { amount currencyCode }
  unitPriceMeasurement { measuredType quantityUnit quantityValue referenceUnit referenceValue }
`;

export const HOMEPAGE_PRODUCTS_QUERY = `
  query HomepageProducts($first: Int!) {
    products(first: $first, sortKey: BEST_SELLING) {
      nodes {
        id handle title productType availableForSale
        featuredImage { ${imageFields} }
        priceRange { minVariantPrice { amount currencyCode } maxVariantPrice { amount currencyCode } }
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
      id handle title productType availableForSale
      featuredImage { ${imageFields} }
      priceRange { minVariantPrice { amount currencyCode } maxVariantPrice { amount currencyCode } }
    }
  }
`;
