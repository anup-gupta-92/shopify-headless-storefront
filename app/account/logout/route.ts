import { NextRequest, NextResponse } from "next/server";
import {
  clearCustomerSession,
  clearPendingOAuth,
  readCustomerSession,
  setLogoutHandoff,
} from "@/lib/shopify/customer-account/session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const session = await readCustomerSession();
  const destination = session?.idToken ? "/account/logout/shopify" : "/";
  const response = NextResponse.redirect(new URL(destination, origin));
  clearCustomerSession(response);
  clearPendingOAuth(response);
  if (session?.idToken) setLogoutHandoff(response, session.idToken);
  return response;
}
