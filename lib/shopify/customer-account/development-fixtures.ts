import "server-only";
import type {
  CustomerAddressBook,
  CustomerIdentity,
  CustomerOrderDetail,
  CustomerOrderPage,
} from "./types";

export function isCustomerAccountFixtureEnabled(): boolean {
  return process.env.NODE_ENV === "development" && process.env.CUSTOMER_ACCOUNT_MOCK === "true";
}

export const DEVELOPMENT_CUSTOMER: CustomerIdentity = {
  id: "gid://shopify/Customer/900000000001",
  displayName: "Avery Fixture",
  firstName: "Avery",
  lastName: "Fixture",
  emailAddress: { emailAddress: "avery.fixture@example.invalid" },
  phoneNumber: { phoneNumber: "+447700900000" },
};

export const DEVELOPMENT_ADDRESSES: CustomerAddressBook = {
  defaultAddressId: "gid://shopify/CustomerAddress/900000000001",
  addresses: [
    {
      id: "gid://shopify/CustomerAddress/900000000001",
      firstName: "Avery",
      lastName: "Fixture",
      company: "Example Test Company",
      address1: "12 Fixture Street",
      address2: "Unit 4",
      city: "Manchester",
      zoneCode: "ENG",
      country: "United Kingdom",
      territoryCode: "GB",
      zip: "M1 1AA",
      phoneNumber: "+447700900000",
      formatted: ["Avery Fixture", "Example Test Company", "12 Fixture Street", "Unit 4", "Manchester", "M1 1AA", "United Kingdom"],
      isDefault: true,
    },
    {
      id: "gid://shopify/CustomerAddress/900000000002",
      firstName: "Avery",
      lastName: "Fixture",
      company: null,
      address1: "88 Sample Road",
      address2: null,
      city: "Leeds",
      zoneCode: "ENG",
      country: "United Kingdom",
      territoryCode: "GB",
      zip: "LS1 2AB",
      phoneNumber: null,
      formatted: ["Avery Fixture", "88 Sample Road", "Leeds", "LS1 2AB", "United Kingdom"],
      isDefault: false,
    },
  ],
};

const placeholderImage = {
  url: "/images/logo-for-light.webp",
  altText: "Development fixture product",
  width: 512,
  height: 512,
};

export const DEVELOPMENT_ORDERS: CustomerOrderDetail[] = [
  {
    id: "gid://shopify/Order/900000000001",
    key: "Z2lkOi8vc2hvcGlmeS9PcmRlci85MDAwMDAwMDAwMDE",
    name: "#FIX-1003",
    processedAt: "2026-08-14T10:30:00Z",
    financialStatus: "PAID",
    fulfillmentStatus: "FULFILLED",
    totalPrice: { amount: "67.48", currencyCode: "GBP" },
    itemCount: 3,
    image: placeholderImage,
    subtotal: { amount: "56.24", currencyCode: "GBP" },
    totalDiscounts: { amount: "0.00", currencyCode: "GBP" },
    totalShipping: { amount: "0.00", currencyCode: "GBP" },
    totalTax: { amount: "11.24", currencyCode: "GBP" },
    lines: [
      { id: "fixture-line-1", name: "Corrugated Cardboard Boxes", quantity: 2, sku: "FIX-BOX-50", variantTitle: "Pack of 50", variantOptions: [{ name: "Pack", value: "50" }], image: placeholderImage, price: { amount: "24.99", currencyCode: "GBP" }, totalPrice: { amount: "49.98", currencyCode: "GBP" }, totalDiscount: { amount: "0.00", currencyCode: "GBP" } },
      { id: "fixture-line-2", name: "Packaging Tape", quantity: 1, sku: "FIX-TAPE-BRN", variantTitle: "Brown", variantOptions: [{ name: "Colour", value: "Brown" }], image: placeholderImage, price: { amount: "6.26", currencyCode: "GBP" }, totalPrice: { amount: "6.26", currencyCode: "GBP" }, totalDiscount: { amount: "0.00", currencyCode: "GBP" } },
    ],
    shippingAddress: DEVELOPMENT_ADDRESSES.addresses[0],
    billingAddress: DEVELOPMENT_ADDRESSES.addresses[0],
    fulfillments: [{ id: "fixture-fulfillment-1", status: "SUCCESS", latestShipmentStatus: "DELIVERED", estimatedDeliveryAt: "2026-08-16T17:00:00Z", trackingInformation: [{ company: "Example Carrier", number: "FIXTURE123456", url: "https://example.invalid/tracking/FIXTURE123456" }] }],
  },
  {
    id: "gid://shopify/Order/900000000002",
    key: "Z2lkOi8vc2hvcGlmeS9PcmRlci85MDAwMDAwMDAwMDI",
    name: "#FIX-1002",
    processedAt: "2026-07-28T14:15:00Z",
    financialStatus: "PAID",
    fulfillmentStatus: "PARTIALLY_FULFILLED",
    totalPrice: { amount: "119.98", currencyCode: "GBP" },
    itemCount: 2,
    image: placeholderImage,
    subtotal: { amount: "99.98", currencyCode: "GBP" },
    totalDiscounts: { amount: "5.00", currencyCode: "GBP" },
    totalShipping: { amount: "5.00", currencyCode: "GBP" },
    totalTax: { amount: "20.00", currencyCode: "GBP" },
    lines: [
      { id: "fixture-line-3", name: "Protective Work Gloves", quantity: 2, sku: "FIX-GLV-L", variantTitle: "Large / Pack of 50", variantOptions: [{ name: "Size", value: "Large" }, { name: "Pack", value: "50" }], image: placeholderImage, price: { amount: "49.99", currencyCode: "GBP" }, totalPrice: { amount: "99.98", currencyCode: "GBP" }, totalDiscount: { amount: "5.00", currencyCode: "GBP" } },
    ],
    shippingAddress: DEVELOPMENT_ADDRESSES.addresses[1],
    billingAddress: DEVELOPMENT_ADDRESSES.addresses[0],
    fulfillments: [{ id: "fixture-fulfillment-2", status: "SUCCESS", latestShipmentStatus: "IN_TRANSIT", estimatedDeliveryAt: "2026-08-01T17:00:00Z", trackingInformation: [{ company: "Example Carrier", number: "FIXTURE654321", url: "https://example.invalid/tracking/FIXTURE654321" }] }],
  },
  {
    id: "gid://shopify/Order/900000000003",
    key: "Z2lkOi8vc2hvcGlmeS9PcmRlci85MDAwMDAwMDAwMDM",
    name: "#FIX-1001",
    processedAt: "2026-07-10T09:00:00Z",
    financialStatus: "PAID",
    fulfillmentStatus: "UNFULFILLED",
    totalPrice: { amount: "18.00", currencyCode: "GBP" },
    itemCount: 1,
    image: placeholderImage,
    subtotal: { amount: "15.00", currencyCode: "GBP" },
    totalDiscounts: { amount: "0.00", currencyCode: "GBP" },
    totalShipping: { amount: "0.00", currencyCode: "GBP" },
    totalTax: { amount: "3.00", currencyCode: "GBP" },
    lines: [{ id: "fixture-line-4", name: "Mailing Bags", quantity: 1, sku: "FIX-MAIL-100", variantTitle: "Pack of 100", variantOptions: [{ name: "Pack", value: "100" }], image: placeholderImage, price: { amount: "15.00", currencyCode: "GBP" }, totalPrice: { amount: "15.00", currencyCode: "GBP" }, totalDiscount: { amount: "0.00", currencyCode: "GBP" } }],
    shippingAddress: DEVELOPMENT_ADDRESSES.addresses[0],
    billingAddress: DEVELOPMENT_ADDRESSES.addresses[0],
    fulfillments: [],
  },
];

export function getDevelopmentOrderPage(): CustomerOrderPage {
  return {
    orders: DEVELOPMENT_ORDERS,
    pageInfo: { hasNextPage: false, endCursor: null },
  };
}

export function getDevelopmentOrder(key: string): CustomerOrderDetail | null {
  return DEVELOPMENT_ORDERS.find((order) => order.key === key) ?? null;
}
