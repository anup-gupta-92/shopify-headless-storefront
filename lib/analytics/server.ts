import "server-only";

export async function analyticsDatabase(): Promise<D1Database> {
  // Keep the Workers-native binding out of module evaluation so `next build`
  // can inspect the route without requiring a workerd runtime.
  const { env } = await import("cloudflare:workers");
  return env.ANALYTICS_DB;
}

export function countryCodeFromRequest(request: Request): string | null {
  const cf = Reflect.get(request, "cf") as { country?: unknown } | undefined;
  const value = typeof cf?.country === "string" ? cf.country : request.headers.get("cf-ipcountry");
  return value && /^[A-Z]{2}$/.test(value.toUpperCase()) ? value.toUpperCase() : null;
}
