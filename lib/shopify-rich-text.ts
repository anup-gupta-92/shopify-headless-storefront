import sanitizeHtml from "sanitize-html";
import { siteConfig } from "../config/site.ts";

function isExternalLink(href: string): boolean {
  if (!/^https?:\/\//i.test(href)) return false;
  try {
    const targetHost = new URL(href).hostname.replace(/^www\./i, "").toLowerCase();
    const siteHost = new URL(siteConfig.url).hostname.replace(/^www\./i, "").toLowerCase();
    return targetHost !== siteHost;
  } catch {
    return false;
  }
}

export function sanitizeShopifyHtml(html: string, options: { allowEmbeddedMedia?: boolean } = {}): string {
  const mediaTags = options.allowEmbeddedMedia ? ["figure", "figcaption", "img", "iframe"] : [];
  return sanitizeHtml(html, {
    allowedTags: [
      "p", "br", "h2", "h3", "h4", "ul", "ol", "li", "strong", "b", "em", "i", "a",
      "blockquote", "table", "thead", "tbody", "tfoot", "tr", "th", "td", ...mediaTags,
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title", "width", "height", "loading", "decoding"],
      iframe: ["src", "title", "width", "height", "loading", "allow", "allowfullscreen", "referrerpolicy"],
      th: ["colspan", "rowspan", "scope"],
      td: ["colspan", "rowspan"],
    },
    allowedSchemes: ["https", "http", "mailto"],
    allowedIframeHostnames: [
      "www.youtube.com",
      "youtube.com",
      "www.youtube-nocookie.com",
      "player.vimeo.com",
    ],
    allowProtocolRelative: false,
    transformTags: {
      a: (tagName, attributes) => ({
        tagName,
        attribs: isExternalLink(attributes.href ?? "")
          ? { ...attributes, target: "_blank", rel: "noopener noreferrer" }
          : attributes,
      }),
      img: (tagName, attributes) => ({
        tagName,
        attribs: { ...attributes, loading: "lazy", decoding: "async" },
      }),
      iframe: (tagName, attributes) => ({
        tagName,
        attribs: { ...attributes, loading: "lazy" },
      }),
    },
  });
}
