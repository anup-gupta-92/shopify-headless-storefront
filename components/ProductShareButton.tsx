"use client";

import { useEffect, useRef, useState } from "react";
import { trackAnalyticsEvent } from "@/lib/analytics/first-party";
import { buildProductShareUrl } from "@/lib/product-share";

interface ProductShareButtonProps {
  title: string;
  canonicalUrl: string;
  variantQueryValue?: string;
  productId?: string;
  productHandle?: string;
  variantId?: string;
  sku?: string;
}

type ShareStatus = "Link copied" | "Unable to share" | null;

function copyWithSelection(value: string): boolean {
  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.appendChild(input);
  try {
    input.select();
    return document.execCommand("copy");
  } finally {
    input.remove();
  }
}

async function copyShareUrl(url: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(url);
      return;
    } catch { /* Fall through to the selection-based browser fallback. */ }
  }
  if (!copyWithSelection(url)) throw new Error("clipboard_unavailable");
}

export default function ProductShareButton({
  title,
  canonicalUrl,
  variantQueryValue,
  productId,
  productHandle,
  variantId,
  sku,
}: Readonly<ProductShareButtonProps>) {
  const [status, setStatus] = useState<ShareStatus>(null);
  const statusTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (statusTimer.current !== null) window.clearTimeout(statusTimer.current);
  }, []);

  function showStatus(message: Exclude<ShareStatus, null>) {
    if (statusTimer.current !== null) window.clearTimeout(statusTimer.current);
    setStatus(message);
    statusTimer.current = window.setTimeout(() => {
      setStatus(null);
      statusTimer.current = null;
    }, 3_000);
  }

  async function shareProduct() {
    const url = buildProductShareUrl(canonicalUrl, variantQueryValue);
    trackAnalyticsEvent({
      eventName: "product_share_clicked",
      pagePath: window.location.pathname,
      pageType: "product",
      sourceSurface: "product_page",
      productId,
      productHandle,
      variantId,
      sku,
    });

    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title, url });
        return;
      }
      await copyShareUrl(url);
      showStatus("Link copied");
    } catch (reason) {
      if (reason instanceof Error && reason.name === "AbortError") return;
      showStatus("Unable to share");
    }
  }

  return (
    <span className="relative flex shrink-0 items-center border-l border-primary/20 pl-2">
      <button
        type="button"
        aria-label="Share this product"
        title="Share this product"
        onClick={() => void shareProduct()}
        className="inline-flex size-11 items-center justify-center rounded-lg text-primary transition-colors hover:bg-primary/10 hover:text-primary/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 16V3" />
          <path d="m7 8 5-5 5 5" />
          <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
        </svg>
      </button>
      <span
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="absolute right-0 top-full z-20 mt-1 whitespace-nowrap rounded-md border border-border bg-surface px-2 py-1 text-xs font-medium text-foreground shadow-lg empty:hidden"
      >
        {status}
      </span>
    </span>
  );
}
