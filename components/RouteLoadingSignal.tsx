"use client";

import { useEffect } from "react";

export const ROUTE_LOADING_START_EVENT = "apex:route-loading-start";
export const ROUTE_LOADING_COMPLETE_EVENT = "apex:route-loading-complete";
export const NAVIGATION_PROGRESS_START_EVENT = "apex:navigation-progress-start";

export function startNavigationProgress() {
  window.dispatchEvent(new Event(NAVIGATION_PROGRESS_START_EVENT));
}

export default function RouteLoadingSignal() {
  useEffect(() => {
    window.dispatchEvent(new Event(ROUTE_LOADING_START_EVENT));
    return () => {
      window.dispatchEvent(new Event(ROUTE_LOADING_COMPLETE_EVENT));
    };
  }, []);

  return null;
}
