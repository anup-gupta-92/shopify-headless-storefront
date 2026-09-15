"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { ProductImage } from "@/types/product";

export default function ProductGallery({ images, title }: { images: ProductImage[]; title: string }) {
  const [active, setActive] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const strip = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const multiple = images.length > 1;
  const control = "min-h-11 min-w-11 rounded-lg border border-border bg-surface p-2 text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

  function select(index: number) {
    const next = (index + images.length) % images.length;
    setActive(next);
    if (strip.current) strip.current.scrollTo({ left: next * strip.current.clientWidth, behavior: "instant" });
  }

  useEffect(() => {
    if (!expanded) return;
    const modal = dialog.current;
    const priorFocus = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    modal?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      modal?.close();
      document.body.style.overflow = overflow;
      priorFocus?.focus();
    };
  }, [expanded]);

  if (!images.length) return <div className="flex aspect-square items-center justify-center rounded-xl border border-border bg-surface text-muted">Image unavailable</div>;

  return (
    <section aria-label="Product images" className="min-w-0">
      <div className="flex min-w-0 gap-3">
        {multiple && <div className="hidden max-h-[32rem] w-16 shrink-0 flex-col gap-3 overflow-y-auto md:flex">
          {images.map((image, index) => <button key={image.url} type="button" aria-label={`View image ${index + 1}`} aria-pressed={active === index} onClick={() => select(index)} className={`relative aspect-square w-full shrink-0 overflow-hidden rounded-lg border-2 bg-surface focus-visible:outline-2 focus-visible:outline-primary ${active === index ? "border-primary" : "border-border"}`}>
            <Image src={image.url} alt={image.altText || `${title}, image ${index + 1}`} fill sizes="64px" className="object-contain" />
          </button>)}
        </div>}
        <div ref={strip} onScroll={(event) => { const el = event.currentTarget; setActive(Math.min(images.length - 1, Math.max(0, Math.round(el.scrollLeft / el.clientWidth)))); }} className="flex min-w-0 flex-1 snap-x snap-mandatory overflow-x-auto rounded-xl border border-border bg-surface [scrollbar-width:none]">
          {images.map((image, index) => <button key={image.url} type="button" aria-label={`Expand image ${index + 1} of ${images.length}`} onClick={() => { setActive(index); setExpanded(true); }} className="relative aspect-square w-full shrink-0 snap-center focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary">
            <Image src={image.url} alt={image.altText || `${title}, image ${index + 1}`} fill sizes="(max-width: 767px) 100vw, 45vw" loading={index === 0 ? "eager" : "lazy"} className="object-contain" />
          </button>)}
        </div>
      </div>
      {multiple && <div className="mt-3 flex flex-wrap justify-center" aria-label="Choose product image">
        {images.map((image, index) => <button key={image.url} type="button" onClick={() => select(index)} aria-label={`Show image ${index + 1}`} aria-pressed={active === index} className="flex size-11 items-center justify-center rounded focus-visible:outline-2 focus-visible:outline-primary"><span className={`size-2 rounded-full ${active === index ? "bg-primary" : "bg-border"}`} /></button>)}
      </div>}
      <p className="mt-2 text-center text-xs text-muted">Tap an image to enlarge{multiple ? " · Swipe to browse" : ""}</p>
      <dialog ref={dialog} onCancel={(event) => { event.preventDefault(); setExpanded(false); }} onClose={() => setExpanded(false)} aria-label={`${title} expanded images`} className="fixed inset-0 m-auto h-[100dvh] max-h-none w-screen max-w-none bg-background p-4 text-foreground backdrop:bg-background/90" onKeyDown={(event) => { if (multiple && event.key === "ArrowRight") select(active + 1); if (multiple && event.key === "ArrowLeft") select(active - 1); }}>
        <div className="flex items-center justify-between gap-4"><p>{active + 1} / {images.length}</p><button autoFocus type="button" onClick={() => setExpanded(false)} className={control} aria-label="Close expanded image">Close ×</button></div>
        {expanded && <div className="relative mx-auto h-[calc(100dvh-10rem)] w-full"><Image src={images[active].url} alt={images[active].altText || title} fill sizes="100vw" className="object-contain" /></div>}
        {multiple && <div className="flex justify-center gap-4"><button type="button" className={control} aria-label="Previous image" onClick={() => select(active - 1)}>←</button><button type="button" className={control} aria-label="Next image" onClick={() => select(active + 1)}>→</button></div>}
      </dialog>
    </section>
  );
}
