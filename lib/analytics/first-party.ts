"use client";

import { CONSENT_CHANGE_EVENT, getStoredConsent, type ConsentPreferences } from "@/lib/consent";
import {
  ANALYTICS_MAX_BATCH_SIZE,
  ANALYTICS_SESSION_TIMEOUT_MS,
  classifyAcquisition,
  shouldCollectAnalytics,
  type AnalyticsEventInput,
  type AnalyticsEventName,
  type AnalyticsSessionContext,
  type AnalyticsSourceSurface,
  type AnalyticsTheme,
  type AnalyticsThemeSource,
} from "./first-party-shared";
import { isAnalyticsPreviewActive } from "./preview";

const VISITOR_KEY = "apex:analytics:visitor-id";
const SESSION_KEY = "apex:analytics:session";
const LOCAL_ENABLE_KEY = "apex:analytics:local-enabled";
const SEARCH_SOURCE_KEY = "apex:analytics:search-source";
const FLUSH_DELAY_MS = 1_500;
const FLUSH_BATCH_SIZE = 10;
const PRODUCTION_HOSTS = new Set(["apexbusinesssupplies.co.uk", "www.apexbusinesssupplies.co.uk"]);

interface StoredSession extends AnalyticsSessionContext {
  lastActivityMs: number;
  sessionStartedEventId: string;
}

export type TrackAnalyticsEvent = Omit<AnalyticsEventInput, "eventId" | "occurredAt"> & {
  eventName: AnalyticsEventName;
};

let queue: AnalyticsEventInput[] = [];
let flushTimer: number | null = null;
let listenersInstalled = false;
const dedupeKeys = new Set<string>();

function safeStorage(storage: Storage | undefined, operation: (target: Storage) => void) {
  if (!storage) return;
  try { operation(storage); } catch { /* Privacy/storage restrictions are a supported no-op. */ }
}

function readStorage(storage: Storage | undefined, key: string): string | null {
  let value: string | null = null;
  safeStorage(storage, (target) => { value = target.getItem(key); });
  return value;
}

function analyticsHostEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (PRODUCTION_HOSTS.has(window.location.hostname)) return true;
  return readStorage(window.localStorage, LOCAL_ENABLE_KEY) === "true";
}

function internallyExcluded(): boolean {
  return typeof document !== "undefined" && /(?:^|;\s*)apex_analytics_exclude=true(?:;|$)/.test(document.cookie);
}

export function isFirstPartyAnalyticsEligible(): boolean {
  if (typeof window === "undefined") return false;
  if (window.location.pathname.startsWith("/admin")) return false;
  if (isAnalyticsPreviewActive()) return false;
  return shouldCollectAnalytics({
    hostname: window.location.hostname,
    localEnabled: analyticsHostEnabled() && !PRODUCTION_HOSTS.has(window.location.hostname),
    analyticsConsent: getStoredConsent()?.analytics === true,
    internallyExcluded: internallyExcluded(),
  });
}

function randomId(): string {
  return crypto.randomUUID();
}

function themeContext(): { theme: AnalyticsTheme; source: AnalyticsThemeSource } {
  const stored = readStorage(window.localStorage, "theme");
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme: AnalyticsTheme = stored === "dark" || (stored !== "light" && systemDark) ? "dark" : "light";
  if (stored === "dark" || stored === "light") return { theme, source: "stored_explicit" };
  if (stored === "system") return { theme, source: "stored_system" };
  return { theme, source: "default_system" };
}

function browserContext() {
  const ua = navigator.userAgent;
  const browser = /Edg\/(\d+)/.exec(ua) ? ["Edge", RegExp.$1]
    : /Chrome\/(\d+)/.exec(ua) ? ["Chrome", RegExp.$1]
    : /Firefox\/(\d+)/.exec(ua) ? ["Firefox", RegExp.$1]
    : /Version\/(\d+).+Safari/.exec(ua) ? ["Safari", RegExp.$1]
    : ["Other", ""];
  const os = /Android\s([\d]+)/.exec(ua) ? ["Android", RegExp.$1]
    : /(?:iPhone|iPad).*OS\s(\d+)/.exec(ua) ? ["iOS", RegExp.$1]
    : /Windows NT\s([\d.]+)/.exec(ua) ? ["Windows", RegExp.$1.split(".")[0]]
    : /Mac OS X\s(\d+)/.exec(ua) ? ["macOS", RegExp.$1]
    : /Linux/.test(ua) ? ["Linux", ""] : ["Other", ""];
  const deviceType: AnalyticsSessionContext["deviceType"] = /iPad|Tablet/.test(ua)
    ? "tablet" : /Mobi|Android|iPhone/.test(ua) ? "mobile" : "desktop";
  return { browserName: browser[0], browserVersionMajor: browser[1] || undefined, osName: os[0], osVersionMajor: os[1] || undefined, deviceType };
}

function newSession(nowMs: number): StoredSession {
  let visitorId = readStorage(window.localStorage, VISITOR_KEY);
  if (!visitorId) {
    visitorId = randomId();
    safeStorage(window.localStorage, (storage) => storage.setItem(VISITOR_KEY, visitorId!));
  }
  const url = new URL(window.location.href);
  const referrerHost = (() => { try { return document.referrer ? new URL(document.referrer).hostname : undefined; } catch { return undefined; } })();
  const clickIds = ["gclid", "gbraid", "wbraid", "srsltid"].filter((key) => url.searchParams.has(key));
  const theme = themeContext();
  const params = (key: string) => url.searchParams.get(key)?.slice(0, 256) || undefined;
  const context = browserContext();
  const hasMerchantClickId = clickIds.includes("srsltid");
  const hasGoogleClickId = clickIds.some((id) => id !== "srsltid");
  const session: StoredSession = {
    sessionId: randomId(), visitorId, startedAt: Math.floor(nowMs / 1000), lastSeenAt: Math.floor(nowMs / 1000),
    lastActivityMs: nowMs, sessionStartedEventId: randomId(), ...context,
    language: navigator.language?.slice(0, 32), landingPath: url.pathname, referrerHost,
    utmSource: params("utm_source"), utmMedium: params("utm_medium"), utmCampaign: params("utm_campaign"),
    utmContent: params("utm_content"), utmTerm: params("utm_term"),
    acquisitionChannel: classifyAcquisition({ referrerHost, utmSource: params("utm_source"), utmMedium: params("utm_medium"), hasGoogleClickId, hasMerchantClickId }),
    hasClickId: clickIds.length ? 1 : 0, clickIdType: clickIds.length > 1 ? "multiple" : clickIds[0],
    isPwa: window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone ? 1 : 0,
    initialTheme: theme.theme, currentTheme: theme.theme, themeSource: theme.source,
  };
  safeStorage(window.localStorage, (storage) => storage.setItem(SESSION_KEY, JSON.stringify(session)));
  return session;
}

function activeSession(nowMs = Date.now()): { session: StoredSession; isNew: boolean } | null {
  if (!isFirstPartyAnalyticsEligible()) {
    if (isAnalyticsPreviewActive()) clearQueuedAnalyticsEvents();
    else clearFirstPartyAnalytics();
    return null;
  }
  let stored: StoredSession | null = null;
  const raw = readStorage(window.localStorage, SESSION_KEY);
  if (raw) try { stored = JSON.parse(raw) as StoredSession; } catch { stored = null; }
  const isNew = !stored || nowMs - stored.lastActivityMs >= ANALYTICS_SESSION_TIMEOUT_MS;
  const session = isNew ? newSession(nowMs) : { ...stored!, lastActivityMs: nowMs, lastSeenAt: Math.floor(nowMs / 1000) };
  safeStorage(window.localStorage, (storage) => storage.setItem(SESSION_KEY, JSON.stringify(session)));
  return { session, isNew };
}

function scheduleFlush() {
  if (queue.length >= FLUSH_BATCH_SIZE) { void flushAnalyticsEvents(); return; }
  if (flushTimer !== null) return;
  flushTimer = window.setTimeout(() => { flushTimer = null; void flushAnalyticsEvents(); }, FLUSH_DELAY_MS);
}

function installListeners() {
  if (listenersInstalled || typeof window === "undefined") return;
  listenersInstalled = true;
  window.addEventListener("pagehide", () => { void flushAnalyticsEvents(true); });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") void flushAnalyticsEvents(true); });
  window.addEventListener(CONSENT_CHANGE_EVENT, (event) => {
    const consent = (event as CustomEvent<ConsentPreferences>).detail;
    if (!consent.analytics) clearFirstPartyAnalytics();
  });
}

export function trackAnalyticsEvent(input: TrackAnalyticsEvent, options: { dedupeKey?: string; flush?: boolean } = {}) {
  if (typeof window === "undefined") return;
  installListeners();
  if (options.dedupeKey && dedupeKeys.has(options.dedupeKey)) return;
  const state = activeSession();
  if (!state) return;
  if (options.dedupeKey) dedupeKeys.add(options.dedupeKey);
  if (state.isNew) queue.push({ eventId: state.session.sessionStartedEventId, eventName: "session_started", occurredAt: state.session.startedAt, pagePath: state.session.landingPath, pageType: "other", sourceSurface: "site" });
  queue.push({ ...input, eventId: randomId(), occurredAt: Math.floor(Date.now() / 1000) });
  if (options.flush) void flushAnalyticsEvents(true); else scheduleFlush();
}

export async function flushAnalyticsEvents(useBeacon = false): Promise<void> {
  if (typeof window === "undefined") return;
  if (isAnalyticsPreviewActive()) { clearQueuedAnalyticsEvents(); return; }
  if (!isFirstPartyAnalyticsEligible() || !queue.length) return;
  if (flushTimer !== null) { window.clearTimeout(flushTimer); flushTimer = null; }
  const state = activeSession();
  if (!state) return;
  const events = queue.splice(0, ANALYTICS_MAX_BATCH_SIZE);
  const body = JSON.stringify({ session: state.session, events });
  try {
    const sentByBeacon = useBeacon && navigator.sendBeacon
      ? navigator.sendBeacon("/api/analytics/events", new Blob([body], { type: "application/json" }))
      : false;
    if (!sentByBeacon) {
      await fetch("/api/analytics/events", { method: "POST", headers: { "Content-Type": "application/json" }, body, credentials: "same-origin", keepalive: true });
    }
  } catch { /* Analytics must never affect storefront behaviour. */ }
  if (queue.length) scheduleFlush();
}

export function clearFirstPartyAnalytics() {
  clearQueuedAnalyticsEvents();
  if (typeof window !== "undefined") {
    safeStorage(window.localStorage, (storage) => { storage.removeItem(VISITOR_KEY); storage.removeItem(SESSION_KEY); });
  }
}

export function clearQueuedAnalyticsEvents() {
  queue = [];
  dedupeKeys.clear();
  if (typeof window !== "undefined" && flushTimer !== null) window.clearTimeout(flushTimer);
  flushTimer = null;
}

export function updateAnalyticsTheme(theme: AnalyticsTheme) {
  if (typeof window === "undefined") return;
  const raw = readStorage(window.localStorage, SESSION_KEY);
  if (!raw) return;
  try {
    const session = JSON.parse(raw) as StoredSession;
    session.currentTheme = theme;
    safeStorage(window.localStorage, (storage) => storage.setItem(SESSION_KEY, JSON.stringify(session)));
  } catch { /* Ignore invalid client storage. */ }
}

export function markCommittedSearchSource(source: "header_search" | "search_results") {
  if (typeof window !== "undefined") safeStorage(window.sessionStorage, (storage) => storage.setItem(SEARCH_SOURCE_KEY, source));
}

export function consumeCommittedSearchSource(): "header_search" | "search_results" {
  if (typeof window === "undefined") return "search_results";
  const value = readStorage(window.sessionStorage, SEARCH_SOURCE_KEY);
  safeStorage(window.sessionStorage, (storage) => storage.removeItem(SEARCH_SOURCE_KEY));
  return value === "header_search" ? value : "search_results";
}

export function sendAnonymousConsentDecision(input: {
  decision: "accepted" | "rejected" | "custom";
  analyticsAllowed: boolean;
  marketingAllowed: boolean;
  action: "initial" | "changed";
}) {
  if (typeof window === "undefined" || !analyticsHostEnabled()) return;
  void fetch("/api/analytics/consent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input), keepalive: true, credentials: "same-origin" }).catch(() => undefined);
}

export type { AnalyticsSourceSurface };
