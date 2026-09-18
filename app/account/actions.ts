"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCustomerAccountAccess } from "@/lib/shopify/customer-account/access";
import {
  createCustomerAddress,
  CustomerAccountUnauthorizedError,
  deleteCustomerAddress,
  updateCustomerAddress,
  updateCustomerProfile,
} from "@/lib/shopify/customer-account/client";
import type { AccountActionState, CustomerAddressInput, CustomerMutationError } from "@/lib/shopify/customer-account/types";

function value(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

function optionalValue(formData: FormData, name: string): string | undefined {
  return value(formData, name) || undefined;
}

function mutationErrors(errors: CustomerMutationError[]): AccountActionState {
  const fieldErrors: Record<string, string> = {};
  const fieldAliases: Record<string, string> = {
    country: "territoryCode",
    countryCode: "territoryCode",
    province: "zoneCode",
    provinceCode: "zoneCode",
    postalCode: "zip",
    postcode: "zip",
    phone: "phoneNumber",
  };
  for (const error of errors) {
    const rawField = error.field?.at(-1);
    const field = rawField ? fieldAliases[rawField] ?? rawField : undefined;
    if (field) fieldErrors[field] = error.message;
  }
  return { status: "error", message: errors[0]?.message || "Please check the highlighted information.", fieldErrors };
}

function addressInput(formData: FormData): { input?: CustomerAddressInput; error?: AccountActionState } {
  const submittedPhone = optionalValue(formData, "phoneNumber");
  const input: CustomerAddressInput = {
    firstName: value(formData, "firstName"),
    lastName: value(formData, "lastName"),
    address1: value(formData, "address1"),
    city: value(formData, "city"),
    territoryCode: value(formData, "territoryCode").toUpperCase(),
    zip: value(formData, "zip"),
    company: optionalValue(formData, "company"),
    address2: optionalValue(formData, "address2"),
    zoneCode: optionalValue(formData, "zoneCode")?.toUpperCase(),
    phoneNumber: submittedPhone?.replace(/[\s().-]/g, ""),
  };
  const fieldErrors: Record<string, string> = {};
  for (const field of ["firstName", "lastName", "address1", "city", "territoryCode", "zip"] as const) {
    if (!input[field]) fieldErrors[field] = "This field is required.";
  }
  if (input.territoryCode && !/^[A-Z]{2,3}$/.test(input.territoryCode)) {
    fieldErrors.territoryCode = "Use a two or three-letter country code, such as GB.";
  }
  if (input.phoneNumber && !/^\+[1-9]\d{6,14}$/.test(input.phoneNumber)) {
    fieldErrors.phoneNumber = "Use international format, such as +447700900000.";
  }
  if (Object.keys(fieldErrors).length) {
    return { error: { status: "error", message: "Please check the highlighted information.", fieldErrors } };
  }
  return { input };
}

async function runMutation(
  operation: (accessToken: string) => Promise<{ userErrors: CustomerMutationError[] }>,
  successMessage: string,
): Promise<AccountActionState> {
  const access = await requireCustomerAccountAccess();
  if (access.source === "development-fixture") {
    return { status: "success", message: `${successMessage} Development fixture data resets on reload.` };
  }
  try {
    const result = await operation(access.accessToken);
    if (result.userErrors.length) return mutationErrors(result.userErrors);
    revalidatePath("/account", "layout");
    return { status: "success", message: successMessage };
  } catch (error) {
    if (error instanceof CustomerAccountUnauthorizedError) redirect("/account/refresh");
    return { status: "error", message: "We could not save that change. Please try again." };
  }
}

export async function saveProfileAction(_previous: AccountActionState, formData: FormData): Promise<AccountActionState> {
  const firstName = value(formData, "firstName");
  const lastName = value(formData, "lastName");
  if (!firstName || !lastName) {
    return {
      status: "error",
      message: "Please enter your first and last name.",
      fieldErrors: {
        ...(!firstName ? { firstName: "First name is required." } : {}),
        ...(!lastName ? { lastName: "Last name is required." } : {}),
      },
    };
  }
  return runMutation((token) => updateCustomerProfile(token, { firstName, lastName }), "Profile updated.");
}

export async function createAddressAction(_previous: AccountActionState, formData: FormData): Promise<AccountActionState> {
  const parsed = addressInput(formData);
  if (parsed.error || !parsed.input) return parsed.error!;
  return runMutation(
    (token) => createCustomerAddress(token, parsed.input!, formData.get("defaultAddress") === "on"),
    "Address added.",
  );
}

export async function updateAddressAction(_previous: AccountActionState, formData: FormData): Promise<AccountActionState> {
  const addressId = value(formData, "addressId");
  if (!addressId.startsWith("gid://shopify/CustomerAddress/")) return { status: "error", message: "That address is invalid." };
  const parsed = addressInput(formData);
  if (parsed.error || !parsed.input) return parsed.error!;
  return runMutation(
    (token) => updateCustomerAddress(token, addressId, parsed.input!, formData.get("defaultAddress") === "on"),
    "Address updated.",
  );
}

export async function setDefaultAddressAction(_previous: AccountActionState, formData: FormData): Promise<AccountActionState> {
  const addressId = value(formData, "addressId");
  if (!addressId.startsWith("gid://shopify/CustomerAddress/")) return { status: "error", message: "That address is invalid." };
  return runMutation((token) => updateCustomerAddress(token, addressId, null, true), "Default address updated.");
}

export async function deleteAddressAction(_previous: AccountActionState, formData: FormData): Promise<AccountActionState> {
  const addressId = value(formData, "addressId");
  if (!addressId.startsWith("gid://shopify/CustomerAddress/")) return { status: "error", message: "That address is invalid." };
  return runMutation((token) => deleteCustomerAddress(token, addressId), "Address removed.");
}
