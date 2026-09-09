"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";

const themeOrder = ["system", "light", "dark"] as const;
type ThemeName = (typeof themeOrder)[number];

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

function SystemIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

const icons: Record<ThemeName, () => React.JSX.Element> = {
  system: SystemIcon,
  light: SunIcon,
  dark: MoonIcon,
};

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const currentTheme: ThemeName = themeOrder.includes(theme as ThemeName)
    ? (theme as ThemeName)
    : "system";
  const Icon = icons[currentTheme];
  const nextTheme = themeOrder[(themeOrder.indexOf(currentTheme) + 1) % themeOrder.length];

  return (
    <button
      type="button"
      onClick={() => setTheme(nextTheme)}
      disabled={!mounted}
      className="inline-flex size-10 items-center justify-center rounded-lg border border-border bg-surface text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60"
      aria-label={mounted ? `Theme: ${currentTheme}. Switch to ${nextTheme}.` : "Loading theme preference"}
      title={mounted ? `Theme: ${currentTheme}. Switch to ${nextTheme}.` : "Loading theme preference"}
    >
      {mounted ? <Icon /> : <SystemIcon />}
    </button>
  );
}
