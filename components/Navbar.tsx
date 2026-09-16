"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import { useCart } from "@/components/CartProvider";
import { siteConfig } from "@/config/site";

function MenuIcon({ open }: { open: boolean }) {
  return open ? (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  ) : (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}
function CartIcon() {
  return (
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
      <path d="M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L20 8H6.2" />
      <circle cx="10" cy="19" r="1" />
      <circle cx="17" cy="19" r="1" />
    </svg>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const { totalQuantity, loading: cartLoading, openDrawer } = useCart();

  useEffect(() => {
    if (!menuOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  const isActive = (href: string) => {
    if (href === "/") return pathname === href;
    if (href === "/shop" && pathname.startsWith("/products/")) return true;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const navLinkClasses = (href: string) =>
    `rounded-md px-2 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
      isActive(href)
        ? "bg-primary/10 text-primary"
        : "text-muted hover:bg-surface-muted hover:text-foreground"
    }`;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="site-container flex h-18 items-center gap-3">
        <Link
          href="/"
          className="relative h-14 w-28 shrink-0 overflow-hidden rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          aria-label={`${siteConfig.name} home`}
        >
          <Image
            src={siteConfig.logo.lightTheme}
            alt={siteConfig.logo.alt}
            width={540}
            height={540}
            priority
            sizes="112px"
            className="theme-logo-light absolute top-1/2 h-auto w-full -translate-y-1/2"
          />
          <Image
            src={siteConfig.logo.darkTheme}
            alt={siteConfig.logo.alt}
            width={540}
            height={540}
            priority
            sizes="112px"
            className="theme-logo-dark absolute top-1/2 h-auto w-full -translate-y-1/2"
          />
        </Link>

        <nav aria-label="Primary navigation" className="ml-auto hidden items-center gap-2 md:flex">
          {siteConfig.mainNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={navLinkClasses(item.href)}
              aria-current={isActive(item.href) ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-2">
          <button
            type="button"
            onClick={openDrawer}
            aria-label={`Open cart with ${totalQuantity} ${
              totalQuantity === 1 ? "item" : "items"
            }`}
            title="Open cart"
            className="relative inline-flex size-10 items-center justify-center rounded-lg border border-border bg-surface text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <CartIcon />

            {totalQuantity > 0 && (
              <span
                aria-hidden="true"
                className="absolute -right-1.5 -top-1.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground"
              >
                {cartLoading ? "…" : totalQuantity}
              </span>
            )}
          </button>
          <ThemeToggle />
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-lg border border-border bg-surface text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:hidden"
            aria-controls={menuId}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <MenuIcon open={menuOpen} />
          </button>
        </div>
      </div>

      <nav
        id={menuId}
        aria-label="Mobile navigation"
        className={`${menuOpen ? "block" : "hidden"} border-t border-border bg-background py-3 md:hidden`}
      >
        <div className="site-container flex flex-col gap-1">
          {siteConfig.mainNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={navLinkClasses(item.href)}
              aria-current={isActive(item.href) ? "page" : undefined}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
