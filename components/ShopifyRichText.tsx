import "server-only";

import { sanitizeShopifyHtml } from "@/lib/shopify-rich-text";

interface ShopifyRichTextProps {
  html?: string;
  text: string;
  variant?: "default" | "article";
}

export default function ShopifyRichText({ html, text, variant = "default" }: ShopifyRichTextProps) {
  const safeHtml = sanitizeShopifyHtml(html ?? "", { allowEmbeddedMedia: variant === "article" });
  const articleClasses = variant === "article"
    ? "text-base sm:text-lg [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-foreground sm:[&_h2]:text-3xl [&_h3]:mt-8 [&_h3]:mb-3 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-foreground sm:[&_h3]:text-2xl [&_h4]:mt-6 [&_h4]:text-lg [&_p]:my-5 [&_table]:min-w-[36rem]"
    : "[&_h2]:my-4 [&_h2]:text-xl [&_h3]:my-3 [&_h3]:text-lg [&_p]:my-3";

  if (!safeHtml.trim() && !text.trim()) return null;

  return (
    <div className={`break-words leading-relaxed text-muted [overflow-wrap:anywhere] [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_a]:focus-visible:outline-2 [&_a]:focus-visible:outline-offset-2 [&_a]:focus-visible:outline-primary [&_blockquote]:my-6 [&_blockquote]:border-l-2 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_figcaption]:mt-2 [&_figcaption]:text-center [&_figcaption]:text-sm [&_h4]:font-semibold [&_iframe]:my-6 [&_iframe]:aspect-video [&_iframe]:h-auto [&_iframe]:max-w-full [&_iframe]:w-full [&_img]:my-6 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-xl [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_strong]:font-semibold [&_table]:my-6 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:px-4 [&_td]:py-3 [&_td]:align-top [&_th]:border [&_th]:border-border [&_th]:bg-surface [&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:font-semibold [&_th]:text-foreground [&_ul]:list-disc [&_ul]:pl-6 ${articleClasses}`}>
      {safeHtml.trim() ? (
        <div className="overflow-x-auto">
          <div dangerouslySetInnerHTML={{ __html: safeHtml }} />
        </div>
      ) : (
        <p>{text}</p>
      )}
    </div>
  );
}
