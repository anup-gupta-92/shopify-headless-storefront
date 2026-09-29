"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  getStoredConsent,
  hasConsent as categoryHasConsent,
  persistConsent,
  type ConsentCategory,
  type ConsentPreferences,
} from "@/lib/consent";

interface CookieConsentContextValue {
  consent: ConsentPreferences | null;
  ready: boolean;
  hasConsent: (category: ConsentCategory) => boolean;
  openPreferences: (opener?: HTMLElement | null) => void;
}

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null);

const focusClass = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const subscribeToHydration = () => () => undefined;

export default function CookieConsentProvider({ children }: { children: React.ReactNode }) {
  const [consent, setConsent] = useState<ConsentPreferences | null>(() => getStoredConsent());
  const ready = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [draft, setDraft] = useState({ analytics: false, marketing: false });
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  const saveConsent = useCallback((analytics: boolean, marketing: boolean) => {
    setConsent(persistConsent({ analytics, marketing }));
    setPreferencesOpen(false);
  }, []);

  const openPreferences = useCallback((opener?: HTMLElement | null) => {
    openerRef.current = opener ?? document.activeElement as HTMLElement | null;
    setDraft({
      analytics: consent?.analytics ?? false,
      marketing: consent?.marketing ?? false,
    });
    setPreferencesOpen(true);
  }, [consent]);

  const closePreferences = useCallback(() => setPreferencesOpen(false), []);

  useEffect(() => {
    if (!preferencesOpen) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const previousOverflow = document.body.style.overflow;
    if (!dialog.open) dialog.showModal();
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => dialog.querySelector<HTMLElement>("[data-consent-initial-focus]")?.focus());

    return () => {
      document.body.style.overflow = previousOverflow;
      if (dialog.open) dialog.close();
      requestAnimationFrame(() => openerRef.current?.focus());
    };
  }, [preferencesOpen]);

  const value = useMemo<CookieConsentContextValue>(() => ({
    consent,
    ready,
    hasConsent: (category) => categoryHasConsent(consent, category),
    openPreferences,
  }), [consent, openPreferences, ready]);

  const showBanner = ready && consent === null && !preferencesOpen;

  return <CookieConsentContext.Provider value={value}>
    {children}

    {showBanner && <section aria-label="Cookie consent" className="fixed inset-x-3 bottom-3 z-[80] mx-auto max-w-3xl rounded-2xl border border-border bg-surface p-4 text-foreground shadow-2xl sm:bottom-5 sm:p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-bold">Your privacy</h2>
          <p className="mt-1 text-sm leading-5 text-muted">We use necessary cookies to run the storefront and, with your permission, analytics and marketing cookies.</p>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <button type="button" onClick={() => saveConsent(true, true)} className={`min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground ${focusClass}`}>Accept all</button>
          <button type="button" onClick={() => saveConsent(false, false)} className={`min-h-11 rounded-lg border border-border bg-surface-muted px-4 text-sm font-semibold ${focusClass}`}>Reject non-essential</button>
          <button type="button" onClick={(event) => openPreferences(event.currentTarget)} className={`col-span-2 min-h-11 rounded-lg border border-primary px-4 text-sm font-semibold text-primary sm:col-span-1 ${focusClass}`}>Manage preferences</button>
        </div>
      </div>
    </section>}

    <dialog
      ref={dialogRef}
      aria-labelledby="cookie-preferences-title"
      onCancel={(event) => { event.preventDefault(); closePreferences(); }}
      onClick={(event) => { if (event.target === event.currentTarget) closePreferences(); }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-border bg-surface p-0 text-foreground shadow-2xl backdrop:bg-black/50"
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Privacy choices</p>
            <h2 id="cookie-preferences-title" className="mt-1 text-2xl font-bold">Cookie preferences</h2>
          </div>
          <button data-consent-initial-focus type="button" onClick={closePreferences} aria-label="Close cookie preferences" className={`flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-muted text-xl ${focusClass}`}>×</button>
        </div>
        <p className="mt-3 text-sm leading-6 text-muted">Choose which optional cookies may be used. Necessary cookies are required for core storefront functions.</p>

        <div className="mt-5 divide-y divide-border rounded-xl border border-border">
          <label className="flex gap-3 p-4">
            <input type="checkbox" checked disabled className="mt-1 size-4 accent-primary" />
            <span><span className="block font-semibold">Necessary</span><span className="mt-1 block text-sm leading-5 text-muted">Required for features such as the cart, checkout routing, security and saved privacy choices.</span></span>
          </label>
          <label className="flex cursor-pointer gap-3 p-4">
            <input type="checkbox" checked={draft.analytics} onChange={(event) => setDraft((current) => ({ ...current, analytics: event.target.checked }))} className={`mt-1 size-4 accent-primary ${focusClass}`} />
            <span><span className="block font-semibold">Analytics</span><span className="mt-1 block text-sm leading-5 text-muted">Allows future measurement tools to help us understand how the storefront is used.</span></span>
          </label>
          <label className="flex cursor-pointer gap-3 p-4">
            <input type="checkbox" checked={draft.marketing} onChange={(event) => setDraft((current) => ({ ...current, marketing: event.target.checked }))} className={`mt-1 size-4 accent-primary ${focusClass}`} />
            <span><span className="block font-semibold">Marketing</span><span className="mt-1 block text-sm leading-5 text-muted">Allows future advertising tools to measure campaigns and make promotions more relevant.</span></span>
          </label>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => saveConsent(draft.analytics, draft.marketing)} className={`min-h-11 rounded-lg border border-primary px-5 text-sm font-semibold text-primary ${focusClass}`}>Save preferences</button>
          <button type="button" onClick={() => saveConsent(true, true)} className={`min-h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground ${focusClass}`}>Accept all</button>
        </div>
      </div>
    </dialog>
  </CookieConsentContext.Provider>;
}

export function useCookieConsent() {
  const context = useContext(CookieConsentContext);
  if (!context) throw new Error("useCookieConsent must be used inside CookieConsentProvider");
  return context;
}
