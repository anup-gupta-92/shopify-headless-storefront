import "server-only";
import { createDecipheriv, createHash } from "node:crypto";
import { inflateRawSync } from "node:zlib";
import { cookies } from "next/headers";
import { getShopifyStorefrontPrivateToken } from "../config";

export const SESSION_COOKIE = "apex_customer_session";

export interface CustomerSession {
  accessToken: string;
  expiresAt: number;
  idToken: string;
  refreshToken?: string;
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
