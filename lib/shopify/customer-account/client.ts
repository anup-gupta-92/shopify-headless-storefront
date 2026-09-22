import "server-only";
import { getCustomerAccountConfiguration } from "./discovery";
import type {
  CustomerAddress,
  CustomerAddressBook,
  CustomerAddressInput,
  CustomerIdentity,
  CustomerMutationError,
  CustomerOrderDetail,
  CustomerOrderPage,
  CustomerOrderSummary,
} from "./types";

export type { CustomerIdentity } from "./types";

export class CustomerAccountUnauthorizedError extends Error {}
export class CustomerAccountRequestError extends Error {}

interface GraphQlResponse<T> {
  data?: T;
  errors?: Array<{ message?: string; path?: Array<string | number>; extensions?: { code?: string } }>;
}

async function customerAccountRequest<T>(
  accessToken: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<GraphQlResponse<T>> {
  const { graphql_api } = await getCustomerAccountConfiguration();
  let response: Response;
  try {
    response = await fetch(graphql_api, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: accessToken,
      },
      body: JSON.stringify({ query, variables }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new CustomerAccountRequestError("Customer account service is temporarily unavailable");
  }

  if (response.status === 401 || response.status === 403) {
    throw new CustomerAccountUnauthorizedError("Customer session is no longer valid");
  }
  if (!response.ok) throw new CustomerAccountRequestError("Customer account service is temporarily unavailable");

  const result: unknown = await response.json().catch(() => null);
  if (!result || typeof result !== "object") {
    throw new CustomerAccountRequestError("Customer account service returned invalid data");
  }
  return result as GraphQlResponse<T>;
}

const CUSTOMER_FIELDS = `
  id displayName firstName lastName
  emailAddress { emailAddress }
  phoneNumber { phoneNumber }
`;

const ADDRESS_FIELDS = `
  id firstName lastName company address1 address2 city zoneCode country
  territoryCode zip phoneNumber formatted(withName: true, withCompany: true)
`;

const MONEY_FIELDS = `amount currencyCode`;
const IMAGE_FIELDS = `url altText width height`;

const CUSTOMER_IDENTITY_QUERY = `query CustomerIdentity { customer { ${CUSTOMER_FIELDS} } }`;

const CUSTOMER_ORDERS_QUERY = `
  query CustomerOrders($first: Int!, $after: String) {
    customer {
      orders(first: $first, after: $after, reverse: true, sortKey: PROCESSED_AT) {
        nodes {
          id name processedAt financialStatus fulfillmentStatus
          totalPrice { ${MONEY_FIELDS} }
          lineItems(first: 100) { nodes { quantity image { ${IMAGE_FIELDS} } } }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`;

const CUSTOMER_ORDER_QUERY = `
  query CustomerOrder($id: ID!) {
    order(id: $id) {
      id name processedAt financialStatus fulfillmentStatus
      totalPrice { ${MONEY_FIELDS} }
      subtotal { ${MONEY_FIELDS} }
      totalShipping { ${MONEY_FIELDS} }
      totalTax { ${MONEY_FIELDS} }
      lineItems(first: 100) {
        nodes {
          id productId name quantity sku variantTitle
          variantOptions { name value }
          image { ${IMAGE_FIELDS} }
          price { ${MONEY_FIELDS} }
          totalPrice { ${MONEY_FIELDS} }
          totalDiscount { ${MONEY_FIELDS} }
        }
      }
      shippingAddress { ${ADDRESS_FIELDS} }
      billingAddress { ${ADDRESS_FIELDS} }
      fulfillments(first: 20) {
        nodes {
          id status latestShipmentStatus estimatedDeliveryAt
          trackingInformation { company number url }
        }
      }
    }
  }
`;

const CUSTOMER_ADDRESSES_QUERY = `
  query CustomerAddresses {
    customer {
      defaultAddress { id }
      addresses(first: 100) { nodes { ${ADDRESS_FIELDS} } }
    }
  }
`;

const CUSTOMER_UPDATE_MUTATION = `
  mutation CustomerUpdate($input: CustomerUpdateInput!) {
    customerUpdate(input: $input) {
      customer { ${CUSTOMER_FIELDS} }
      userErrors { field message }
    }
  }
`;

const ADDRESS_CREATE_MUTATION = `
  mutation CustomerAddressCreate($address: CustomerAddressInput!, $defaultAddress: Boolean) {
    customerAddressCreate(address: $address, defaultAddress: $defaultAddress) {
      customerAddress { ${ADDRESS_FIELDS} }
      userErrors { field message }
    }
  }
`;

const ADDRESS_UPDATE_MUTATION = `
  mutation CustomerAddressUpdate($addressId: ID!, $address: CustomerAddressInput, $defaultAddress: Boolean) {
    customerAddressUpdate(addressId: $addressId, address: $address, defaultAddress: $defaultAddress) {
      customerAddress { ${ADDRESS_FIELDS} }
      userErrors { field message }
    }
  }
`;

const ADDRESS_DELETE_MUTATION = `
  mutation CustomerAddressDelete($addressId: ID!) {
    customerAddressDelete(addressId: $addressId) {
      deletedAddressId
      userErrors { field message }
    }
  }
`;

function requireData<T>(body: GraphQlResponse<T>, message: string): T {
  if (!body.data) throw new CustomerAccountRequestError(body.errors?.length ? message : "Customer account data was not found");
  return body.data;
}

function requireMutationPayload<T extends { userErrors: CustomerMutationError[] }>(
  operation: string,
  body: GraphQlResponse<unknown>,
  payload: T | null | undefined,
): T {
  if (body.errors?.length || payload?.userErrors.length) {
    // Diagnostic data is deliberately limited to Shopify's operation/path/code/message.
    // Variables, customer data, IDs and access credentials are never logged.
    console.error(`[Customer Account API] ${operation} failed`, {
      graphqlErrors: body.errors?.map((error) => ({
        code: error.extensions?.code,
        ...(process.env.NODE_ENV === "development" ? { message: error.message } : {}),
        path: error.path,
      })),
      userErrors: payload?.userErrors.map((error) => ({
        field: error.field,
        ...(process.env.NODE_ENV === "development" ? { message: error.message } : {}),
      })),
    });
  }
  if (body.errors?.length) throw new CustomerAccountRequestError(`${operation} was rejected by the customer account service`);
  if (!payload) throw new CustomerAccountRequestError(`${operation} did not return a result`);
  return payload;
}

export function encodeOrderKey(id: string): string {
  return Buffer.from(id, "utf8").toString("base64url");
}

export function decodeOrderKey(key: string): string | null {
  if (!/^[A-Za-z0-9_-]{8,256}$/.test(key)) return null;
  try {
    const id = Buffer.from(key, "base64url").toString("utf8");
    return id.startsWith("gid://shopify/Order/") ? id : null;
  } catch {
    return null;
  }
}

type RawAddress = Omit<CustomerAddress, "isDefault">;

function mapAddress(address: RawAddress | null, defaultAddressId: string | null = null): CustomerAddress | null {
  return address ? { ...address, isDefault: address.id === defaultAddressId } : null;
}

type RawOrderSummary = Omit<CustomerOrderSummary, "key" | "itemCount" | "image"> & {
  lineItems: { nodes: Array<{ quantity: number; image: CustomerOrderSummary["image"] }> };
};

function mapOrderSummary(order: RawOrderSummary): CustomerOrderSummary {
  return {
    id: order.id,
    key: encodeOrderKey(order.id),
    name: order.name,
    processedAt: order.processedAt,
    financialStatus: order.financialStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    totalPrice: order.totalPrice,
    itemCount: order.lineItems.nodes.reduce((total, line) => total + line.quantity, 0),
    image: order.lineItems.nodes.find((line) => line.image)?.image ?? null,
  };
}

export async function getCustomerIdentity(accessToken: string): Promise<CustomerIdentity> {
  const body = await customerAccountRequest<{ customer?: CustomerIdentity | null }>(accessToken, CUSTOMER_IDENTITY_QUERY);
  const customer = body.data?.customer;
  // Protected phone data may produce a field-level error while identity remains usable.
  if (!customer) throw new CustomerAccountRequestError("Customer account data is currently unavailable");
  return customer;
}

export async function getCustomerOrders(accessToken: string, options: { first: number; after?: string | null }): Promise<CustomerOrderPage> {
  const body = await customerAccountRequest<{
    customer?: { orders: { nodes: RawOrderSummary[]; pageInfo: CustomerOrderPage["pageInfo"] } };
  }>(accessToken, CUSTOMER_ORDERS_QUERY, { first: options.first, after: options.after ?? null });
  const orders = requireData(body, "Orders are temporarily unavailable").customer?.orders;
  if (!orders) throw new CustomerAccountRequestError("Orders are temporarily unavailable");
  return { orders: orders.nodes.map(mapOrderSummary), pageInfo: orders.pageInfo };
}

export async function getCustomerOrder(accessToken: string, id: string): Promise<CustomerOrderDetail | null> {
  type RawOrder = Omit<CustomerOrderDetail, "key" | "itemCount" | "image" | "lines" | "shippingAddress" | "billingAddress" | "fulfillments" | "totalDiscounts"> & {
    lineItems: { nodes: CustomerOrderDetail["lines"] };
    shippingAddress: RawAddress | null;
    billingAddress: RawAddress | null;
    fulfillments: { nodes: CustomerOrderDetail["fulfillments"] };
  };
  const body = await customerAccountRequest<{ order?: RawOrder | null }>(accessToken, CUSTOMER_ORDER_QUERY, { id });
  if (body.errors?.length && !body.data) throw new CustomerAccountRequestError("Order details are temporarily unavailable");
  const order = body.data?.order;
  if (!order) return null;
  return {
    ...order,
    key: encodeOrderKey(order.id),
    itemCount: order.lineItems.nodes.reduce((total, line) => total + line.quantity, 0),
    image: order.lineItems.nodes.find((line) => line.image)?.image ?? null,
    lines: order.lineItems.nodes,
    shippingAddress: mapAddress(order.shippingAddress),
    billingAddress: mapAddress(order.billingAddress),
    fulfillments: order.fulfillments.nodes,
    totalDiscounts: null,
  };
}

export async function getCustomerAddresses(accessToken: string): Promise<CustomerAddressBook> {
  const body = await customerAccountRequest<{
    customer?: { defaultAddress: { id: string } | null; addresses: { nodes: RawAddress[] } };
  }>(accessToken, CUSTOMER_ADDRESSES_QUERY);
  const customer = requireData(body, "Addresses are temporarily unavailable").customer;
  if (!customer) throw new CustomerAccountRequestError("Addresses are temporarily unavailable");
  const defaultAddressId = customer.defaultAddress?.id ?? null;
  return {
    defaultAddressId,
    addresses: customer.addresses.nodes.map((address) => mapAddress(address, defaultAddressId)!),
  };
}

export async function updateCustomerProfile(accessToken: string, input: { firstName: string; lastName: string }) {
  const body = await customerAccountRequest<{
    customerUpdate?: { customer: CustomerIdentity | null; userErrors: CustomerMutationError[] };
  }>(accessToken, CUSTOMER_UPDATE_MUTATION, { input });
  return requireMutationPayload("customerUpdate", body, body.data?.customerUpdate);
}

export async function createCustomerAddress(accessToken: string, address: CustomerAddressInput, defaultAddress: boolean) {
  const body = await customerAccountRequest<{
    customerAddressCreate?: { customerAddress: RawAddress | null; userErrors: CustomerMutationError[] };
  }>(accessToken, ADDRESS_CREATE_MUTATION, { address, defaultAddress });
  return requireMutationPayload("customerAddressCreate", body, body.data?.customerAddressCreate);
}

export async function updateCustomerAddress(accessToken: string, addressId: string, address: CustomerAddressInput | null, defaultAddress?: boolean) {
  const body = await customerAccountRequest<{
    customerAddressUpdate?: { customerAddress: RawAddress | null; userErrors: CustomerMutationError[] };
  }>(accessToken, ADDRESS_UPDATE_MUTATION, { addressId, address, defaultAddress });
  return requireMutationPayload("customerAddressUpdate", body, body.data?.customerAddressUpdate);
}

export async function deleteCustomerAddress(accessToken: string, addressId: string) {
  const body = await customerAccountRequest<{
    customerAddressDelete?: { deletedAddressId: string | null; userErrors: CustomerMutationError[] };
  }>(accessToken, ADDRESS_DELETE_MUTATION, { addressId });
  return requireMutationPayload("customerAddressDelete", body, body.data?.customerAddressDelete);
}
