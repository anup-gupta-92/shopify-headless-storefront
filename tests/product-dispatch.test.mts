import assert from "node:assert/strict";
import test from "node:test";
import {
  getLondonDispatchMessage,
  isSpecialDispatchProduct,
  LONDON_TIME_ZONE,
} from "../lib/product-dispatch.ts";

test("identifies each special-product rule after normalization", () => {
  assert.equal(isSpecialDispatchProduct({ vendor: " Weller Packaging " }), true);
  assert.equal(isSpecialDispatchProduct({ collectionHandles: ["NEW-PACKAGING-SUPPLIES"] }), true);
  assert.equal(isSpecialDispatchProduct({ tags: [" Ultimate-Industrial "] }), true);
  assert.equal(isSpecialDispatchProduct({ vendor: "Apex Business Supplies", tags: ["packaging"] }), false);
});

test("shows the London countdown before the cutoff in winter", () => {
  assert.equal(LONDON_TIME_ZONE, "Europe/London");
  assert.equal(
    getLondonDispatchMessage(new Date("2026-01-15T12:43:00Z")),
    "Order within 2h : 17m for delivery as soon as tomorrow",
  );
});

test("uses Europe/London daylight saving time automatically", () => {
  assert.equal(
    getLondonDispatchMessage(new Date("2026-07-15T11:43:00Z")),
    "Order within 2h : 17m for delivery as soon as tomorrow",
  );
});

test("uses minutes only when less than one hour remains", () => {
  assert.equal(
    getLondonDispatchMessage(new Date("2026-01-15T14:18:00Z")),
    "Order within 42m for delivery as soon as tomorrow",
  );
});

test("shows the normal delivery estimate at and after the cutoff", () => {
  assert.equal(
    getLondonDispatchMessage(new Date("2026-01-15T15:00:00Z")),
    "Delivery estimate: 2–3 business days",
  );
  assert.equal(
    getLondonDispatchMessage(new Date("2026-07-15T14:00:00Z")),
    "Delivery estimate: 2–3 business days",
  );
});
