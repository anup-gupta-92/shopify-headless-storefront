import "server-only";
import {
  createHash,
  createPublicKey,
  randomBytes,
  timingSafeEqual,
  verify,
  type JsonWebKey,
} from "node:crypto";
import { getCustomerAccountClientId } from "../config";
import { getOpenIdConfiguration } from "./discovery";

export const CUSTOMER_ACCOUNT_SCOPES = "openid email customer-account-api:full";

export interface CustomerTokenResponse {
  accessToken: string;
  expiresIn: number;
  idToken: string;
  refreshToken?: string;
}

interface JsonWebKeySet { keys: Array<JsonWebKey & { kid?: string; alg?: string }> }
interface JwtHeader { alg?: string; kid?: string }
interface JwtClaims {
  iss?: string;
  aud?: string | string[];
  azp?: string;
  exp?: number;
  iat?: number;
  nonce?: string;
}

export function randomBase64Url(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function createCodeChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function parseJwtPart<T>(part: string): T {
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as T;
}

async function getJwks(jwksUri: string): Promise<JsonWebKeySet> {
  const response = await fetch(jwksUri, {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600, tags: ["shopify-customer-account-jwks"] },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("Shopify identity verification is unavailable");
  const body = await response.json() as JsonWebKeySet;
  if (!Array.isArray(body.keys)) throw new Error("Shopify identity keys are invalid");
  return body;
}

export async function verifyIdToken(idToken: string, expectedNonce?: string): Promise<JwtClaims> {
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("Shopify returned an invalid identity token");

  const header = parseJwtPart<JwtHeader>(parts[0]);
  const claims = parseJwtPart<JwtClaims>(parts[1]);
  if (!header.kid || !["RS256", "ES256"].includes(header.alg ?? "")) {
    throw new Error("Shopify returned an unsupported identity token");
  }

  const configuration = await getOpenIdConfiguration();
  const jwks = await getJwks(configuration.jwks_uri);
  const jwk = jwks.keys.find((candidate) => candidate.kid === header.kid);
  if (!jwk) throw new Error("Shopify identity key was not found");

  const signatureValid = verify(
    "sha256",
    Buffer.from(`${parts[0]}.${parts[1]}`),
    {
      key: createPublicKey({ key: jwk, format: "jwk" }),
      ...(header.alg === "ES256" ? { dsaEncoding: "ieee-p1363" as const } : {}),
    },
    Buffer.from(parts[2], "base64url"),
  );
  if (!signatureValid) throw new Error("Shopify identity token signature is invalid");

  const clientId = getCustomerAccountClientId();
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  const now = Math.floor(Date.now() / 1000);
  if (
    claims.iss?.replace(/\/$/, "") !== configuration.issuer ||
    !audiences.includes(clientId) ||
    (audiences.length > 1 && claims.azp !== clientId) ||
    typeof claims.exp !== "number" ||
    claims.exp <= now - 60 ||
    (typeof claims.iat === "number" && claims.iat > now + 60) ||
    (expectedNonce && (!claims.nonce || !safeEqual(claims.nonce, expectedNonce)))
  ) {
    throw new Error("Shopify identity token claims are invalid");
  }
  return claims;
}

async function requestToken(body: URLSearchParams, origin: string): Promise<CustomerTokenResponse> {
  const configuration = await getOpenIdConfiguration();
  let response: Response;
  try {
    response = await fetch(configuration.token_endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        Origin: origin,
        "User-Agent": "Apex-Business-Supplies-Headless/1.0",
      },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new Error("Shopify customer token service is unavailable");
  }
  if (!response.ok) throw new Error("Shopify customer authentication was not accepted");
  const token: unknown = await response.json().catch(() => null);
  if (!token || typeof token !== "object") throw new Error("Shopify returned an invalid token response");
  const value = token as Record<string, unknown>;
  if (
    typeof value.access_token !== "string" ||
    typeof value.id_token !== "string" ||
    typeof value.expires_in !== "number" ||
    value.expires_in <= 0
  ) throw new Error("Shopify returned an incomplete token response");
  return {
    accessToken: value.access_token,
    expiresIn: value.expires_in,
    idToken: value.id_token,
    refreshToken: typeof value.refresh_token === "string" ? value.refresh_token : undefined,
  };
}

export async function exchangeAuthorizationCode(input: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
  origin: string;
}): Promise<CustomerTokenResponse> {
  return requestToken(new URLSearchParams({
    grant_type: "authorization_code",
    client_id: getCustomerAccountClientId(),
    redirect_uri: input.redirectUri,
    code: input.code,
    code_verifier: input.codeVerifier,
  }), input.origin);
}

export async function refreshCustomerToken(refreshToken: string, origin: string): Promise<CustomerTokenResponse> {
  return requestToken(new URLSearchParams({
    grant_type: "refresh_token",
    client_id: getCustomerAccountClientId(),
    refresh_token: refreshToken,
  }), origin);
}
