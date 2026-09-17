import "server-only";

import sanitizeHtml from "sanitize-html";

export default function ShopifyRichText({ html, text }: { html?: string; text: string }) {
  const safeHtml = sanitizeHtml(html ?? "", {
    allowedTags: [
      "p", "br", "h2", "h3", "h4", "ul", "ol", "li", "strong", "b", "em", "i", "a",
      "blockquote", "table", "thead", "tbody", "tfoot", "tr", "th", "td",
    ],
    allowedAttributes: {
      a: ["href", "title"],
      th: ["colspan", "rowspan", "scope"],
      td: ["colspan", "rowspan"],
    },
    allowedSchemes: ["https", "http", "mailto"],
    allowProtocolRelative: false,
  });

  if (!safeHtml.trim() && !text.trim()) return null;

  return (
    <div className="break-words text-muted leading-relaxed [overflow-wrap:anywhere] [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:pl-4 [&_h2]:my-4 [&_h2]:text-xl [&_h3]:my-3 [&_h3]:text-lg [&_h4]:font-semibold [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-3 [&_strong]:font-semibold [&_table]:my-6 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:px-4 [&_td]:py-3 [&_td]:align-top [&_th]:border [&_th]:border-border [&_th]:bg-surface [&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:font-semibold [&_th]:text-foreground [&_ul]:list-disc [&_ul]:pl-6">
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
