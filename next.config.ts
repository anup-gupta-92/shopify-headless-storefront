import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "cdn.shopify.com", pathname: "/s/files/**" }],
  },
  async redirects() {
    return [
      { source: "/collections/:collection/products/:product", destination: "/products/:product", permanent: true },
      { source: "/collections", destination: "/shop", permanent: true },
      { source: "/products", destination: "/shop", permanent: true },
      { source: "/products/aurelia®-vibrant", destination: "/products/aurelia-vibrant", permanent: true },
      { source: "/products/aurelia%C2%AE-vibrant", destination: "/products/aurelia-vibrant", permanent: true },
      { source: "/collections/all", destination: "/shop", permanent: true },
      { source: "/collections/renaissance-wax-1", destination: "/collections/renaissance-wax", permanent: true },
      { source: "/pages/about-us", destination: "/about", permanent: true },
      { source: "/pages/contact", destination: "/contact", permanent: true },
      { source: "/pages/premium-hand-protection-for-every-industry", destination: "/collections/safety-gear", permanent: true },
      { source: "/pages/packaging-supplies", destination: "/collections/packaging-supplies", permanent: true },
      { source: "/pages/surface-protection", destination: "/collections/protection-cleaning", permanent: true },
      { source: "/pages/high-quality-abrasives-for-every-need", destination: "/collections/abrasives", permanent: true },
      { source: "/pages/high-quality-abrasives-for-every-needs", destination: "/collections/abrasives", permanent: true },
      { source: "/pages/cleaning-products", destination: "/collections/protection-cleaning", permanent: true },
      { source: "/pages/track-your-order", destination: "https://account.apexbusinesssupplies.co.uk/", permanent: true },
    ];
  },
};

export default nextConfig;
