import "server-only";
import sanitizeHtml from "sanitize-html";

export default function ProductDescription({ html, text }: { html?: string; text: string }) {
  const safeHtml = sanitizeHtml(html ?? "", {
    allowedTags: ["p", "br", "h2", "h3", "h4", "ul", "ol", "li", "strong", "b", "em", "i", "a", "blockquote"],
    allowedAttributes: { a: ["href", "title"] },
    allowedSchemes: ["https", "http", "mailto"],
    allowProtocolRelative: false,
  });
  if (!safeHtml.trim() && !text.trim()) return null;
  return <section className="mt-12 min-w-0 border-y border-border py-8" aria-labelledby="product-description">
    <h2 id="product-description" className="mb-5 text-xl font-bold">Product Description</h2>
    <div className="break-words text-muted leading-relaxed [overflow-wrap:anywhere] [&_p]:my-3 [&_h2]:my-4 [&_h2]:text-xl [&_h3]:my-3 [&_h3]:text-lg [&_h4]:font-semibold [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-6 [&_ol]:pl-6 [&_li]:my-1 [&_a]:text-primary [&_a]:underline [&_strong]:font-semibold [&_blockquote]:border-l-2 [&_blockquote]:pl-4">
      {safeHtml.trim() ? <div dangerouslySetInnerHTML={{ __html: safeHtml }} /> : <p>{text}</p>}
    </div>
  </section>;
}
