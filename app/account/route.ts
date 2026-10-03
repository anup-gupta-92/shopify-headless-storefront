import { siteConfig } from "../../config/site.ts";

const hostedAccountUrl = new URL("/", siteConfig.customerAccount.hostedUrl).toString();

export function GET() {
  return Response.redirect(hostedAccountUrl, 308);
}

export const HEAD = GET;
