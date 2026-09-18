import "server-only";
import { redirect } from "next/navigation";
import { isCustomerAccountFixtureEnabled } from "./development-fixtures";
import { customerSessionNeedsRefresh, readCustomerSession } from "./session";

export type CustomerAccountAccess =
  | { source: "development-fixture" }
  | { source: "shopify"; accessToken: string };

export async function requireCustomerAccountAccess(): Promise<CustomerAccountAccess> {
  // This is the only authentication bypass. Both checks are mandatory, making
  // CUSTOMER_ACCOUNT_MOCK inert in previews and production deployments.
  if (isCustomerAccountFixtureEnabled()) return { source: "development-fixture" };

  const session = await readCustomerSession();
  if (!session) redirect("/account/login");
  if (customerSessionNeedsRefresh(session)) redirect("/account/refresh");
  return { source: "shopify", accessToken: session.accessToken };
}
