import assert from "node:assert/strict";
import test from "node:test";
import {
  availableOptionValues,
  completeUniqueOptionSelections,
  initialSelectedVariant,
  resolveSelectedVariant,
  selectionsFromVariant,
  updateOptionSelection,
} from "../lib/product-options.ts";
import type { ProductOption, ProductVariant } from "../types/product.ts";

const options: ProductOption[] = [
  { name: "Size", values: ["Small", "Large"] },
  { name: "Gauge", values: ["100", "200"] },
  { name: "Pack Size", values: ["100", "500"] },
];

function variant(id: string, size: string, gauge: string, pack: string, available = true): ProductVariant {
  return {
    id: `gid://shopify/ProductVariant/${id}`,
    title: `${size} / ${gauge} / ${pack}`,
    price: "£10.00",
    available,
    selectedOptions: [
      { name: "Size", value: size },
      { name: "Gauge", value: gauge },
      { name: "Pack Size", value: pack },
    ],
  };
}

const variants = [
  variant("1", "Small", "100", "100"),
  variant("2", "Small", "200", "500"),
  variant("3", "Large", "200", "100"),
  variant("4", "Large", "200", "500", false),
];

test("progressive options expose only values backed by real variant prefixes", () => {
  assert.deepEqual(availableOptionValues(variants, options, {}, 0), ["Small", "Large"]);
  assert.deepEqual(availableOptionValues(variants, options, {}, 1), []);
  assert.deepEqual(availableOptionValues(variants, options, { Size: "Small" }, 1), ["100", "200"]);
  assert.deepEqual(availableOptionValues(variants, options, { Size: "Small", Gauge: "100" }, 2), ["100"]);
  assert.deepEqual(availableOptionValues(variants, options, { Size: "Large", Gauge: "200" }, 2), ["100", "500"]);
});

test("changing an option preserves its prefix and clears every dependent selection", () => {
  const selected = { Size: "Small", Gauge: "100", "Pack Size": "100" };
  assert.deepEqual(updateOptionSelection(options, selected, 0, "Large"), { Size: "Large" });
  assert.deepEqual(updateOptionSelection(options, selected, 1, "200"), { Size: "Small", Gauge: "200" });
});

test("single-variant products preselect their Shopify variant", () => {
  const singleVariant = variant("single", "Small", "100", "100");
  assert.equal(initialSelectedVariant([singleVariant], null, false, singleVariant), singleVariant);
  assert.deepEqual(selectionsFromVariant(singleVariant), { Size: "Small", Gauge: "100", "Pack Size": "100" });
});

test("a uniquely determined dependent option is selected automatically", () => {
  const selected = completeUniqueOptionSelections(
    variants,
    options,
    { Size: "Small", Gauge: "100" },
    2,
  );
  assert.deepEqual(selected, { Size: "Small", Gauge: "100", "Pack Size": "100" });
});

test("multiple valid dependent choices remain unselected", () => {
  const selected = completeUniqueOptionSelections(variants, options, { Size: "Small" }, 1);
  assert.deepEqual(selected, { Size: "Small" });
});

test("unique dependent choices cascade across remaining option groups", () => {
  const cascadeVariants = [variant("cascade", "Small", "100", "100")];
  const selected = completeUniqueOptionSelections(cascadeVariants, options, { Size: "Small" }, 1);
  assert.deepEqual(selected, { Size: "Small", Gauge: "100", "Pack Size": "100" });
});

test("changing an earlier option clears stale values before unique choices are applied", () => {
  const previous = { Size: "Small", Gauge: "100", "Pack Size": "100" };
  const cleared = updateOptionSelection(options, previous, 0, "Large");
  const selected = completeUniqueOptionSelections(variants, options, cleared, 1);
  assert.deepEqual(selected, { Size: "Large", Gauge: "200" });
});

test("a variant resolves only from a complete real combination", () => {
  assert.equal(resolveSelectedVariant(variants, options, { Size: "Small", Gauge: "100" }), undefined);
  assert.equal(resolveSelectedVariant(variants, options, { Size: "Small", Gauge: "100", "Pack Size": "500" }), undefined);
  assert.equal(resolveSelectedVariant(variants, options, { Size: "Small", Gauge: "100", "Pack Size": "100" })?.id, variants[0].id);
});

test("out-of-stock variants remain resolvable so the UI can retain and disable them", () => {
  const selected = resolveSelectedVariant(variants, options, { Size: "Large", Gauge: "200", "Pack Size": "500" });
  assert.equal(selected?.id, variants[3].id);
  assert.equal(selected?.available, false);
});

test("a uniquely determined sold-out combination remains selected but unavailable", () => {
  const soldOutVariants = [variant("sold-out", "Small", "100", "100", false)];
  const selections = completeUniqueOptionSelections(soldOutVariants, options, { Size: "Small" }, 1);
  const selected = resolveSelectedVariant(soldOutVariants, options, selections);
  assert.deepEqual(selections, { Size: "Small", Gauge: "100", "Pack Size": "100" });
  assert.equal(selected?.available, false);
});

test("explicit variant URLs can initialise every configured option", () => {
  assert.deepEqual(selectionsFromVariant(variants[1]), { Size: "Small", Gauge: "200", "Pack Size": "500" });
});
