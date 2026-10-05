export const MAX_CART_PERMALINK_LINES = 50;
export const MAX_CART_PERMALINK_QUANTITY = 999;

const VARIANT_ID_PATTERN = /^[1-9]\d{0,19}$/;
const ENTRY_PATTERN = /^([1-9]\d{0,19}):([1-9]\d{0,2})$/;
const VARIANT_GID_PREFIX = "gid://shopify/ProductVariant/";

export interface CartPermalinkLine {
  merchandiseId: string;
  quantity: number;
}

export interface CartPermalinkContext {
  countryCode?: "GB";
  attributes?: Array<{ key: string; value: string }>;
}

export function parseCartPermalink(value: string): CartPermalinkLine[] | null {
  if (!value || value.length > 4_096) return null;

  const entries = value.split(",");
  if (entries.length < 1 || entries.length > MAX_CART_PERMALINK_LINES) return null;

  const quantities = new Map<string, number>();
  for (const entry of entries) {
    const match = ENTRY_PATTERN.exec(entry);
    if (!match || !VARIANT_ID_PATTERN.test(match[1])) return null;

    const quantity = Number(match[2]);
    const merchandiseId = `${VARIANT_GID_PREFIX}${match[1]}`;
    const combinedQuantity = (quantities.get(merchandiseId) ?? 0) + quantity;
    if (!Number.isSafeInteger(combinedQuantity)
      || combinedQuantity < 1
      || combinedQuantity > MAX_CART_PERMALINK_QUANTITY) return null;
    quantities.set(merchandiseId, combinedQuantity);
  }

  return [...quantities].map(([merchandiseId, quantity]) => ({ merchandiseId, quantity }));
}

export function cartPermalinkContext(searchParams: URLSearchParams): CartPermalinkContext {
  const context: CartPermalinkContext = {};
  if (searchParams.get("country") === "GB") context.countryCode = "GB";
  if (searchParams.get("attributes[from]") === "new-customer-accounts") {
    context.attributes = [{ key: "from", value: "new-customer-accounts" }];
  }
  return context;
}

export function purchasableCartPermalinkLines(
  requested: CartPermalinkLine[],
  purchasableMerchandiseIds: ReadonlySet<string>,
): { lines: CartPermalinkLine[]; omittedCount: number } {
  const lines = requested.filter(({ merchandiseId }) => purchasableMerchandiseIds.has(merchandiseId));
  return { lines, omittedCount: requested.length - lines.length };
}

export function cartPermalinkWasFullyCreated(
  requested: CartPermalinkLine[],
  created: ReadonlyArray<CartPermalinkLine>,
): boolean {
  if (requested.length !== created.length) return false;
  const createdQuantities = new Map(created.map((line) => [line.merchandiseId, line.quantity]));
  return requested.every((line) => createdQuantities.get(line.merchandiseId) === line.quantity);
}
