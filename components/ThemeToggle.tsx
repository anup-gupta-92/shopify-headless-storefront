"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";

const emptySubscribe = () => () => {};

function SunIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M20.5 14.1A8.5 8.5 0 0 1 9.9 3.5a8.5 8.5 0 1 0 10.6 10.6Z" />
    </svg>
  );
}

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const dark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      onClick={() => setTheme(dark ? "light" : "dark")}
      disabled={!mounted}
      className="relative inline-flex h-10 w-14 items-center justify-between rounded-full border border-border bg-surface px-1.5 text-muted transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60"
      aria-label={mounted ? `Use ${dark ? "light" : "dark"} theme` : "Loading theme preference"}
      title={mounted ? `Switch to ${dark ? "light" : "dark"} theme` : "Loading theme preference"}
    >
      <span className={`relative z-10 ${dark ? "" : "text-primary-foreground"}`}><SunIcon /></span>
      <span className={`relative z-10 ${dark ? "text-primary-foreground" : ""}`}><MoonIcon /></span>
      <span aria-hidden="true" className={`absolute left-1 top-1/2 size-6 -translate-y-1/2 rounded-full bg-primary shadow-sm transition-transform ${dark ? "translate-x-6" : "translate-x-0"}`} />
    </button>
  );
}
