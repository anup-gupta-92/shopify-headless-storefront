import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AccountError from "@/components/AccountError";
import AccountPageHeader from "@/components/AccountPageHeader";
import AddressManager from "@/components/AddressManager";
import { requireCustomerAccountAccess } from "@/lib/shopify/customer-account/access";
import { CustomerAccountUnauthorizedError } from "@/lib/shopify/customer-account/client";
import { getAccountAddresses } from "@/lib/shopify/customer-account/data";

export const metadata: Metadata = { title: "Addresses", description: "Manage your Apex Business Supplies delivery addresses." };
export const revalidate = 0;

export default async function AddressesPage() {
  const access = await requireCustomerAccountAccess();
  let addressBook;
  try {
    addressBook = await getAccountAddresses(access);
  } catch (error) {
    if (error instanceof CustomerAccountUnauthorizedError) redirect("/account/refresh");
    return <main className="site-container min-h-[60vh] py-16"><AccountPageHeader title="Addresses" /><AccountError title="Addresses temporarily unavailable" retryHref="/account/addresses" /></main>;
  }
  return <main className="site-container min-h-[60vh] py-16"><AccountPageHeader title="Addresses" description="Manage the addresses saved to your Shopify customer account." /><AddressManager addresses={addressBook.addresses} /></main>;
}
