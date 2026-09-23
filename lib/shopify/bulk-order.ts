import type { Money, Product, ProductOption, ProductVariant, QuantityRule } from "@/types/product";

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
  totalMinor: number;
  currencyCode: string;
  discountRate: number;
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

export function parsePackSize(label: string): number {
  const match = label.replaceAll(",", "").match(/\d+/);
  if (!match) return 1;
  const value = Number.parseInt(match[0], 10);
  return Number.isSafeInteger(value) && value > 0 ? value : 1;
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
  let totalMinor = 0;

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
        totalMinor += moneyToMinor(item.variant.money!) * item.quantity;
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
      totalMinor += discountedUnitMinor(moneyToMinor(variant.money), discountRate) * quantity;
    }
  }

  return {
    lines: consolidateBulkCartLines(lines), errors, selectedQuantity, totalMinor, currencyCode, discountRate,
  };
}
