export const siteConfig = {
  name: "Apex Business Supplies",
  shortName: "Apex",
  description:
    "Shop packaging supplies, PPE, abrasives, cleaning and workplace essentials from Apex Business Supplies. Reliable UK supply, same-day dispatch and free delivery over £79.",
  url: "https://www.apexbusinesssupplies.co.uk",
  logo: {
    lightTheme: "/images/logo-for-light.png",
    darkTheme: "/images/logo-for-dark.png",
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
    tagline: "Trusted UK-based provider for high-quality business supplies. Whether you're packaging products, protecting staff, or managing day-to-day office operations. Apex Business Supplies has you covered.",
  },
  contact: {
    email: "info@apexbusinesssupplies.co.uk",
    whatsApp: "https://wa.me/447950676723",
    tel: "+447950676723"
  },
  customerAccount: {
    hostedUrl: "https://account.apexbusinesssupplies.co.uk",
  },
} as const;

export type MainNavItem = (typeof siteConfig.mainNav)[number];
