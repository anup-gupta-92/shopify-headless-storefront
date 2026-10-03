export const LONDON_TIME_ZONE = "Europe/London";
export const NORMAL_DELIVERY_ESTIMATE = "Delivery estimate: 2–3 business days";

const DISPATCH_CUTOFF_MINUTES = 15 * 60;

export interface ProductDispatchCriteria {
  vendor?: string | null;
  tags?: readonly string[];
  collectionHandles?: readonly string[];
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase();
}

export function isSpecialDispatchProduct({
  vendor,
  tags = [],
  collectionHandles = [],
}: ProductDispatchCriteria): boolean {
  return normalize(vendor ?? "") === "weller packaging"
    || tags.some((tag) => normalize(tag) === "ultimate-industrial")
    || collectionHandles.some((handle) => normalize(handle) === "new-packaging-supplies");
}

export function getLondonDispatchMessage(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const time = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const hour = Number(time.hour);
  const minute = Number(time.minute);
  const second = Number(time.second);
  const elapsedMinutes = (hour * 60) + minute + (second / 60);

  if (!Number.isFinite(elapsedMinutes) || elapsedMinutes >= DISPATCH_CUTOFF_MINUTES) {
    return NORMAL_DELIVERY_ESTIMATE;
  }

  const remainingMinutes = Math.ceil(DISPATCH_CUTOFF_MINUTES - elapsedMinutes);
  const hours = Math.floor(remainingMinutes / 60);
  const minutes = remainingMinutes % 60;
  const duration = hours > 0
    ? `${hours}h${minutes > 0 ? ` : ${minutes}m` : ""}`
    : `${minutes}m`;

  return `Order within ${duration} for delivery as soon as tomorrow`;
}
