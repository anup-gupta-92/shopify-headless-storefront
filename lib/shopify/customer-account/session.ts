import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { deflateRawSync, inflateRawSync } from "node:zlib";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { CUSTOMER_SESSION_HINT_COOKIE } from "@/lib/customer-account-constants";
import { getShopifyStorefrontPrivateToken } from "../config";

export const OAUTH_COOKIE = "apex_customer_oauth";
export const SESSION_COOKIE = "apex_customer_session";
export const LOGOUT_HANDOFF_COOKIE = "apex_customer_logout";

const OAUTH_MAX_AGE_SECONDS = 10 * 60;
const REFRESH_SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
const LOGOUT_HANDOFF_MAX_AGE_SECONDS = 60;

export interface PendingOAuthSession {
  state: string;
  nonce: string;
  codeVerifier: string;
  redirectUri: string;
  createdAt: number;
}

export interface CustomerSession {
  accessToken: string;
  expiresAt: number;
  idToken: string;
  refreshToken?: string;
}

interface LogoutHandoff {
  idToken: string;
  createdAt: number;
}

function encryptionKey(): Buffer {
  // The existing server-only private Storefront token provides stable key material
  // without introducing a Customer Account client secret (public clients have none).
  // Rotating that token intentionally invalidates existing local customer sessions.
  return createHash("sha256")
    .update("apex-customer-session-cookie-v1\0")
    .update(getShopifyStorefrontPrivateToken())
    .digest();
}

function seal(value: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const plaintext = deflateRawSync(Buffer.from(JSON.stringify(value), "utf8"));
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([Buffer.from([1]), iv, tag, ciphertext]).toString("base64url");
}

function unseal<T>(value: string | undefined): T | null {
  if (!value) return null;
  try {
    const payload = Buffer.from(value, "base64url");
    if (payload[0] !== 1 || payload.length < 30) return null;
    const iv = payload.subarray(1, 13);
    const tag = payload.subarray(13, 29);
    const ciphertext = payload.subarray(29);
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return JSON.parse(inflateRawSync(plaintext).toString("utf8")) as T;
  } catch {
    return null;
  }
}

function secureCookies(): boolean {
  return process.env.NODE_ENV === "production";
}

export function setPendingOAuth(response: NextResponse, pending: PendingOAuthSession): void {
  response.cookies.set(OAUTH_COOKIE, seal(pending), {
    httpOnly: true,
    secure: secureCookies(),
    sameSite: "lax",
    path: "/account",
    maxAge: OAUTH_MAX_AGE_SECONDS,
    priority: "high",
  });
}

export function clearPendingOAuth(response: NextResponse): void {
  response.cookies.set(OAUTH_COOKIE, "", {
    httpOnly: true,
    secure: secureCookies(),
    sameSite: "lax",
    path: "/account",
    maxAge: 0,
    expires: new Date(0),
    priority: "high",
  });
}

export async function readPendingOAuth(): Promise<PendingOAuthSession | null> {
  const value = (await cookies()).get(OAUTH_COOKIE)?.value;
  const pending = unseal<PendingOAuthSession>(value);
  if (!pending || Date.now() - pending.createdAt > OAUTH_MAX_AGE_SECONDS * 1000) return null;
  return pending;
}

export function setCustomerSession(response: NextResponse, session: CustomerSession): void {
  const now = Math.floor(Date.now() / 1000);
  const maxAge = session.refreshToken
    ? REFRESH_SESSION_MAX_AGE_SECONDS
    : Math.max(1, session.expiresAt - now);

  response.cookies.set(SESSION_COOKIE, seal(session), {
    httpOnly: true,
    secure: secureCookies(),
    sameSite: "lax",
    path: "/",
    maxAge,
    priority: "high",
  });
  // This value contains no identity or credential. It lets the client-rendered
  // header select the correct destination without calling the Customer API.
  response.cookies.set(CUSTOMER_SESSION_HINT_COOKIE, "1", {
    httpOnly: false,
    secure: secureCookies(),
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

export function clearCustomerSession(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: secureCookies(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
    priority: "high",
  });
  response.cookies.set(CUSTOMER_SESSION_HINT_COOKIE, "", {
    httpOnly: false,
    secure: secureCookies(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
}

export function setLogoutHandoff(response: NextResponse, idToken: string): void {
  response.cookies.set(LOGOUT_HANDOFF_COOKIE, seal({ idToken, createdAt: Date.now() }), {
    httpOnly: true,
    secure: secureCookies(),
    sameSite: "lax",
    path: "/account/logout/shopify",
    maxAge: LOGOUT_HANDOFF_MAX_AGE_SECONDS,
    priority: "high",
  });
}

export async function readLogoutHandoff(): Promise<string | null> {
  const value = (await cookies()).get(LOGOUT_HANDOFF_COOKIE)?.value;
  const handoff = unseal<LogoutHandoff>(value);
  if (
    !handoff ||
    typeof handoff.idToken !== "string" ||
    typeof handoff.createdAt !== "number" ||
    Date.now() - handoff.createdAt > LOGOUT_HANDOFF_MAX_AGE_SECONDS * 1000
  ) return null;
  return handoff.idToken;
}

export function clearLogoutHandoff(response: NextResponse): void {
  response.cookies.set(LOGOUT_HANDOFF_COOKIE, "", {
    httpOnly: true,
    secure: secureCookies(),
    sameSite: "lax",
    path: "/account/logout/shopify",
    maxAge: 0,
    expires: new Date(0),
    priority: "high",
  });
}

export async function readCustomerSession(): Promise<CustomerSession | null> {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = unseal<CustomerSession>(value);
  if (
    !session ||
    typeof session.accessToken !== "string" ||
    typeof session.idToken !== "string" ||
    typeof session.expiresAt !== "number"
  ) return null;
  return session;
}

export function customerSessionNeedsRefresh(session: CustomerSession): boolean {
  return session.expiresAt <= Math.floor(Date.now() / 1000) + 60;
}
