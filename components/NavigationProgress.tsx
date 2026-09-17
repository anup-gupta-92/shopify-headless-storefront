"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  NAVIGATION_PROGRESS_START_EVENT,
  ROUTE_LOADING_COMPLETE_EVENT,
  ROUTE_LOADING_START_EVENT,
} from "@/components/RouteLoadingSignal";

const COMPLETE_DELAY_MS = 160;
const RESET_DELAY_MS = 260;

export default function NavigationProgress() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const running = useRef(false);
  const loadingBoundaryActive = useRef(false);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);
  const completionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (interval.current) clearInterval(interval.current);
    if (completionTimer.current) clearTimeout(completionTimer.current);
    if (resetTimer.current) clearTimeout(resetTimer.current);
    interval.current = null;
    completionTimer.current = null;
    resetTimer.current = null;
  }, []);

  const start = useCallback(() => {
    clearTimers();
    running.current = true;
    setVisible(true);
    setProgress(18);
    interval.current = setInterval(() => {
      setProgress((current) => Math.min(90, current + Math.max(1, (90 - current) * 0.16)));
    }, 320);
  }, [clearTimers]);

  const complete = useCallback(() => {
    if (!running.current || loadingBoundaryActive.current) return;
    running.current = false;
    if (interval.current) clearInterval(interval.current);
    interval.current = null;
    setProgress(100);
    completionTimer.current = setTimeout(() => {
      setVisible(false);
      resetTimer.current = setTimeout(() => setProgress(0), RESET_DELAY_MS);
    }, COMPLETE_DELAY_MS);
  }, []);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) return;

      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.download || (anchor.target && anchor.target !== "_self")) return;

      const destination = new URL(anchor.href, window.location.href);
      if (
        destination.origin !== window.location.origin ||
        destination.pathname === window.location.pathname
      ) return;
      start();
    }

    function handleHistoryNavigation() {
      if (window.location.pathname !== pathname) start();
    }

    function handleLoadingStart() {
      loadingBoundaryActive.current = true;
      if (completionTimer.current) clearTimeout(completionTimer.current);
      completionTimer.current = null;
      if (!running.current) start();
    }

    function handleLoadingComplete() {
      loadingBoundaryActive.current = false;
      complete();
    }

    document.addEventListener("click", handleClick);
    window.addEventListener("popstate", handleHistoryNavigation);
    window.addEventListener(NAVIGATION_PROGRESS_START_EVENT, start);
    window.addEventListener(ROUTE_LOADING_START_EVENT, handleLoadingStart);
    window.addEventListener(ROUTE_LOADING_COMPLETE_EVENT, handleLoadingComplete);
    return () => {
      document.removeEventListener("click", handleClick);
      window.removeEventListener("popstate", handleHistoryNavigation);
      window.removeEventListener(NAVIGATION_PROGRESS_START_EVENT, start);
      window.removeEventListener(ROUTE_LOADING_START_EVENT, handleLoadingStart);
      window.removeEventListener(ROUTE_LOADING_COMPLETE_EVENT, handleLoadingComplete);
      clearTimers();
    };
  }, [clearTimers, complete, pathname, start]);

  useEffect(() => {
    if (!running.current) return;
    completionTimer.current = setTimeout(() => {
      if (!loadingBoundaryActive.current) complete();
    }, 120);
  }, [pathname, complete]);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-x-0 bottom-0 z-10 h-0.5 overflow-hidden transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"}`}
    >
      <div
        className="h-full bg-primary shadow-[0_0_8px_var(--primary)] transition-[width] duration-300 ease-out motion-reduce:transition-none"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
