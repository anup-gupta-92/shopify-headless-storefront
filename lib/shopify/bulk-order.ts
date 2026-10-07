import type { Money, Product, ProductOption, ProductVariant, QuantityRule } from "../../types/product.ts";
import { moneyAmountToMinorUnits } from "./pricing.ts";
import { parsePackSize, parseStrictPackSize } from "./unit-price.ts";

export { parsePackSize } from "./unit-price.ts";

export const BULK_DISCOUNT_TIERS = [
  { minimumQuantity: 20, rate: 0.03 },
  { minimumQuantity: 10, rate: 0.02 },
] as const;

export const SIMPLE_TIER_STEPS = [1, 10, 20] as const;

export const QUANTITY_OPTION_TERMS = [
  "quantity", "pack of", "pcs", "pieces", "box", "boxes", "pack", "packs",
  "qty", "unit", "units", "pairs", "cloths",
] as const;

export type BulkOrderMode = "matrix" | "quantity_only" | "variant_matrix" | "simple";

export interface BulkCartLine {
  merchandiseId: string;
  quantity: number;
}

export interface BulkMatrixCell {
  columnValue: string;
  variant: ProductVariant | null;
}

export interface BulkMatrixRow {
  key: string;
  label: string;
  cells: BulkMatrixCell[];
}

export interface BulkOrderModel {
  mode: BulkOrderMode;
  productTitle: string;
  rowOptionName: string;
  columnOptionName: string;
  columnValues: string[];
  rows: BulkMatrixRow[];
  variants: ProductVariant[];
}

export interface PackVariant {
  variant: ProductVariant;
  packSize: number;
  inventoryLimit: number | null;
}

export interface PackCombination {
  valid: boolean;
  items: Array<{ variant: ProductVariant; quantity: number; packSize: number }>;
}

export interface BulkOrderError {
  key: string;
  message: string;
}

export interface BulkOrderEvaluation {
  lines: BulkCartLine[];
  errors: BulkOrderError[];
  selectedQuantity: number;
  baseTotalMinor: number;
  totalMinor: number;
  estimatedSavingsMinor: number;
  packValueSavings: Record<string, PackValueSaving>;
  /** Null means at least one resolved pack line could not be compared safely. */
  packSavingsMinor: number | null;
  currencyCode: string;
  discountRate: number;
}

export interface PackValueSaving {
  savingMinor: number;
  percentageTenths: number;
  baselinePackSize: number;
  currencyCode: string;
}

interface PackValueComparison extends PackValueSaving {
  savingNumerator: bigint;
  savingDenominator: bigint;
}

function meaningfulOptions(options: ProductOption[] | undefined): ProductOption[] {
  return (options ?? []).filter((option) => option.values.length > 0);
}

export function isQuantityOptionName(name: string): boolean {
  const normalized = name.trim().toLocaleLowerCase();
  return QUANTITY_OPTION_TERMS.some((term) => normalized.includes(term));
}

export function detectQuantityOption(options: ProductOption[] | undefined): ProductOption | undefined {
  return meaningfulOptions(options).find((option) => isQuantityOptionName(option.name));
}

export function determineBulkOrderMode(product: Pick<Product, "options" | "variants">): BulkOrderMode | null {
  const options = meaningfulOptions(product.options);
  const variants = product.variants ?? [];
  if (variants.length === 0) return null;

  const quantityOption = detectQuantityOption(options);
  if (quantityOption) {
    if (variants.length <= 1) return null;
    if (options.length === 1) return "quantity_only";
    if (options.length === 2) return "matrix";
    return null;
  }

  return options.length === 2 ? "variant_matrix" : "simple";
}

function selectedOptionValue(variant: ProductVariant, optionName: string): string | undefined {
  return variant.selectedOptions?.find((option) => option.name === optionName)?.value;
}

function variantForValues(
  variants: ProductVariant[],
  selections: Record<string, string>,
): ProductVariant | null {
  return variants.find((variant) => Object.entries(selections).every(
    ([name, value]) => selectedOptionValue(variant, name) === value,
  )) ?? null;
}

export function createBulkOrderModel(product: Product): BulkOrderModel | null {
  const mode = determineBulkOrderMode(product);
  const variants = (product.variants ?? []).filter((variant) => variant.money);
  const options = meaningfulOptions(product.options);
  if (!mode || variants.length === 0) return null;

  if (mode === "simple") {
    return {
      mode,
      productTitle: product.title,
      rowOptionName: "Variant",
      columnOptionName: "Order",
      columnValues: [],
      variants,
      rows: variants.map((variant) => ({
        key: variant.id,
        label: variant.title === "Default Title" ? product.title : variant.title,
        cells: [{ columnValue: "", variant }],
      })),
    };
  }

  if (mode === "quantity_only") {
    const quantityOption = detectQuantityOption(options)!;
    return {
      mode,
      productTitle: product.title,
      rowOptionName: "Variant",
      columnOptionName: quantityOption.name,
      columnValues: quantityOption.values,
      variants,
      rows: [{
        key: "quantity",
        label: product.title,
        cells: quantityOption.values.map((value) => ({
          columnValue: value,
          variant: variantForValues(variants, { [quantityOption.name]: value }),
        })),
      }],
    };
  }

  const quantityOption = mode === "matrix" ? detectQuantityOption(options)! : options[1];
  const rowOption = mode === "matrix"
    ? options.find((option) => option.name !== quantityOption.name)!
    : options[0];

  return {
    mode,
    productTitle: product.title,
    rowOptionName: rowOption.name,
    columnOptionName: quantityOption.name,
    columnValues: quantityOption.values,
    variants,
    rows: rowOption.values.map((rowValue) => ({
      key: rowValue,
      label: rowValue,
      cells: quantityOption.values.map((columnValue) => ({
        columnValue,
        variant: variantForValues(variants, {
          [rowOption.name]: rowValue,
          [quantityOption.name]: columnValue,
        }),
      })),
    })),
  };
}

export function getInventoryLimit(variant: ProductVariant): number | null {
  if (variant.available === false) return 0;
  const inventory = variant.quantityAvailable;
  const maximum = variant.quantityRule?.maximum;
  if (variant.currentlyNotInStock) return typeof maximum === "number" ? Math.max(0, maximum) : null;
  if (typeof inventory === "number" && typeof maximum === "number") return Math.max(0, Math.min(inventory, maximum));
  if (typeof inventory === "number") return Math.max(0, inventory);
  if (typeof maximum === "number") return Math.max(0, maximum);
  return null;
}

function quantityMatchesRule(quantity: number, rule: QuantityRule | undefined): boolean {
  if (quantity === 0 || !rule) return true;
  if (quantity < rule.minimum || (rule.maximum !== null && quantity > rule.maximum)) return false;
  return quantity % rule.increment === 0;
}

export function buildLargestPackCombination(quantity: number, packVariants: PackVariant[]): PackCombination {
  if (!Number.isSafeInteger(quantity) || quantity < 1) return { valid: false, items: [] };
  const variants = packVariants
    .filter(({ variant, packSize }) => variant.available !== false && Number.isSafeInteger(packSize) && packSize > 0)
    .sort((left, right) => right.packSize - left.packSize);
  let result: PackCombination["items"] | null = null;

  function search(index: number, remaining: number, items: PackCombination["items"]): boolean {
    if (remaining === 0) {
      result = items;
      return true;
    }
    if (index >= variants.length || remaining < 0) return false;

    const candidate = variants[index];
    const limit = candidate.inventoryLimit;
    const maximum = Math.min(
      Math.floor(remaining / candidate.packSize),
      limit === null ? Number.MAX_SAFE_INTEGER : limit,
    );

    for (let count = maximum; count >= 0; count -= 1) {
      if (!quantityMatchesRule(count, candidate.variant.quantityRule)) continue;
      const next = count > 0
        ? [...items, { variant: candidate.variant, quantity: count, packSize: candidate.packSize }]
        : items;
      if (search(index + 1, remaining - count * candidate.packSize, next)) return true;
    }
    return false;
  }

  search(0, quantity, []);
  return { valid: result !== null, items: result ?? [] };
}

export function getBulkDiscountRate(quantity: number): number {
  return BULK_DISCOUNT_TIERS.find((tier) => quantity >= tier.minimumQuantity)?.rate ?? 0;
}

export function discountedUnitMinor(unitMinor: number, discountRate: number): number {
  return Math.ceil(unitMinor * (1 - discountRate));
}

export function moneyToMinor(money: Money): number {
  return Math.round(Number(money.amount) * 100);
}

export function minorToMoney(amount: number, currencyCode: string): Money {
  return { amount: (amount / 100).toFixed(2), currencyCode };
}

export function consolidateBulkCartLines(lines: BulkCartLine[]): BulkCartLine[] {
  const quantities = new Map<string, number>();
  for (const line of lines) quantities.set(line.merchandiseId, (quantities.get(line.merchandiseId) ?? 0) + line.quantity);
  return [...quantities].map(([merchandiseId, quantity]) => ({ merchandiseId, quantity }));
}

function greatestCommonDivisor(left: bigint, right: bigint): bigint {
  const zero = BigInt(0);
  let currentLeft = left < zero ? -left : left;
  let currentRight = right < zero ? -right : right;
  while (currentRight !== zero) {
    const remainder = currentLeft % currentRight;
    currentLeft = currentRight;
    currentRight = remainder;
  }
  return currentLeft || BigInt(1);
}

function addFractions(
  leftNumerator: bigint,
  leftDenominator: bigint,
  rightNumerator: bigint,
  rightDenominator: bigint,
): [numerator: bigint, denominator: bigint] {
  const divisor = greatestCommonDivisor(leftDenominator, rightDenominator);
  const leftMultiplier = rightDenominator / divisor;
  const rightMultiplier = leftDenominator / divisor;
  const numerator = leftNumerator * leftMultiplier + rightNumerator * rightMultiplier;
  const denominator = leftDenominator * leftMultiplier;
  const reduction = greatestCommonDivisor(numerator, denominator);
  return [numerator / reduction, denominator / reduction];
}

function packValueComparisonsForRow(row: BulkMatrixRow): Map<string, PackValueComparison> {
  const candidates = row.cells.flatMap((cell) => {
    const packSize = parseStrictPackSize(cell.columnValue);
    const variant = cell.variant;
    const priceMinor = variant?.money ? moneyAmountToMinorUnits(variant.money.amount) : undefined;
    return variant?.available === true
      && variant.money
      && Boolean(variant.money.currencyCode.trim())
      && packSize !== null
      && priceMinor !== undefined
      ? [{ variant, packSize, priceMinor, currencyCode: variant.money.currencyCode }]
      : [];
  });

  if (candidates.length < 2) return new Map();
  const packSizes = candidates.map(({ packSize }) => packSize);
  if (new Set(packSizes).size !== packSizes.length) return new Map();

  candidates.sort((left, right) => left.packSize - right.packSize);
  const baseline = candidates[0];
  if (baseline.priceMinor <= 0) return new Map();

  const comparisons = new Map<string, PackValueComparison>();
  for (const candidate of candidates) {
    if (candidate.currencyCode !== baseline.currencyCode) continue;
    const baselineReferenceNumerator = BigInt(baseline.priceMinor) * BigInt(candidate.packSize);
    const denominator = BigInt(baseline.packSize);
    const savingNumerator = baselineReferenceNumerator - BigInt(candidate.priceMinor) * denominator;
    const positiveSavingNumerator = savingNumerator > BigInt(0) ? savingNumerator : BigInt(0);
    const savingMinor = Number(positiveSavingNumerator / denominator);
    const percentageTenths = positiveSavingNumerator > BigInt(0)
      ? Number((positiveSavingNumerator * BigInt(1_000)) / baselineReferenceNumerator)
      : 0;
    if (!Number.isSafeInteger(savingMinor) || !Number.isSafeInteger(percentageTenths)) continue;
    comparisons.set(candidate.variant.id, {
      savingMinor,
      percentageTenths,
      baselinePackSize: baseline.packSize,
      currencyCode: baseline.currencyCode,
      savingNumerator: positiveSavingNumerator,
      savingDenominator: denominator,
    });
  }
  return comparisons;
}

function buildPackValueComparisons(model: BulkOrderModel): Map<string, Map<string, PackValueComparison>> {
  if (model.mode !== "matrix" && model.mode !== "quantity_only") return new Map();
  return new Map(model.rows.map((row) => [row.key, packValueComparisonsForRow(row)]));
}

function publicPackValueSavings(
  rows: Map<string, Map<string, PackValueComparison>>,
): Record<string, PackValueSaving> {
  const savings: Record<string, PackValueSaving> = {};
  for (const comparisons of rows.values()) {
    for (const [variantId, comparison] of comparisons) {
      if (comparison.savingMinor <= 0) continue;
      savings[variantId] = {
        savingMinor: comparison.savingMinor,
        percentageTenths: comparison.percentageTenths,
        baselinePackSize: comparison.baselinePackSize,
        currencyCode: comparison.currencyCode,
      };
    }
  }
  return savings;
}

export function getPackValueSavings(model: BulkOrderModel): Record<string, PackValueSaving> {
  return publicPackValueSavings(buildPackValueComparisons(model));
}

function ruleError(variant: ProductVariant, quantity: number): string | null {
  if (quantity > 999) return `${variant.title} allows at most 999 packs per bulk action.`;
  const rule = variant.quantityRule;
  if (!rule || quantityMatchesRule(quantity, rule)) return null;
  if (quantity < rule.minimum) return `${variant.title} requires at least ${rule.minimum}.`;
  if (rule.maximum !== null && quantity > rule.maximum) return `${variant.title} allows at most ${rule.maximum}.`;
  return `${variant.title} must be ordered in increments of ${rule.increment}.`;
}

function stockError(variant: ProductVariant, quantity: number): string | null {
  if (variant.available === false) return `${variant.title} is unavailable.`;
  const limit = getInventoryLimit(variant);
  return limit !== null && quantity > limit ? `Only ${limit} available for ${variant.title}.` : null;
}

export function evaluateBulkOrder(model: BulkOrderModel, quantities: Record<string, number>): BulkOrderEvaluation {
  const errors: BulkOrderError[] = [];
  const selectedQuantity = Object.values(quantities).reduce((sum, value) => sum + (Number.isSafeInteger(value) && value > 0 ? value : 0), 0);
  const matrixMode = model.mode === "matrix" || model.mode === "quantity_only";
  const discountRate = matrixMode ? 0 : getBulkDiscountRate(selectedQuantity);
  const currencyCode = model.variants.find((variant) => variant.money)?.money?.currencyCode ?? "GBP";
  const lines: BulkCartLine[] = [];
  let baseTotalMinor = 0;
  let totalMinor = 0;
  const packComparisons = buildPackValueComparisons(model);
  const packValueSavings = publicPackValueSavings(packComparisons);
  let packSelectionCount = 0;
  let packSavingsComparable = true;
  let packSavingsNumerator = BigInt(0);
  let packSavingsDenominator = BigInt(1);

  if (matrixMode) {
    for (const row of model.rows) {
      const desired = quantities[row.key] ?? 0;
      if (!Number.isSafeInteger(desired) || desired <= 0) continue;
      const packVariants = row.cells.flatMap((cell) => cell.variant?.money && cell.variant.available !== false
        ? [{ variant: cell.variant, packSize: parsePackSize(cell.columnValue), inventoryLimit: getInventoryLimit(cell.variant) }]
        : []);
      const combination = buildLargestPackCombination(desired, packVariants);
      if (!combination.valid) {
        const sizes = [...new Set(packVariants.map((entry) => entry.packSize))].sort((a, b) => a - b);
        errors.push({ key: row.key, message: `Quantity must match available pack sizes: ${sizes.join(", ")}.` });
        continue;
      }
      for (const item of combination.items) {
        const ruleMessage = ruleError(item.variant, item.quantity);
        const stockMessage = stockError(item.variant, item.quantity);
        if (ruleMessage || stockMessage) {
          errors.push({ key: row.key, message: ruleMessage ?? stockMessage! });
          continue;
        }
        lines.push({ merchandiseId: item.variant.id, quantity: item.quantity });
        const lineTotalMinor = moneyToMinor(item.variant.money!) * item.quantity;
        baseTotalMinor += lineTotalMinor;
        totalMinor += lineTotalMinor;
        packSelectionCount += 1;
        const comparison = packComparisons.get(row.key)?.get(item.variant.id);
        if (!comparison) {
          packSavingsComparable = false;
        } else if (comparison.savingNumerator > BigInt(0)) {
          [packSavingsNumerator, packSavingsDenominator] = addFractions(
            packSavingsNumerator,
            packSavingsDenominator,
            comparison.savingNumerator * BigInt(item.quantity),
            comparison.savingDenominator,
          );
        }
      }
    }
  } else {
    for (const variant of model.variants) {
      const quantity = quantities[variant.id] ?? 0;
      if (!Number.isSafeInteger(quantity) || quantity <= 0 || !variant.money) continue;
      const message = ruleError(variant, quantity) ?? stockError(variant, quantity);
      if (message) {
        errors.push({ key: variant.id, message });
        continue;
      }
      lines.push({ merchandiseId: variant.id, quantity });
      const unitMinor = moneyToMinor(variant.money);
      baseTotalMinor += unitMinor * quantity;
      totalMinor += discountedUnitMinor(unitMinor, discountRate) * quantity;
    }
  }

  const flooredPackSavings = packSavingsNumerator / packSavingsDenominator;
  const packSavingsMinor = matrixMode && packSelectionCount > 0 && packSavingsComparable
    && flooredPackSavings <= BigInt(Number.MAX_SAFE_INTEGER)
    ? Number(flooredPackSavings)
    : null;

  return {
    lines: consolidateBulkCartLines(lines),
    errors,
    selectedQuantity,
    baseTotalMinor,
    totalMinor,
    estimatedSavingsMinor: Math.max(0, baseTotalMinor - totalMinor),
    packValueSavings,
    packSavingsMinor,
    currencyCode,
    discountRate,
  };
}
