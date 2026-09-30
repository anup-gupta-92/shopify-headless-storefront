import { siteConfig } from "../config/site.ts";
import { cleanMetadataText, conciseMetadataDescription } from "./seo.ts";
import type { ShopifyCollection } from "./shopify/types.ts";
import type { Product, ProductVariant } from "../types/product.ts";

export type JsonLdPrimitive = string | number | boolean | null;
export type JsonLdValue = JsonLdPrimitive | JsonLdObject | JsonLdValue[];
export interface JsonLdObject { [key: string]: JsonLdValue | undefined }

const SCHEMA_ORIGIN = "https://schema.org";
export const ORGANIZATION_ID = `${siteConfig.url}/#organization`;
export const WEBSITE_ID = `${siteConfig.url}/#website`;
export const MERCHANT_RETURN_POLICY_ID = `${siteConfig.url}/#merchant-return-policy`;
export const SHIPPING_SERVICE_ID = `${siteConfig.url}/#uk-standard-shipping`;

const businessDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
  .map((day) => `${SCHEMA_ORIGIN}/${day}`);

function shippingTransitTime(): JsonLdObject {
  return {
    "@type": "ServicePeriod",
    duration: {
      "@type": "QuantitativeValue",
      minValue: 1,
      maxValue: 2,
      unitCode: "DAY",
    },
    businessDays,
  };
}

export function serializeJsonLd(data: JsonLdObject): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function buildGlobalStructuredData(): JsonLdObject {
  const logoUrl = `${siteConfig.url}${siteConfig.logo.lightTheme}`;
  return {
    "@context": SCHEMA_ORIGIN,
    "@graph": [
      {
        "@type": "OnlineStore",
        "@id": ORGANIZATION_ID,
        name: siteConfig.name,
        legalName: siteConfig.organization.legalName,
        url: siteConfig.url,
        logo: {
          "@type": "ImageObject",
          "@id": `${siteConfig.url}/#logo`,
          url: logoUrl,
          contentUrl: logoUrl,
          width: 500,
          height: 500,
          caption: `${siteConfig.name} logo`,
        },
        image: { "@id": `${siteConfig.url}/#logo` },
        email: siteConfig.contact.email,
        telephone: siteConfig.organization.telephone,
        address: {
          "@type": "PostalAddress",
          ...siteConfig.organization.address,
        },
        sameAs: [...siteConfig.organization.sameAs],
        hasMerchantReturnPolicy: {
          "@type": "MerchantReturnPolicy",
          "@id": MERCHANT_RETURN_POLICY_ID,
          applicableCountry: "GB",
          returnPolicyCountry: "GB",
          returnPolicyCategory: `${SCHEMA_ORIGIN}/MerchantReturnFiniteReturnWindow`,
          merchantReturnDays: 30,
          returnMethod: `${SCHEMA_ORIGIN}/ReturnByMail`,
          merchantReturnLink: `${siteConfig.url}/policies/refund-policy`,
        },
        hasShippingService: {
          "@type": "ShippingService",
          "@id": SHIPPING_SERVICE_ID,
          name: "UK standard delivery",
          description: "Same-day dispatch before 3 PM on working days, with UK delivery normally taking 2–3 business days. Delivery is free for orders over £79 excluding VAT.",
          fulfillmentType: `${SCHEMA_ORIGIN}/FulfillmentTypeDelivery`,
          handlingTime: {
            "@type": "ServicePeriod",
            duration: {
              "@type": "QuantitativeValue",
              minValue: 0,
              maxValue: 1,
              unitCode: "DAY",
            },
            businessDays,
          },
          shippingConditions: [
            {
              "@type": "ShippingConditions",
              shippingDestination: { "@type": "DefinedRegion", addressCountry: "GB" },
              orderValue: { "@type": "MonetaryAmount", maxValue: 79, currency: "GBP" },
              shippingRate: { "@type": "MonetaryAmount", value: 4.49, currency: "GBP" },
              transitTime: shippingTransitTime(),
            },
            {
              "@type": "ShippingConditions",
              shippingDestination: { "@type": "DefinedRegion", addressCountry: "GB" },
              orderValue: { "@type": "MonetaryAmount", minValue: 79.01, currency: "GBP" },
              shippingRate: { "@type": "MonetaryAmount", value: 0, currency: "GBP" },
              transitTime: shippingTransitTime(),
            },
          ],
        },
      },
      {
        "@type": "WebSite",
        "@id": WEBSITE_ID,
        name: siteConfig.name,
        url: `${siteConfig.url}/`,
        publisher: { "@id": ORGANIZATION_ID },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${siteConfig.url}/search?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };
}

export interface BreadcrumbItem {
  name: string;
  path: string;
}

export function buildBreadcrumbList(items: BreadcrumbItem[], pageUrl: string): JsonLdObject {
  return {
    "@type": "BreadcrumbList",
    "@id": `${pageUrl}#breadcrumb`,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${siteConfig.url}${item.path}`,
    })),
  };
}

interface PricedVariant {
  variant: ProductVariant;
  amount: number;
  amountText: string;
  currencyCode: string;
}

function pricedVariants(variants: ProductVariant[]): PricedVariant[] {
  return variants.flatMap((variant) => {
    const amount = Number(variant.money?.amount);
    const currencyCode = variant.money?.currencyCode.trim();
    return Number.isFinite(amount) && amount >= 0 && currencyCode
      ? [{ variant, amount, amountText: variant.money!.amount, currencyCode }]
      : [];
  });
}

function commonSku(variants: ProductVariant[]): string | undefined {
  const skus = new Set(variants.map((variant) => variant.productCode?.trim()).filter(Boolean));
  return skus.size === 1 ? [...skus][0] : undefined;
}

function offerFulfillmentPolicyReferences(): JsonLdObject {
  return {
    hasMerchantReturnPolicy: { "@id": MERCHANT_RETURN_POLICY_ID },
    shippingDetails: {
      "@type": "OfferShippingDetails",
      hasShippingService: { "@id": SHIPPING_SERVICE_ID },
    },
  };
}

function buildOffers(product: Product, url: string): JsonLdObject | undefined {
  const variants = product.variants ?? [];
  const available = pricedVariants(variants.filter((variant) => variant.available === true));

  if (available.length === 1) {
    return {
      "@type": "Offer",
      url,
      priceCurrency: available[0].currencyCode,
      price: available[0].amountText,
      availability: `${SCHEMA_ORIGIN}/InStock`,
      ...offerFulfillmentPolicyReferences(),
    };
  }

  if (available.length > 1) {
    const currencyCode = available[0].currencyCode;
    const sameCurrency = available.filter((entry) => entry.currencyCode === currencyCode);
    const amounts = sameCurrency.map((entry) => entry.amount);
    return {
      "@type": "AggregateOffer",
      url,
      priceCurrency: currencyCode,
      lowPrice: Math.min(...amounts).toString(),
      highPrice: Math.max(...amounts).toString(),
      offerCount: sameCurrency.length,
      availability: `${SCHEMA_ORIGIN}/InStock`,
      ...offerFulfillmentPolicyReferences(),
    };
  }

  const unavailable = pricedVariants(variants).sort((left, right) => left.amount - right.amount)[0];
  if (!unavailable) return undefined;
  return {
    "@type": "Offer",
    url,
    priceCurrency: unavailable.currencyCode,
    price: unavailable.amountText,
    availability: `${SCHEMA_ORIGIN}/OutOfStock`,
    ...offerFulfillmentPolicyReferences(),
  };
}

export function buildProductStructuredData(product: Product): JsonLdObject {
  const handle = product.handle?.trim();
  const url = `${siteConfig.url}/products/${encodeURIComponent(handle || "")}`;
  const description = cleanMetadataText(product.seo?.description)
    || conciseMetadataDescription(product.description, siteConfig.description);
  const image = [...new Set([product.image, ...(product.images ?? []).map((item) => item.url)].filter(Boolean))];
  const variants = product.variants ?? [];
  const sku = commonSku(variants.filter((variant) => variant.available === true))
    ?? commonSku(variants);
  const offers = buildOffers(product, url);
  const rating = product.reviewRating;
  const aggregateRating = rating
    && Number.isFinite(rating.average)
    && rating.average >= 1
    && rating.average <= 5
    && Number.isSafeInteger(rating.count)
    && rating.count > 0
    ? {
        "@type": "AggregateRating",
        ratingValue: rating.average,
        reviewCount: rating.count,
      }
    : undefined;
  const breadcrumb = buildBreadcrumbList([
    { name: "Home", path: "/" },
    { name: "Shop", path: "/shop" },
    { name: product.title, path: `/products/${encodeURIComponent(handle || "")}` },
  ], url);

  return {
    "@context": SCHEMA_ORIGIN,
    "@graph": [
      {
        "@type": "Product",
        "@id": `${url}#product`,
        name: product.title,
        url,
        description,
        ...(image.length ? { image } : {}),
        ...(sku ? { sku } : {}),
        ...(product.vendor?.trim() ? { brand: { "@type": "Brand", name: product.vendor.trim() } } : {}),
        ...(product.category.trim() ? { category: product.category.trim() } : {}),
        ...(offers ? { offers } : {}),
        ...(aggregateRating ? { aggregateRating } : {}),
      },
      breadcrumb,
    ],
  };
}

export function buildCollectionStructuredData(collection: ShopifyCollection): JsonLdObject {
  const url = `${siteConfig.url}/collections/${encodeURIComponent(collection.handle)}`;
  const description = cleanMetadataText(collection.seo.description)
    || conciseMetadataDescription(
      collection.description,
      `Browse ${collection.title} from ${siteConfig.name}.`,
    );
  const breadcrumb = buildBreadcrumbList([
    { name: "Home", path: "/" },
    { name: "Shop", path: "/shop" },
    { name: collection.title, path: `/collections/${encodeURIComponent(collection.handle)}` },
  ], url);

  return {
    "@context": SCHEMA_ORIGIN,
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${url}#webpage`,
        url,
        name: collection.title,
        description,
        isPartOf: { "@id": WEBSITE_ID },
        breadcrumb: { "@id": `${url}#breadcrumb` },
        ...(collection.image ? { primaryImageOfPage: { "@type": "ImageObject", url: collection.image.url } } : {}),
      },
      breadcrumb,
    ],
  };
}
