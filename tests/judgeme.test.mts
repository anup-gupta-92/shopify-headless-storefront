import assert from "node:assert/strict";
import test from "node:test";
import {
  fetchJudgeMeReviewPage,
  JUDGEME_CACHE_OPTIONS,
  JUDGEME_REVALIDATE_SECONDS,
  safelyLoadJudgeMeReviewPage,
  type JudgeMeSafeLogContext,
} from "../lib/judgeme/review-request.ts";

const credentials = {
  externalId: "123456789",
  page: 1,
  shopDomain: "example.myshopify.com",
  apiToken: "super-secret-token",
};

const validPayload = {
  reviews: [{
    uuid: "review-1",
    rating: 5,
    title: "Excellent",
    body: "Exactly as described.",
    reviewer_name: "A Customer",
    verified_buyer: true,
    created_at: "2026-10-01T10:00:00Z",
    pictures_urls: ["https://cdn.example.com/review.jpg"],
  }],
  total_pages: 1,
};

function captureLogs() {
  const entries: Array<[string, JudgeMeSafeLogContext]> = [];
  return {
    entries,
    logger: (message: string, context: JudgeMeSafeLogContext) => entries.push([message, context]),
  };
}

test("Judge.me review cache revalidates every 24 hours", () => {
  assert.equal(JUDGEME_REVALIDATE_SECONDS, 86_400);
  assert.equal(JUDGEME_CACHE_OPTIONS.revalidate, 86_400);
});

test("successful Judge.me responses are mapped and the secret-bearing fetch bypasses the URL cache", async () => {
  let requestedUrl = "";
  let requestedCache: RequestCache | undefined;
  const result = await fetchJudgeMeReviewPage({
    ...credentials,
    signal: new AbortController().signal,
    fetchImpl: (async (input, init) => {
      requestedUrl = input.toString();
      requestedCache = init?.cache;
      return Response.json(validPayload);
    }) as typeof fetch,
  });

  assert.equal(requestedCache, "no-store");
  assert.match(requestedUrl, /api_token=super-secret-token/);
  assert.deepEqual(result, {
    reviews: [{
      id: "review-1",
      rating: 5,
      title: "Excellent",
      body: "Exactly as described.",
      reviewerName: "A Customer",
      verifiedBuyer: true,
      date: "2026-10-01T10:00:00Z",
      images: ["https://cdn.example.com/review.jpg"],
    }],
    page: 1,
    totalPages: 1,
  });
});

test("Judge.me timeouts fail softly without logging the token", async () => {
  const logs = captureLogs();
  const result = await safelyLoadJudgeMeReviewPage(
    () => fetchJudgeMeReviewPage({
      ...credentials,
      signal: new AbortController().signal,
      fetchImpl: (async () => {
        const error = new Error(`timed out: api_token=${credentials.apiToken}`);
        error.name = "TimeoutError";
        throw error;
      }) as typeof fetch,
    }),
    { productId: credentials.externalId, page: 1 },
    logs.logger,
  );

  assert.equal(result, null);
  assert.equal(logs.entries[0]?.[1].category, "timeout");
  assert.doesNotMatch(JSON.stringify(logs.entries), /super-secret-token|api_token/);
});

test("Judge.me 5xx responses fail softly with only the safe status logged", async () => {
  const logs = captureLogs();
  const result = await safelyLoadJudgeMeReviewPage(
    () => fetchJudgeMeReviewPage({
      ...credentials,
      signal: new AbortController().signal,
      fetchImpl: (async () => new Response("Unavailable", { status: 503 })) as typeof fetch,
    }),
    { productId: credentials.externalId, page: 1 },
    logs.logger,
  );

  assert.equal(result, null);
  assert.deepEqual(logs.entries[0]?.[1], {
    endpoint: "product_review",
    productId: credentials.externalId,
    page: 1,
    category: "http",
    status: 503,
  });
});

test("invalid Judge.me responses fail softly", async () => {
  const logs = captureLogs();
  const result = await safelyLoadJudgeMeReviewPage(
    () => fetchJudgeMeReviewPage({
      ...credentials,
      signal: new AbortController().signal,
      fetchImpl: (async () => Response.json({ unexpected: true })) as typeof fetch,
    }),
    { productId: credentials.externalId, page: 1 },
    logs.logger,
  );

  assert.equal(result, null);
  assert.equal(logs.entries[0]?.[1].category, "invalid-response");
});

test("network error details cannot leak a Judge.me API token into application logs", async () => {
  const logs = captureLogs();
  const result = await safelyLoadJudgeMeReviewPage(
    () => Promise.reject(new Error(`https://judge.me/api?api_token=${credentials.apiToken}`)),
    { productId: credentials.externalId, page: 2 },
    logs.logger,
  );

  assert.equal(result, null);
  assert.equal(logs.entries[0]?.[1].category, "network");
  assert.doesNotMatch(JSON.stringify(logs.entries), /super-secret-token|api_token/);
});
