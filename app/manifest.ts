import type { MetadataRoute } from "next";
import { siteConfig } from "../config/site.ts";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: siteConfig.shortName,
    description: siteConfig.description,
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: siteConfig.theme.lightBackground,
    theme_color: siteConfig.theme.primary,
    lang: "en-GB",
    dir: "ltr",
    categories: ["business", "shopping"],
    prefer_related_applications: false,
    icons: [
      {
        src: "/images/pwa-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/images/pwa-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/images/pwa-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
