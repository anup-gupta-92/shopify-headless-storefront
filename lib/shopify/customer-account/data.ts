import "server-only";
import type { CustomerAccountAccess } from "./access";
import {
  decodeOrderKey,
  getCustomerAddresses as getShopifyAddresses,
  getCustomerIdentity as getShopifyIdentity,
  getCustomerOrder as getShopifyOrder,
  getCustomerOrders as getShopifyOrders,
} from "./client";
import {
  DEVELOPMENT_ADDRESSES,
  DEVELOPMENT_CUSTOMER,
  getDevelopmentOrder,
  getDevelopmentOrderPage,
} from "./development-fixtures";
import type { CustomerAddressBook, CustomerIdentity, CustomerOrderDetail, CustomerOrderPage } from "./types";

export async function getAccountIdentity(access: CustomerAccountAccess): Promise<CustomerIdentity> {
  return access.source === "development-fixture" ? DEVELOPMENT_CUSTOMER : getShopifyIdentity(access.accessToken);
}

export async function getAccountOrders(access: CustomerAccountAccess, options: { first: number; after?: string | null }): Promise<CustomerOrderPage> {
  return access.source === "development-fixture" ? getDevelopmentOrderPage() : getShopifyOrders(access.accessToken, options);
}

export async function getAccountOrder(access: CustomerAccountAccess, key: string): Promise<CustomerOrderDetail | null> {
  if (access.source === "development-fixture") return getDevelopmentOrder(key);
  const id = decodeOrderKey(key);
  return id ? getShopifyOrder(access.accessToken, id) : null;
}

export async function getAccountAddresses(access: CustomerAccountAccess): Promise<CustomerAddressBook> {
  return access.source === "development-fixture" ? DEVELOPMENT_ADDRESSES : getShopifyAddresses(access.accessToken);
}
