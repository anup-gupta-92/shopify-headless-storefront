import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "cdn.shopify.com", pathname: "/s/files/**" }],
  },
  async redirects() {
    return [
      { source: "/pages/about-us", destination: "/about", permanent: true },
      { source: "/pages/contact", destination: "/contact", permanent: true },
      { source: "/pages/premium-hand-protection-for-every-industry", destination: "/collections/safety-gear", permanent: true },
      { source: "/pages/packaging-supplies", destination: "/collections/packaging-supplies", permanent: true },
      { source: "/pages/surface-protection", destination: "/collections/protection-cleaning", permanent: true },
      { source: "/pages/high-quality-abrasives-for-every-needs", destination: "/collections/abrasives", permanent: true },
    ];
  },
};

export default nextConfig;
