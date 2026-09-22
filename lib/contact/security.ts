import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const MIN_AGE_MS = 3000;
const MAX_AGE_MS = 2 * 60 * 60 * 1000;

function signature(payload: string, key: string): string {
  return createHmac("sha256", key).update(`apex-contact-v1:${payload}`).digest("base64url");
}

export function createContactToken(): string | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  const payload = `${Date.now()}.${randomBytes(16).toString("base64url")}`;
  return `${payload}.${signature(payload, key)}`;
}

export function verifyContactToken(token: string): { valid: boolean; nonce?: string } {
  const key = process.env.RESEND_API_KEY;
  const match = /^(\d{13})\.([A-Za-z0-9_-]{22})\.([A-Za-z0-9_-]{43})$/.exec(token);
  if (!key || !match) return { valid: false };
  const age = Date.now() - Number(match[1]);
  if (age < MIN_AGE_MS || age > MAX_AGE_MS) return { valid: false };
  const payload = `${match[1]}.${match[2]}`;
  const actual = Buffer.from(match[3]);
  const expected = Buffer.from(signature(payload, key));
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return { valid: false };
  return { valid: true, nonce: match[2] };
}
