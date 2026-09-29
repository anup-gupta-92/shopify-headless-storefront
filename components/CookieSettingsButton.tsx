"use client";

import { useCookieConsent } from "@/components/CookieConsentProvider";

export default function CookieSettingsButton() {
  const { openPreferences } = useCookieConsent();

  return <button
    type="button"
    onClick={(event) => openPreferences(event.currentTarget)}
    className="inline-flex min-h-9 items-center rounded text-left text-muted transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
  >
    Cookie settings
  </button>;
}
