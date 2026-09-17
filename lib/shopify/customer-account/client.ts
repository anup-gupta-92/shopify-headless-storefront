import "server-only";
import { getCustomerAccountConfiguration } from "./discovery";

export interface CustomerIdentity {
  id: string;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  emailAddress: { emailAddress: string } | null;
  phoneNumber: { phoneNumber: string | null } | null;
}

export class CustomerAccountUnauthorizedError extends Error {}

const CUSTOMER_IDENTITY_QUERY = `
  query CustomerIdentity {
    customer {
      id
      displayName
      firstName
      lastName
      emailAddress { emailAddress }
      phoneNumber { phoneNumber }
    }
  }
`;

export async function getCustomerIdentity(accessToken: string): Promise<CustomerIdentity> {
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
      body: JSON.stringify({ query: CUSTOMER_IDENTITY_QUERY }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new Error("Customer account service is temporarily unavailable");
  }

  if (response.status === 401 || response.status === 403) {
    throw new CustomerAccountUnauthorizedError("Customer session is no longer valid");
  }
  if (!response.ok) throw new Error("Customer account service is temporarily unavailable");

  const result: unknown = await response.json().catch(() => null);
  if (!result || typeof result !== "object") throw new Error("Customer account service returned invalid data");
  const body = result as { data?: { customer?: CustomerIdentity | null }; errors?: unknown[] };

  // Protected phone data can be omitted or accompanied by a field-level error.
  // Identity is still usable when Shopify returns a customer object.
  if (!body.data?.customer) {
    if (body.errors?.length) throw new Error("Customer account data is currently unavailable");
    throw new Error("Customer account was not found");
  }
  return body.data.customer;
}
