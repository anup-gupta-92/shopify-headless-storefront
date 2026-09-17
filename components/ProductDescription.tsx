import "server-only";
import ShopifyRichText from "@/components/ShopifyRichText";

export default function ProductDescription({
  html,
  text,
}: {
  html?: string;
  text: string;
}) {
  if (!html?.trim() && !text.trim()) return null;

  return (
    <section
      className="mt-12 min-w-0 border-y border-border py-8"
      aria-labelledby="product-description"
    >
      <h2
        id="product-description"
        className="mb-5 text-xl font-bold"
      >
        Product Description
      </h2>

      <ShopifyRichText html={html} text={text} />
    </section>
  );
}
