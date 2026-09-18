import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AccountError from "@/components/AccountError";
import AccountPageHeader from "@/components/AccountPageHeader";
import ProfileForm from "@/components/ProfileForm";
import { requireCustomerAccountAccess } from "@/lib/shopify/customer-account/access";
import { CustomerAccountUnauthorizedError } from "@/lib/shopify/customer-account/client";
import { getAccountIdentity } from "@/lib/shopify/customer-account/data";

export const metadata: Metadata = { title: "Profile", description: "View or update your Apex Business Supplies profile." };
export const revalidate = 0;

export default async function ProfilePage() {
  const access = await requireCustomerAccountAccess();
  let customer;
  try {
    customer = await getAccountIdentity(access);
  } catch (error) {
    if (error instanceof CustomerAccountUnauthorizedError) redirect("/account/refresh");
    return <main className="site-container min-h-[60vh] py-16"><AccountPageHeader title="Profile" /><AccountError title="Profile temporarily unavailable" retryHref="/account/profile" /></main>;
  }
  return <main className="site-container min-h-[60vh] py-16"><AccountPageHeader title="Profile" description="Keep your customer name up to date." /><ProfileForm customer={customer} /></main>;
}
