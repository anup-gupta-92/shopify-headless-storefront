import assert from "node:assert/strict";
import test from "node:test";
import {
  articleCardExcerpt,
  articleSeoDescription,
  articleSeoTitle,
  blogArchivePath,
  blogArticlePath,
  estimateReadingMinutes,
  parseBlogPageNumber,
  resolveBlogPage,
} from "../lib/blog.ts";
import { sanitizeShopifyHtml } from "../lib/shopify-rich-text.ts";
import { buildArticleStructuredData } from "../lib/structured-data.ts";

const article = {
  id: "gid://shopify/Article/1",
  title: "FFP2 vs FFP3 Masks: What's the Difference?",
  handle: "ffp2-vs-ffp3-masks",
  excerpt: "A practical comparison of workplace masks.",
  excerptHtml: "<p>A practical comparison of <strong>workplace masks</strong>.</p>",
  content: "Useful article content about mask selection.",
  contentHtml: "<p>Useful article content about mask selection.</p>",
  image: null,
  authorV2: { name: "Apex Business Supplies" },
  publishedAt: "2026-10-06T08:38:04Z",
  tags: ["PPE"],
  seo: { title: "FFP2 vs FFP3 masks", description: "Compare FFP2 and FFP3 masks." },
};

test("blog URLs use the headless public structure and canonical pagination", () => {
  assert.equal(blogArticlePath("ffp2-vs-ffp3-masks"), "/blogs/ffp2-vs-ffp3-masks");
  assert.equal(blogArchivePath(), "/blogs");
  assert.equal(blogArchivePath(2), "/blogs?page=2");
  assert.equal(parseBlogPageNumber(undefined), 1);
  assert.equal(parseBlogPageNumber("3"), 3);
  assert.equal(parseBlogPageNumber("0"), null);
  assert.equal(parseBlogPageNumber(["1", "2"]), null);
});

test("article SEO prefers Shopify fields and falls back to clean excerpt content", () => {
  assert.equal(articleSeoTitle(article), "FFP2 vs FFP3 masks");
  assert.equal(articleSeoDescription(article), "Compare FFP2 and FFP3 masks.");

  assert.equal(
    articleSeoTitle({ ...article, seo: { title: null, description: null } }),
    "FFP2 vs FFP3 Masks: What's the Difference? | Apex Business Supplies",
  );
  assert.equal(
    articleSeoDescription({ ...article, seo: { title: null, description: null } }),
    "A practical comparison of workplace masks.",
  );
});

test("article cards and reading time degrade gracefully when optional content is absent", () => {
  assert.equal(
    articleCardExcerpt({ excerpt: null, excerptHtml: null }),
    "Read the full guide from Apex Business Supplies.",
  );
  assert.equal(estimateReadingMinutes(""), 1);
  assert.equal(estimateReadingMinutes(Array.from({ length: 221 }, () => "word").join(" ")), 2);
});

test("blog cursor pagination rejects out-of-range pages", async () => {
  const pages = new Map<string | undefined, { articles: number[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } }>([
    [undefined, { articles: [1, 2], pageInfo: { hasNextPage: true, endCursor: "page-2" } }],
    ["page-2", { articles: [3], pageInfo: { hasNextPage: false, endCursor: "end" } }],
  ]);
  assert.deepEqual(await resolveBlogPage(2, async (cursor) => pages.get(cursor) ?? null), pages.get("page-2"));
  assert.equal(await resolveBlogPage(3, async (cursor) => pages.get(cursor) ?? null), null);
});

test("Shopify article HTML is sanitized while safe editorial content remains usable", () => {
  const html = sanitizeShopifyHtml(`
    <p>Read <a href="/products/example">this product</a> and
    <a href="https://apexbusinesssupplies.co.uk/products/example-two">another product</a> and
    <a href="https://www.amazon.co.uk/example">Amazon</a>.</p>
    <img src="https://cdn.shopify.com/example.jpg" alt="Example">
    <iframe src="https://www.youtube-nocookie.com/embed/example" title="Video"></iframe>
    <iframe src="https://malicious.example/embed"></iframe>
    <script>alert(1)</script>
  `, { allowEmbeddedMedia: true });

  assert.match(html, /href="\/products\/example"/);
  assert.match(html, /href="https:\/\/apexbusinesssupplies\.co\.uk\/products\/example-two"/);
  assert.match(html, /href="https:\/\/www\.amazon\.co\.uk\/example"/);
  assert.equal((html.match(/target="_blank"/g) ?? []).length, 1);
  assert.equal((html.match(/rel="noopener noreferrer"/g) ?? []).length, 1);
  assert.match(html, /loading="lazy"/);
  assert.match(html, /youtube-nocookie\.com/);
  assert.doesNotMatch(html, /malicious\.example/);
  assert.doesNotMatch(html, /<script/);
});

test("article structured data uses production URLs and omits invented modified dates", () => {
  const schema = buildArticleStructuredData(article);
  const json = JSON.stringify(schema);
  assert.match(json, /"@type":"BlogPosting"/);
  assert.match(json, /https:\/\/www\.apexbusinesssupplies\.co\.uk\/blogs\/ffp2-vs-ffp3-masks/);
  assert.match(json, /"@type":"BreadcrumbList"/);
  assert.match(json, /"datePublished":"2026-10-06T08:38:04Z"/);
  assert.doesNotMatch(json, /dateModified/);
  assert.doesNotMatch(json, /workers\.dev|localhost/);
});
