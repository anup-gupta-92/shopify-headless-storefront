export const SHOP_QUERY = `query ShopConnection { shop { name } }`;

export const SHOP_POLICIES_QUERY = `
  query ShopPolicies {
    shop {
      termsOfService { handle title body url }
      refundPolicy { handle title body url }
      privacyPolicy { handle title body url }
      shippingPolicy { handle title body url }
    }
  }
`;

const imageFields = `url altText width height`;
const variantFields = `
  id title sku availableForSale currentlyNotInStock selectedOptions { name value }
  quantityRule { minimum maximum increment }
  price { amount currencyCode } compareAtPrice { amount currencyCode }
  unitPrice { amount currencyCode }
  unitPriceMeasurement { measuredType quantityUnit quantityValue referenceUnit referenceValue }
  sellingPlanAllocations(first: 50) {
    nodes {
      sellingPlan {
        id name description
        options { name value }
      }
      priceAdjustments {
        price { amount currencyCode }
        compareAtPrice { amount currencyCode }
        perDeliveryPrice { amount currencyCode }
      }
    }
  }
`;
const cardVariantFields = `variants(first: 250) {
  nodes {
    id availableForSale
    price { amount currencyCode }
    compareAtPrice { amount currencyCode }
  }
  pageInfo { hasNextPage endCursor }
}`;
const predictiveVariantFields = `variants(first: 2) {
  nodes {
    id availableForSale
    price { amount currencyCode }
    compareAtPrice { amount currencyCode }
  }
  pageInfo { hasNextPage endCursor }
}`;
const reviewFields = `reviewRating: metafield(namespace: "reviews", key: "rating") { value }
  reviewCount: metafield(namespace: "reviews", key: "rating_count") { value }`;

export const HOMEPAGE_PRODUCTS_QUERY = `
  query HomepageProducts($first: Int!) {
    products(first: $first, sortKey: BEST_SELLING) {
      nodes {
        id handle title productType vendor availableForSale
        featuredImage { ${imageFields} }
        priceRange { minVariantPrice { amount currencyCode } maxVariantPrice { amount currencyCode } }
        ${cardVariantFields}
        ${reviewFields}
      }
    }
  }
`;

export const HOMEPAGE_HOTSPOT_PRODUCTS_QUERY = `
  query HomepageHotspotProducts(
    $maskHandle: String!
    $glovesHandle: String!
    $sandingDiscHandle: String!
  ) {
    mask: product(handle: $maskHandle) {
      id handle title featuredImage { ${imageFields} }
    }
    gloves: product(handle: $glovesHandle) {
      id handle title featuredImage { ${imageFields} }
    }
    sandingDisc: product(handle: $sandingDiscHandle) {
      id handle title featuredImage { ${imageFields} }
    }
  }
`;

export const PRODUCT_QUERY = `
  query ProductByHandle($handle: String!) {
    product(handle: $handle) {
      id handle title description descriptionHtml productType vendor tags availableForSale
      seo { title description }
      featuredImage { ${imageFields} }
      images(first: 15) { nodes { ${imageFields} } }
      collections(first: 250) { nodes { handle title } }
      sellingPlanGroups(first: 20) {
        nodes {
          name
          sellingPlans(first: 50) { nodes { id } }
        }
      }
      options { name values }
      priceRange { minVariantPrice { amount currencyCode } maxVariantPrice { amount currencyCode } }
      variants(first: 100) {
        nodes { ${variantFields} }
        pageInfo { hasNextPage endCursor }
      }
      ${reviewFields}
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
      ${reviewFields}
    }
  }
`;

// Resolves current storefront products for historical Customer Account order
// lines in one request. Unpublished or deleted products return null nodes.
export const PRODUCTS_BY_IDS_QUERY = `
  query ProductsByIds($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Product { id handle }
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
      edges {
        cursor
        node {
          id handle title productType vendor availableForSale
          featuredImage { ${imageFields} }
          priceRange { minVariantPrice { amount currencyCode } maxVariantPrice { amount currencyCode } }
          ${cardVariantFields}
          ${reviewFields}
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

export const SHOP_FACETS_QUERY = `
  query ShopFacets($first: Int!, $after: String) {
    products(first: $first, after: $after, sortKey: ID) {
      nodes {
        id vendor productType availableForSale
        variants(first: 250) {
          nodes {
            availableForSale
            price { amount currencyCode }
            compareAtPrice { amount currencyCode }
          }
          pageInfo { hasNextPage endCursor }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

export const COLLECTION_QUERY = `
  query CollectionByHandle($handle: String!) {
    collection(handle: $handle) {
      id handle title description descriptionHtml
      seo { title description }
      image { ${imageFields} }
    }
  }
`;

export const SITEMAP_PRODUCTS_QUERY = `
  query SitemapProducts($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      nodes { handle updatedAt }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

export const SITEMAP_COLLECTIONS_QUERY = `
  query SitemapCollections($first: Int!, $after: String) {
    collections(first: $first, after: $after) {
      nodes { handle updatedAt }
      pageInfo { hasNextPage endCursor }
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
          ${reviewFields}
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`;

export const HOMEPAGE_COLLECTION_PRODUCTS_QUERY = `
  query HomepageCollectionProducts($handle: String!, $first: Int!) {
    collection(handle: $handle) {
      products(
        first: $first
        sortKey: BEST_SELLING
        filters: [{ available: true }]
      ) {
        nodes {
          id handle title productType vendor availableForSale
          featuredImage { ${imageFields} }
          priceRange { minVariantPrice { amount currencyCode } maxVariantPrice { amount currencyCode } }
          ${cardVariantFields}
          ${reviewFields}
        }
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

export const PREDICTIVE_SEARCH_QUERY = `
  query PredictiveSearch($query: String!, $limit: Int!) {
    predictiveSearch(
      query: $query
      limit: $limit
      limitScope: EACH
      types: [PRODUCT, COLLECTION]
      unavailableProducts: HIDE
      searchableFields: [TITLE, PRODUCT_TYPE, TAG, VARIANTS_SKU, VARIANTS_TITLE, VENDOR]
    ) {
      products {
        id handle title productType vendor availableForSale
        featuredImage { ${imageFields} }
        priceRange { minVariantPrice { amount currencyCode } maxVariantPrice { amount currencyCode } }
        ${predictiveVariantFields}
        ${reviewFields}
      }
      collections {
        id handle title
        image { ${imageFields} }
        availableProducts: products(first: 1, filters: [{ available: true }]) {
          nodes { id }
        }
      }
    }
  }
`;

export const PRODUCT_SEARCH_QUERY = `
  query ProductSearch($query: String!, $first: Int!, $after: String) {
    search(
      query: $query
      first: $first
      after: $after
      sortKey: RELEVANCE
      types: [PRODUCT]
      unavailableProducts: HIDE
      prefix: LAST
    ) {
      nodes {
        ... on Product {
          id handle title productType vendor availableForSale
          featuredImage { ${imageFields} }
          priceRange { minVariantPrice { amount currencyCode } maxVariantPrice { amount currencyCode } }
          ${cardVariantFields}
          ${reviewFields}
        }
      }
      totalCount
      pageInfo { hasNextPage endCursor }
    }
  }
`;

const articleSummaryFields = `
  id title handle excerpt excerptHtml publishedAt tags
  seo { title description }
  image { ${imageFields} }
  authorV2 { name }
`;

export const BLOG_ARCHIVE_QUERY = `
  query BlogArchive($blogHandle: String!, $first: Int!, $after: String) {
    blog(handle: $blogHandle) {
      id title handle seo { title description }
      articles(first: $first, after: $after, sortKey: PUBLISHED_AT, reverse: true) {
        nodes { ${articleSummaryFields} }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`;

export const BLOG_ARTICLE_QUERY = `
  query BlogArticle($blogHandle: String!, $articleHandle: String!) {
    blog(handle: $blogHandle) {
      id title handle seo { title description }
      articleByHandle(handle: $articleHandle) {
        ${articleSummaryFields}
        content
        contentHtml
      }
    }
  }
`;

export const SITEMAP_BLOG_ARTICLES_QUERY = `
  query SitemapBlogArticles($blogHandle: String!, $first: Int!, $after: String) {
    blog(handle: $blogHandle) {
      articles(first: $first, after: $after, sortKey: PUBLISHED_AT, reverse: true) {
        nodes { handle publishedAt }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`;
