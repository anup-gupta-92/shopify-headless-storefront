import type { ProductOption, ProductVariant } from "@/types/product";

export type ProductOptionSelections = Record<string, string>;

export function resolveVariant(variants: ProductVariant[], selections: Record<string, string>) {
  return variants.find((variant) => variant.selectedOptions?.length && variant.selectedOptions.every(({ name, value }) => selections[name] === value));
}

export function selectionsFromVariant(variant: ProductVariant | undefined): ProductOptionSelections {
  return Object.fromEntries(variant?.selectedOptions?.map(({ name, value }) => [name, value]) ?? []);
}

export function initialSelectedVariant(
  variants: ProductVariant[],
  requestedId: string | null,
  requiresOptionSelection: boolean,
  defaultVariant: ProductVariant | undefined,
): ProductVariant | undefined {
  const requestedVariant = variants.find((variant) =>
    variantUrlId(variant.id) === requestedId || variant.id === requestedId,
  );
  return requestedVariant ?? (requestedId || requiresOptionSelection ? undefined : defaultVariant);
}

export function updateOptionSelection(
  options: ProductOption[],
  selections: ProductOptionSelections,
  optionIndex: number,
  value: string,
): ProductOptionSelections {
  const next: ProductOptionSelections = {};
  for (let index = 0; index < optionIndex; index += 1) {
    const option = options[index];
    if (selections[option.name]) next[option.name] = selections[option.name];
  }
  if (value) next[options[optionIndex].name] = value;
  return next;
}

export function availableOptionValues(
  variants: ProductVariant[],
  options: ProductOption[],
  selections: ProductOptionSelections,
  optionIndex: number,
): string[] {
  const option = options[optionIndex];
  const previousOptions = options.slice(0, optionIndex);
  if (previousOptions.some((entry) => !selections[entry.name])) return [];

  const values = new Set(
    variants.flatMap((variant) => {
      const matchesPrevious = previousOptions.every((entry) =>
        variant.selectedOptions?.some(({ name, value }) => name === entry.name && value === selections[entry.name]),
      );
      if (!matchesPrevious) return [];
      const selected = variant.selectedOptions?.find(({ name }) => name === option.name)?.value;
      return selected ? [selected] : [];
    }),
  );
  return option.values.filter((value) => values.has(value));
}

export function completeUniqueOptionSelections(
  variants: ProductVariant[],
  options: ProductOption[],
  selections: ProductOptionSelections,
  startIndex: number,
): ProductOptionSelections {
  const next = { ...selections };
  for (let index = startIndex; index < options.length; index += 1) {
    const values = availableOptionValues(variants, options, next, index);
    if (values.length !== 1) break;
    next[options[index].name] = values[0];
  }
  return next;
}

export function resolveSelectedVariant(
  variants: ProductVariant[],
  options: ProductOption[],
  selections: ProductOptionSelections,
): ProductVariant | undefined {
  if (!options.length || options.some((option) => !selections[option.name])) return undefined;
  return variants.find((variant) => options.every((option) =>
    variant.selectedOptions?.some(({ name, value }) => name === option.name && value === selections[option.name]),
  ));
}

export function variantUrlId(id: string) {
  return id.startsWith("gid://shopify/ProductVariant/") ? id.split("/").pop()! : id;
}
