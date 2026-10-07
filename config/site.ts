export const siteConfig = {
  name: "Apex Business Supplies",
  shortName: "Apex",
  description:
    "Shop packaging supplies, PPE, abrasives, cleaning and workplace essentials from Apex Business Supplies. Reliable UK supply, same-day dispatch and free delivery over £79.",
  url: "https://www.apexbusinesssupplies.co.uk",
  logo: {
    lightTheme: "/images/logo-for-light.webp",
    darkTheme: "/images/logo-for-dark.webp",
    alt: "Apex Business Supplies",
  },
  mainNav: [
    { label: "Home", href: "/" },
    { label: "Shop", href: "/shop" },
    { label: "Blogs", href: "/blogs" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ],
  blog: {
    shopifyHandle: "news",
    title: "Guides & Advice",
    description: "Practical guides, product comparisons and advice from Apex Business Supplies.",
  },
  footer: {
    businessName: "Apex Business Supplies",
    tagline: "Trusted UK-based provider for high-quality business supplies. Whether you're packaging products, protecting staff, or managing day-to-day office operations. Apex Business Supplies has you covered.",
  },
  contact: {
    email: "info@apexbusinesssupplies.co.uk",
    whatsApp: "https://wa.me/447950676723",
    tel: "+447950676723"
  },
  organization: {
    legalName: "Apex Business Supplies Ltd",
    telephone: "+44 7950 676723",
    address: {
      streetAddress: "159 Hospital Street",
      addressLocality: "Birmingham",
      postalCode: "B19 3XA",
      addressCountry: "GB",
    },
    sameAs: [
      "https://www.instagram.com/apexbusinesssupplies/",
      "https://www.linkedin.com/company/apex-business-supplies/",
    ],
  },
  customerAccount: {
    hostedUrl: "https://account.apexbusinesssupplies.co.uk",
  },
} as const;

export type MainNavItem = (typeof siteConfig.mainNav)[number];
