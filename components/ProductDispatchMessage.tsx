"use client";

import { useEffect, useRef, useState } from "react";
import {
  getLondonDispatchMessage,
  isSpecialDispatchProduct,
  NORMAL_DELIVERY_ESTIMATE,
  type ProductDispatchCriteria,
} from "@/lib/product-dispatch";

const DELIVERY_INFORMATION = "Same-day dispatch applies to eligible orders placed within the cutoff time. Delivery times are not guaranteed and depend on the courier. Orders placed outside dispatch hours or on non-working days will be dispatched on the next working day.";

function DeliveryInformation() {
  const [openMode, setOpenMode] = useState<"closed" | "transient" | "pinned">("closed");
  const containerRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const isOpen = openMode !== "closed";

  useEffect(() => {
    if (!isOpen) return;

    function closeOnOutsidePointer(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpenMode("closed");
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpenMode("closed");
      triggerRef.current?.focus();
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return (
    <span ref={containerRef} className="relative -ml-1 inline-flex align-middle">
      <button
        ref={triggerRef}
        type="button"
        aria-label="Delivery information"
        aria-expanded={isOpen}
        aria-controls="delivery-information-popover"
        onClick={() => setOpenMode((current) => current === "pinned" ? "closed" : "pinned")}
        onMouseEnter={() => setOpenMode((current) => current === "pinned" ? current : "transient")}
        onMouseLeave={() => setOpenMode((current) => current === "transient" ? "closed" : current)}
        onFocus={() => setOpenMode((current) => current === "closed" ? "transient" : current)}
        onBlur={() => setOpenMode((current) => current === "transient" ? "closed" : current)}
        className="inline-flex size-8 items-center justify-center rounded-full text-sm font-bold text-primary hover:text-primary/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span aria-hidden="true" className="-translate-y-0.5">*</span>
      </button>
      {isOpen && (
        <span
          id="delivery-information-popover"
          role="tooltip"
          className="absolute right-0 top-full z-30 mt-1 w-[min(90vw,18rem)] max-w-[calc(100vw-2rem)] whitespace-normal break-words rounded-lg border border-border bg-surface p-3 text-left text-xs font-normal leading-relaxed text-foreground shadow-xl [overflow-wrap:anywhere] sm:w-[min(90vw,24rem)] max-[400px]:right-auto max-[400px]:left-0"
        >
          {DELIVERY_INFORMATION}
        </span>
      )}
    </span>
  );
}

function Message({ children, showDeliveryInformation = false }: { children: string; showDeliveryInformation?: boolean }) {
  const finalSpace = children.lastIndexOf(" ");
  const leadingText = finalSpace >= 0 ? children.slice(0, finalSpace + 1) : "";
  const finalWord = finalSpace >= 0 ? children.slice(finalSpace + 1) : children;

  return (
    <div className="mt-4 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-foreground">
      <p aria-live="polite" aria-atomic="true" className="text-sm font-semibold">
        {showDeliveryInformation ? (
          <>
            {leadingText}
            <span className="whitespace-nowrap">
              {finalWord}
              <DeliveryInformation />
            </span>
          </>
        ) : children}
      </p>
    </div>
  );
}

function NormalProductDispatchMessage() {
  // Keep server and initial client markup stable; client time replaces only
  // this safe static estimate after hydration when the cutoff is still open.
  const [message, setMessage] = useState(NORMAL_DELIVERY_ESTIMATE);

  useEffect(() => {
    const updateMessage = () => {
      const nextMessage = getLondonDispatchMessage();
      setMessage((currentMessage) => currentMessage === nextMessage ? currentMessage : nextMessage);
    };

    const initialUpdateId = window.setTimeout(updateMessage, 0);
    const intervalId = window.setInterval(updateMessage, 60_000);
    return () => {
      window.clearTimeout(initialUpdateId);
      window.clearInterval(intervalId);
    };
  }, []);

  return <Message showDeliveryInformation>{message}</Message>;
}

export default function ProductDispatchMessage(criteria: ProductDispatchCriteria) {
  if (isSpecialDispatchProduct(criteria)) {
    return <Message>Delivery estimate: 3–5 business days</Message>;
  }

  return <NormalProductDispatchMessage />;
}
