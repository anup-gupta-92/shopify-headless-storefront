"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { startNavigationProgress } from "@/components/RouteLoadingSignal";
import type {
  PredictiveBrandResult,
  PredictiveCategoryResult,
  PredictiveProductResult,
  PredictiveSearchPayload,
} from "@/types/search";

const EMPTY_RESULTS: PredictiveSearchPayload = {
  query: "",
  products: [],
  categories: [],
  brands: [],
};
const DEBOUNCE_MS = 275;

type SearchResult = PredictiveProductResult | PredictiveCategoryResult | PredictiveBrandResult;

function SearchIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  );
}

function resultName(result: SearchResult) {
  return result.kind === "brand" ? result.name : result.title;
}

function ResultThumbnail({ result }: { result: SearchResult }) {
  return (
    <span className="relative size-12 shrink-0 overflow-hidden rounded-md border border-border bg-surface-muted">
      {result.image && (
        <Image
          src={result.image.url}
          alt={result.image.altText}
          fill
          sizes="48px"
          className="object-contain p-1"
        />
      )}
    </span>
  );
}

function ResultRow({
  result,
  index,
  active,
  optionId,
  onActivate,
  onSelect,
}: {
  result: SearchResult;
  index: number;
  active: boolean;
  optionId: string;
  onActivate: (index: number) => void;
  onSelect: () => void;
}) {
  const name = resultName(result);
  return (
    <Link
      id={optionId}
      href={result.href}
      role="option"
      aria-selected={active}
      aria-label={result.kind === "product" ? `${name}, ${result.price}` : name}
      onMouseEnter={() => onActivate(index)}
      onFocus={() => onActivate(index)}
      onClick={onSelect}
      className={`flex min-h-16 items-center gap-3 rounded-lg px-2 py-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary ${
        active ? "bg-surface-muted" : "hover:bg-surface-muted"
      }`}
    >
      <ResultThumbnail result={result} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground">{name}</span>
        {result.kind === "product" ? (
          <>
            {result.vendor && <span className="mt-0.5 block truncate text-xs text-muted">{result.vendor}</span>}
            <span className="mt-0.5 block text-sm font-medium text-accent">{result.price}</span>
          </>
        ) : (
          <span className="mt-0.5 block text-xs text-muted">
            {result.kind === "category" ? "Category" : "Brand"}
          </span>
        )}
      </span>
    </Link>
  );
}

export default function HeaderSearch({
  mobile = false,
  onMobileOpen,
}: {
  mobile?: boolean;
  onMobileOpen?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(EMPTY_RESULTS);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allResults = useMemo<SearchResult[]>(
    () => [...results.products, ...results.categories, ...results.brands],
    [results],
  );
  const hasResults = allResults.length > 0;
  const showDropdown = dropdownOpen && query.trim().length >= 2;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDropdownOpen(false);
      setMobileOpen(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [mobileOpen]);

  useEffect(() => {
    function handleOutside(event: PointerEvent) {
      if (rootRef.current?.contains(event.target as Node)) return;
      setDropdownOpen(false);
      if (mobile) setMobileOpen(false);
    }

    function handleHistoryNavigation() {
      setDropdownOpen(false);
      setMobileOpen(false);
      setActiveIndex(-1);
    }

    document.addEventListener("pointerdown", handleOutside);
    window.addEventListener("popstate", handleHistoryNavigation);
    return () => {
      document.removeEventListener("pointerdown", handleOutside);
      window.removeEventListener("popstate", handleHistoryNavigation);
    };
  }, [mobile]);

  useEffect(() => {
    const normalized = query.trim().replace(/\s+/g, " ");
    if (normalized.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: normalized });
        const response = await fetch(`/api/search/predictive?${params.toString()}`, {
          signal: controller.signal,
        });
        const body = await response.json().catch(() => null) as (PredictiveSearchPayload & { error?: string }) | null;
        if (!response.ok || !body) throw new Error(body?.error || "Search suggestions are temporarily unavailable.");
        setResults(body);
      } catch (reason) {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError("Search suggestions are temporarily unavailable.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    if (!mobileOpen) return;
    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setDropdownOpen(false);
      setMobileOpen(false);
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [mobileOpen]);

  function closeSearch() {
    setDropdownOpen(false);
    setActiveIndex(-1);
    if (mobile) setMobileOpen(false);
  }

  function toggleMobileSearch() {
    if (!mobileOpen) onMobileOpen?.();
    setMobileOpen((current) => !current);
  }

  function navigateTo(href: string) {
    closeSearch();
    startNavigationProgress();
    router.push(href);
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = query.trim().replace(/\s+/g, " ");
    if (normalized.length < 2) return;
    const params = new URLSearchParams({ q: normalized });
    navigateTo(`/search?${params.toString()}`);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      if (dropdownOpen) {
        event.preventDefault();
        setDropdownOpen(false);
        setActiveIndex(-1);
      } else if (mobile) {
        setMobileOpen(false);
      }
      return;
    }

    if (!hasResults || (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Enter")) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setDropdownOpen(true);
      setActiveIndex((current) => (current + 1) % allResults.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setDropdownOpen(true);
      setActiveIndex((current) => (current <= 0 ? allResults.length - 1 : current - 1));
    } else if (activeIndex >= 0) {
      event.preventDefault();
      navigateTo(allResults[activeIndex].href);
    }
  }

  function clearQuery() {
    setQuery("");
    setResults(EMPTY_RESULTS);
    setDropdownOpen(false);
    setActiveIndex(-1);
    setLoading(false);
    setError(null);
    inputRef.current?.focus();
  }

  function changeQuery(value: string) {
    const next = value.slice(0, 100);
    const searchable = next.trim().replace(/\s+/g, " ").length >= 2;
    setQuery(next);
    setActiveIndex(-1);
    setError(null);
    setResults(EMPTY_RESULTS);
    setLoading(searchable);
    setDropdownOpen(searchable);
  }

  function renderGroup(title: string, items: SearchResult[], startIndex: number) {
    if (!items.length) return null;
    return (
      <div role="group" aria-label={title} className="border-b border-border px-2 py-2 last:border-b-0">
        <p className="px-2 pb-1 pt-1 text-[11px] font-bold uppercase tracking-widest text-muted">{title}</p>
        {items.map((result, offset) => {
          const index = startIndex + offset;
          return (
            <ResultRow
              key={`${result.kind}-${result.kind === "brand" ? result.name : result.id}`}
              result={result}
              index={index}
              active={activeIndex === index}
              optionId={`${listboxId}-option-${index}`}
              onActivate={setActiveIndex}
              onSelect={closeSearch}
            />
          );
        })}
      </div>
    );
  }

  const searchForm = (
    <div className="relative min-w-0">
      <form role="search" onSubmit={submitSearch} className="relative">
        <label htmlFor={`${listboxId}-input`} className="sr-only">Search products, categories or brands</label>
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted"><SearchIcon /></span>
        <input
          ref={inputRef}
          id={`${listboxId}-input`}
          type="search"
          value={query}
          onChange={(event) => changeQuery(event.target.value)}
          onFocus={() => { if (query.trim().length >= 2) setDropdownOpen(true); }}
          onKeyDown={handleInputKeyDown}
          placeholder="Search products, categories or brands…"
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          aria-controls={listboxId}
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
          aria-busy={loading}
          className="h-11 w-full appearance-none rounded-xl border border-border bg-surface pl-10 pr-20 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/25 [&::-webkit-search-cancel-button]:hidden"
        />
        <span className="absolute inset-y-0 right-2 flex items-center gap-1">
          {loading && <span aria-label="Loading search suggestions" role="status" className="size-4 animate-spin rounded-full border-2 border-border border-t-primary" />}
          {query && (
            <button
              type="button"
              onClick={clearQuery}
              aria-label="Clear search"
              className="inline-flex size-8 items-center justify-center rounded-md text-lg text-muted hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
            >
              ×
            </button>
          )}
        </span>
      </form>

      {showDropdown && (
        <div
          className={`${mobile ? "mt-2 max-h-[calc(100dvh-10rem)]" : "absolute inset-x-0 top-full z-[70] mt-2 max-h-[min(70vh,34rem)]"} flex flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-2xl`}
        >
          <div id={listboxId} role="listbox" aria-label="Search suggestions" className="min-h-0 overflow-y-auto">
            {renderGroup("Products", results.products, 0)}
            {renderGroup("Categories", results.categories, results.products.length)}
            {renderGroup("Brands", results.brands, results.products.length + results.categories.length)}

            {!loading && !error && !hasResults && (
              <p className="px-5 py-8 text-center text-sm text-muted">No results found</p>
            )}
            {error && <p role="status" className="px-5 py-6 text-center text-sm text-muted">{error}</p>}
          </div>

          <button
            type="button"
            onClick={() => {
              const params = new URLSearchParams({ q: query.trim().replace(/\s+/g, " ") });
              navigateTo(`/search?${params.toString()}`);
            }}
            className="flex min-h-12 w-full items-center justify-center border-t border-border px-4 text-sm font-semibold text-primary hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
          >
            View all results for “{query.trim()}”
          </button>
        </div>
      )}
    </div>
  );

  if (!mobile) {
    return <div ref={rootRef} className="w-full min-w-0 max-w-xl">{searchForm}</div>;
  }

  return (
    <div ref={rootRef} className="lg:hidden">
      <button
        type="button"
        onClick={toggleMobileSearch}
        aria-expanded={mobileOpen}
        aria-label={mobileOpen ? "Close search" : "Open search"}
        className="inline-flex size-10 items-center justify-center rounded-lg border border-border bg-surface text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {mobileOpen ? <span aria-hidden="true" className="text-xl">×</span> : <SearchIcon />}
      </button>

      {mobileOpen && (
        <section aria-label="Site search" className="absolute inset-x-0 top-full z-[60] border-b border-border bg-background p-3 shadow-xl sm:p-4">
          <div className="site-container px-0 sm:px-0">{searchForm}</div>
        </section>
      )}
    </div>
  );
}
