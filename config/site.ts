export const siteConfig = {
  name: "Apex Business Supplies",
  shortName: "Apex",
  description:
    "Business, packaging, and workplace supplies from Apex Business Supplies.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  logo: {
    lightTheme: "/images/logo-for-light.webp",
    darkTheme: "/images/logo-for-dark.webp",
    alt: "Apex Business Supplies",
  },
  mainNav: [
    { label: "Home", href: "/" },
    { label: "Shop", href: "/shop" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ],
  footer: {
    businessName: "Apex Business Supplies",
    tagline: "Packaging and workplace essentials",
  },
  contact: {
    email: "info@apexbusinesssupplies.co.uk",
  },
} as const;

export type MainNavItem = (typeof siteConfig.mainNav)[number];
