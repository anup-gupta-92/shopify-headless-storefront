"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";

export async function refreshAnalytics(formData: FormData) {
  const returnTo = formData.get("returnTo");
  let destination = "/admin/analytics?range=30d";

  if (typeof returnTo === "string") {
    const parsed = new URL(returnTo, "https://www.apexbusinesssupplies.co.uk");
    if (parsed.origin === "https://www.apexbusinesssupplies.co.uk" && parsed.pathname === "/admin/analytics") {
      destination = `${parsed.pathname}${parsed.search}`;
    }
  }

  updateTag("analytics-overview");
  redirect(destination);
}
