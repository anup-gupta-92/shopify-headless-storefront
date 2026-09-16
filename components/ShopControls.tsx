"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useId, useOptimistic, useRef, useState, useTransition } from "react";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";
import type { CatalogFacets, CatalogFilterState, CatalogSort } from "@/types/catalog";

interface ShopControlsProps {
  filters: CatalogFilterState;
  facets: CatalogFacets;
  queryString: string;
  children: ReactNode;
}

type SelectionName = "vendors" | "productTypes";
type PriceName = "minPrice" | "maxPrice";

const PARAMS = {
  availability: "filter.v.availability",
  minPrice: "filter.v.price.gte",
  maxPrice: "filter.v.price.lte",
  vendors: "filter.p.vendor",
  productTypes: "filter.p.product_type",
} as const;

const sortOptions: Array<{ value: CatalogSort; label: string }> = [
  { value: "best-selling", label: "Best selling" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "title-asc", label: "Title A–Z" },
  { value: "newest", label: "Newest" },
];

function FilterSection({ title, defaultOpen, children }: { title: string; defaultOpen: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <section className="border-b border-border pb-5 last:border-b-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg text-left font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span>{title}</span>
        <svg aria-hidden="true" viewBox="0 0 20 20" className={`size-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m5 7.5 5 5 5-5" />
        </svg>
      </button>
      <div id={contentId} hidden={!open} className="pt-2">{children}</div>
    </section>
  );
}

function isSelected(selected: string[], value: string) {
  const key = value.toLocaleLowerCase();
  return selected.some((candidate) => candidate.toLocaleLowerCase() === key);
}

function FilterForm({ filters, facets, idPrefix, closeAfterApply, onPriceChange, onToggleSelection, onClear }: {
  filters: CatalogFilterState;
  facets: CatalogFacets;
  idPrefix: string;
  closeAfterApply?: () => void;
  onPriceChange: (name: PriceName, value: string) => void;
  onToggleSelection: (name: SelectionName, value: string, checked: boolean) => void;
  onClear: () => void;
}) {
  const commitPrice = (name: PriceName, rawValue: string) => {
    const normalized = rawValue.trim();
    const number = Number(normalized);
    const next = normalized && Number.isFinite(number) && number >= 0 ? String(number) : "";
    const current = filters[name] === undefined ? "" : String(filters[name]);
    if (next === current) return;
    closeAfterApply?.();
    onPriceChange(name, next);
  };

  const toggle = (name: SelectionName, value: string, checked: boolean) => {
    closeAfterApply?.();
    onToggleSelection(name, value, checked);
  };

  return (
    <div className="space-y-5">
      <FilterSection title="Availability" defaultOpen>
        <label className="flex min-h-11 items-center gap-3 rounded-lg text-foreground">
          <input type="checkbox" checked disabled className="size-4 accent-primary disabled:opacity-100" />
          <span>In stock ({facets.availability.inStock})</span>
        </label>
        <p className="pl-7 text-xs text-muted">Only products currently available to buy are shown.</p>
      </FilterSection>

      <FilterSection title="Price" defaultOpen>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor={`${idPrefix}-min-price`} className="mb-1 block text-xs text-muted">Minimum £</label>
            <input key={`${idPrefix}-min-${filters.minPrice ?? "empty"}`} id={`${idPrefix}-min-price`} type="number" min="0" step="0.01" inputMode="decimal" defaultValue={filters.minPrice ?? ""} onBlur={(event) => commitPrice("minPrice", event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); } }} className="min-h-11 w-full min-w-0 rounded-lg border border-border bg-background px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" />
          </div>
          <div>
            <label htmlFor={`${idPrefix}-max-price`} className="mb-1 block text-xs text-muted">Maximum £</label>
            <input key={`${idPrefix}-max-${filters.maxPrice ?? "empty"}`} id={`${idPrefix}-max-price`} type="number" min="0" step="0.01" inputMode="decimal" defaultValue={filters.maxPrice ?? ""} onBlur={(event) => commitPrice("maxPrice", event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); } }} className="min-h-11 w-full min-w-0 rounded-lg border border-border bg-background px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" />
          </div>
        </div>
        <p className="mt-2 text-xs text-muted">Prices update when you leave a field or press Enter.</p>
      </FilterSection>

      <FilterSection title="Brand" defaultOpen>
        <fieldset className="max-h-64 space-y-1 overflow-y-auto pr-1">
          <legend className="sr-only">Choose brands</legend>
          {facets.vendors.map((vendor) => {
            const inputId = `${idPrefix}-vendor-${vendor.value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
            return <label key={vendor.value.toLocaleLowerCase()} htmlFor={inputId} className="flex min-h-10 cursor-pointer items-start gap-3 rounded-lg px-1 py-2 ">
              <input id={inputId} type="checkbox" checked={isSelected(filters.vendors, vendor.value)} onChange={(event) => toggle("vendors", vendor.value, event.target.checked)} className="mt-0.5 size-4 shrink-0 accent-primary" />
              <span className="min-w-0 break-words text-sm">{vendor.value} <span className="text-muted">({vendor.count})</span></span>
            </label>;
          })}
        </fieldset>
      </FilterSection>

      <FilterSection title="Category" defaultOpen={false}>
        <fieldset className="max-h-72 space-y-1 overflow-y-auto pr-1">
          <legend className="sr-only">Choose categories</legend>
          {facets.productTypes.map((productType) => {
            const inputId = `${idPrefix}-category-${productType.value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
            return <label key={productType.value.toLocaleLowerCase()} htmlFor={inputId} className="flex min-h-10 cursor-pointer items-start gap-3 rounded-lg px-1 py-2 ">
              <input id={inputId} type="checkbox" checked={isSelected(filters.productTypes, productType.value)} onChange={(event) => toggle("productTypes", productType.value, event.target.checked)} className="mt-0.5 size-4 shrink-0 accent-primary" />
              <span className="min-w-0 break-words text-sm">{productType.value} <span className="text-muted">({productType.count})</span></span>
            </label>;
          })}
        </fieldset>
      </FilterSection>

      <div>
        <p className="mb-3 text-xs text-muted">Brand counts cover the published catalogue. Category counts include in-stock products only.</p>
        <button type="button" onClick={() => { closeAfterApply?.(); onClear(); }} className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-border bg-background px-3 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Clear filters</button>
      </div>
    </div>
  );
}

function ActiveFilterPills({ filters, onRemoveSelection, onRemovePrice, onClear }: {
  filters: CatalogFilterState;
  onRemoveSelection: (name: SelectionName, value: string) => void;
  onRemovePrice: () => void;
  onClear: () => void;
}) {
  const priceActive = filters.minPrice !== undefined || filters.maxPrice !== undefined;
  const count = filters.vendors.length + filters.productTypes.length + (priceActive ? 1 : 0);
  if (!count) return null;

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Active filters</p>
      <div className="flex flex-wrap items-center gap-2" aria-label="Active filters">
        {filters.vendors.map((vendor) => <button key={`vendor-${vendor.toLocaleLowerCase()}`} type="button" onClick={() => onRemoveSelection("vendors", vendor)} aria-label={`Remove brand filter ${vendor}`} className="max-w-full rounded-full border border-border bg-surface-muted px-3 py-1.5 text-left text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"><span className="break-words">{vendor}</span> <span aria-hidden="true">×</span></button>)}
        {filters.productTypes.map((productType) => <button key={`type-${productType.toLocaleLowerCase()}`} type="button" onClick={() => onRemoveSelection("productTypes", productType)} aria-label={`Remove category filter ${productType}`} className="max-w-full rounded-full border border-border bg-surface-muted px-3 py-1.5 text-left text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"><span className="break-words">{productType}</span> <span aria-hidden="true">×</span></button>)}
        {priceActive && <button type="button" onClick={onRemovePrice} aria-label="Remove price filter" className="rounded-full border border-border bg-surface-muted px-3 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          {filters.minPrice !== undefined && filters.maxPrice !== undefined ? `£${filters.minPrice}–£${filters.maxPrice}` : filters.minPrice !== undefined ? `From £${filters.minPrice}` : `Up to £${filters.maxPrice}`} <span aria-hidden="true">×</span>
        </button>}
        <button type="button" onClick={onClear} className="rounded px-2 py-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Clear all</button>
      </div>
    </div>
  );
}

function GridSkeleton() {
  return (
    <section aria-label="Loading products" aria-busy="true">
      <p className="sr-only" role="status">Updating products…</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 9 }, (_, index) => <ProductCardSkeleton key={index} />)}
      </div>
    </section>
  );
}

export default function ShopControls({ filters, facets, queryString, children }: ShopControlsProps) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [optimisticCatalog, setOptimisticCatalog] = useOptimistic({ filters, queryString });
  const [pending, startTransition] = useTransition();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

  const displayFilters = optimisticCatalog.filters;
  const activeQueryString = optimisticCatalog.queryString;
  const priceActive = displayFilters.minPrice !== undefined || displayFilters.maxPrice !== undefined;
  const activeFilterCount = displayFilters.vendors.length + displayFilters.productTypes.length + (priceActive ? 1 : 0);

  function navigate(params: URLSearchParams, nextFilters: CatalogFilterState) {
    const target = params.size ? `/shop?${params.toString()}` : "/shop";
    const current = queryString ? `/shop?${queryString}` : "/shop";
    if (target === current) return;
    startTransition(() => {
      setOptimisticCatalog({ filters: nextFilters, queryString: params.toString() });
      router.push(target, { scroll: false });
    });
  }

  function changePrice(name: PriceName, value: string) {
    const params = new URLSearchParams(activeQueryString);
    if (value) params.set(PARAMS[name], value);
    else params.delete(PARAMS[name]);
    navigate(params, { ...displayFilters, [name]: value ? Number(value) : undefined });
  }

  function toggleSelection(name: SelectionName, value: string, checked: boolean) {
    const key = value.toLocaleLowerCase();
    const current = displayFilters[name];
    const next = (checked
      ? [...current.filter((candidate) => candidate.toLocaleLowerCase() !== key), value]
      : current.filter((candidate) => candidate.toLocaleLowerCase() !== key)
    ).sort((a, b) => a.localeCompare(b));
    const params = new URLSearchParams(activeQueryString);
    params.delete(PARAMS[name]);
    for (const selected of next) params.append(PARAMS[name], selected);
    navigate(params, { ...displayFilters, [name]: next });
  }

  function changeSort(sort: CatalogSort) {
    const params = new URLSearchParams(activeQueryString);
    if (sort === "best-selling") params.delete("sort");
    else params.set("sort", sort);
    navigate(params, { ...displayFilters, sort });
  }

  function removePriceFilter() {
    const params = new URLSearchParams(activeQueryString);
    params.delete(PARAMS.minPrice);
    params.delete(PARAMS.maxPrice);
    navigate(params, { ...displayFilters, minPrice: undefined, maxPrice: undefined });
  }

  function clearFilters() {
    startTransition(() => {
      const nextFilters: CatalogFilterState = { inStock: true, vendors: [], productTypes: [], sort: "best-selling" };
      setOptimisticCatalog({ filters: nextFilters, queryString: "" });
      router.push("/shop", { scroll: false });
    });
  }

  useEffect(() => {
    if (!mobileOpen) return;
    const trigger = triggerRef.current;
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = drawerRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled])');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = priorOverflow;
      trigger?.focus();
    };
  }, [mobileOpen]);

  const desktopFormProps = { filters: displayFilters, facets, onPriceChange: changePrice, onToggleSelection: toggleSelection, onClear: clearFilters };
  const closeMobile = () => setMobileOpen(false);
  const mobilePills = <ActiveFilterPills
    filters={displayFilters}
    onRemoveSelection={(name, value) => { closeMobile(); toggleSelection(name, value, false); }}
    onRemovePrice={() => { closeMobile(); removePriceFilter(); }}
    onClear={() => { closeMobile(); clearFilters(); }}
  />;

  return (
    <div className="mt-8 grid min-w-0 gap-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside
        className={`hidden self-start rounded-xl border border-border bg-surface p-5 transition-opacity duration-200 lg:block ${
          pending ? "pointer-events-none opacity-50" : "opacity-100"
        }`}
        aria-label="Product filters"
        aria-busy={pending}
      >
        <h2 className="mb-4 text-lg font-bold">Filters</h2>
        <FilterForm {...desktopFormProps} idPrefix="desktop" />
      </aside>

      <div className="min-w-0">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">

          {/* LEFT SIDE */}
          <div className="min-w-0 flex-1">
            <div className="hidden lg:block">
              <ActiveFilterPills
                filters={displayFilters}
                onRemoveSelection={(name, value) =>
                  toggleSelection(name, value, false)
                }
                onRemovePrice={removePriceFilter}
                onClear={clearFilters}
              />
            </div>

            {/* MOBILE FILTER BUTTON */}
            <button
              ref={triggerRef}
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-haspopup="dialog"
              className="inline-flex min-h-11 items-center rounded-lg border border-border bg-surface px-4 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:hidden"
            >
              Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            </button>
          </div>

          {/* RIGHT SIDE */}
          <div className="shrink-0">
            <label
              htmlFor="shop-sort"
              className="mb-1 block text-xs font-medium text-muted"
            >
              Sort by
            </label>

            <select
              id="shop-sort"
              value={displayFilters.sort}
              onChange={(event) =>
                changeSort(event.target.value as CatalogSort)
              }
              className="min-h-11 rounded-lg border border-border bg-surface px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {pending ? <GridSkeleton /> : children}
      </div>

      {mobileOpen && <div className="fixed inset-0 z-[80] lg:hidden">
        <button type="button" aria-label="Close product filters" onClick={closeMobile} className="absolute inset-0 bg-black/60" />
        <aside ref={drawerRef} role="dialog" aria-modal="true" aria-labelledby="mobile-filters-title" className="absolute inset-y-0 left-0 flex h-[100dvh] w-[min(90vw,24rem)] flex-col border-r border-border bg-background shadow-2xl">
          <header className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 id="mobile-filters-title" className="text-xl font-bold">Filters</h2>
            <button ref={closeRef} type="button" onClick={closeMobile} aria-label="Close filters" className="inline-flex size-11 items-center justify-center rounded-lg border border-border bg-surface text-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">×</button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            {activeFilterCount > 0 && <div className="mb-5 border-b border-border pb-5">{mobilePills}</div>}
            <FilterForm {...desktopFormProps} idPrefix="mobile" closeAfterApply={closeMobile} />
          </div>
        </aside>
      </div>}
    </div>
  );
}
