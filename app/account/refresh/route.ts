import { NextRequest, NextResponse } from "next/server";
import { refreshCustomerToken, verifyIdToken } from "@/lib/shopify/customer-account/oauth";
import {
  clearCustomerSession,
  readCustomerSession,
  setCustomerSession,
} from "@/lib/shopify/customer-account/session";

export const dynamic = "force-dynamic";

function loginResponse(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/account/login", request.nextUrl.origin));
  clearCustomerSession(response);
  return response;
}

export async function GET(request: NextRequest) {
  const session = await readCustomerSession();
  if (!session?.refreshToken) return loginResponse(request);

  try {
    const token = await refreshCustomerToken(session.refreshToken, request.nextUrl.origin);
    await verifyIdToken(token.idToken);
    const response = NextResponse.redirect(new URL("/account", request.nextUrl.origin));
    setCustomerSession(response, {
      accessToken: token.accessToken,
      expiresAt: Math.floor(Date.now() / 1000) + token.expiresIn,
      idToken: token.idToken,
      refreshToken: token.refreshToken ?? session.refreshToken,
    });
    return response;
  } catch {
    return loginResponse(request);
  }
}
