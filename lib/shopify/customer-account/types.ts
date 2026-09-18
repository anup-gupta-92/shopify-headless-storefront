export interface CustomerMoney {
  amount: string;
  currencyCode: string;
}

export interface CustomerImage {
  url: string;
  altText: string | null;
  width: number | null;
  height: number | null;
}

export interface CustomerIdentity {
  id: string;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  emailAddress: { emailAddress: string } | null;
  phoneNumber: { phoneNumber: string | null } | null;
}

export interface CustomerAddress {
  id: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  zoneCode: string | null;
  country: string | null;
  territoryCode: string | null;
  zip: string | null;
  phoneNumber: string | null;
  formatted: string[];
  isDefault: boolean;
}

export interface CustomerOrderSummary {
  id: string;
  key: string;
  name: string;
  processedAt: string;
  financialStatus: string | null;
  fulfillmentStatus: string;
  totalPrice: CustomerMoney;
  itemCount: number;
  image: CustomerImage | null;
}

export interface CustomerOrderLine {
  id: string;
  name: string;
  quantity: number;
  sku: string | null;
  variantTitle: string | null;
  variantOptions: Array<{ name: string; value: string }>;
  image: CustomerImage | null;
  price: CustomerMoney | null;
  totalPrice: CustomerMoney | null;
  totalDiscount: CustomerMoney;
}

export interface CustomerFulfillment {
  id: string;
  status: string | null;
  latestShipmentStatus: string | null;
  estimatedDeliveryAt: string | null;
  trackingInformation: Array<{
    company: string | null;
    number: string | null;
    url: string | null;
  }>;
}

export interface CustomerOrderDetail extends CustomerOrderSummary {
  subtotal: CustomerMoney | null;
  totalDiscounts: CustomerMoney | null;
  totalShipping: CustomerMoney;
  totalTax: CustomerMoney | null;
  lines: CustomerOrderLine[];
  shippingAddress: CustomerAddress | null;
  billingAddress: CustomerAddress | null;
  fulfillments: CustomerFulfillment[];
}

export interface CustomerOrderPage {
  orders: CustomerOrderSummary[];
  pageInfo: {
    hasNextPage: boolean;
    endCursor: string | null;
  };
}

export interface CustomerAddressBook {
  addresses: CustomerAddress[];
  defaultAddressId: string | null;
}

export interface CustomerAddressInput {
  firstName?: string;
  lastName?: string;
  company?: string;
  address1?: string;
  address2?: string;
  city?: string;
  zoneCode?: string;
  territoryCode?: string;
  zip?: string;
  phoneNumber?: string;
}

export interface CustomerMutationError {
  field: string[] | null;
  message: string;
}

export interface AccountActionState {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: Record<string, string>;
}

export const INITIAL_ACCOUNT_ACTION_STATE: AccountActionState = {
  status: "idle",
  message: "",
};
