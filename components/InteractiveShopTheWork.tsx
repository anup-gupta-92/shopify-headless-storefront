"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export interface ShopTheWorkHotspot {
  id: string;
  label: string;
  accessibleLabel: string;
  x: number;
  y: number;
  popoverClassName: string;
  product: {
    handle: string;
    title: string;
    imageUrl: string;
    imageAlt: string;
  };
}

interface InteractiveShopTheWorkProps {
  hotspots: ShopTheWorkHotspot[];
}

export default function InteractiveShopTheWork({ hotspots }: InteractiveShopTheWorkProps) {
  const [openHotspot, setOpenHotspot] = useState<string | null>(null);
  const [popoverVisible, setPopoverVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const suppressFocusOpenRef = useRef(false);
  const activeHotspot = hotspots.find((hotspot) => hotspot.id === openHotspot);

  function showHotspot(id: string) {
    if (id === openHotspot) return;
    setPopoverVisible(false);
    setOpenHotspot(id);
  }

  function closeHotspot() {
    setPopoverVisible(false);
    setOpenHotspot(null);
  }

  useEffect(() => {
    if (!openHotspot) return;
    const frame = requestAnimationFrame(() => setPopoverVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [openHotspot]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) closeHotspot();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || !openHotspot) return;
      const activeButton = buttonRefs.current[openHotspot];
      suppressFocusOpenRef.current = true;
      closeHotspot();
      activeButton?.focus();
      requestAnimationFrame(() => { suppressFocusOpenRef.current = false; });
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openHotspot]);

  return (
    <div
      ref={containerRef}
      className="relative aspect-[4/3] w-full"
      onMouseLeave={closeHotspot}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) closeHotspot();
      }}
    >
      <Image
        src="/images/home/shop-the-work.jpg"
        alt="A tradesperson wearing a protective mask and gloves while using a powered sanding tool"
        fill
        sizes="(max-width: 1023px) calc(100vw - 2rem), (max-width: 1439px) 55vw, 850px"
        className="rounded-2xl object-cover shadow-sm"
      />

      {hotspots.map((hotspot) => {
        const isOpen = hotspot.id === openHotspot;
        return (
          <button
            key={hotspot.id}
            ref={(node) => { buttonRefs.current[hotspot.id] = node; }}
            type="button"
            aria-label={hotspot.accessibleLabel}
            aria-expanded={isOpen}
            aria-controls={`shop-the-work-popover-${hotspot.id}`}
            onClick={() => showHotspot(hotspot.id)}
            onMouseEnter={() => showHotspot(hotspot.id)}
            onFocus={() => {
              if (!suppressFocusOpenRef.current) showHotspot(hotspot.id);
            }}
            className="group absolute z-20 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }}
          >
            <span className="absolute size-7.5 rounded-full border border-black/20 bg-white shadow-lg md:size-8" />
            <span
              aria-hidden="true"
              className={`relative size-2 rounded-full bg-primary shadow-sm transition-[transform,background-color,box-shadow] duration-200 ease-out group-hover:scale-[2.7] group-focus-visible:scale-[2.7] md:size-2.5 md:group-hover:scale-[2.3] md:group-focus-visible:scale-[2.3] motion-reduce:transform-none motion-reduce:transition-none ${
                isOpen ? "scale-[2.7] shadow-md md:scale-[2.3]" : "scale-100"
              }`}
            />
            <span className="sr-only">{hotspot.label}</span>
          </button>
        );
      })}

      {activeHotspot && (
        <div
          id={`shop-the-work-popover-${activeHotspot.id}`}
          role="dialog"
          aria-label={`${activeHotspot.label} product preview`}
          className={`absolute inset-x-3 bottom-3 z-30 rounded-xl border border-border bg-surface p-3 text-foreground transition-[opacity,transform,box-shadow] duration-200 ease-out md:inset-auto md:w-60 motion-reduce:transform-none motion-reduce:transition-none motion-reduce:opacity-100 ${
            popoverVisible ? "translate-y-0 scale-100 opacity-100 shadow-xl" : "translate-y-1.5 scale-[0.97] opacity-0 shadow-md"
          } ${activeHotspot.popoverClassName}`}
        >
          <div className="flex gap-3">
            <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-surface-muted">
              {activeHotspot.product.imageUrl ? (
                <Image
                  src={activeHotspot.product.imageUrl}
                  alt={activeHotspot.product.imageAlt}
                  fill
                  sizes="56px"
                  className="object-contain"
                />
              ) : null}
            </div>
            <div className="min-w-0">
              <p className="line-clamp-3 text-sm font-semibold leading-5">{activeHotspot.product.title}</p>
              <Link
                href={`/products/${activeHotspot.product.handle}`}
                className="mt-2 inline-flex rounded text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                View product <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
