export const ANALYTICS_DISPLAY_TIME_ZONE = "Europe/London";

const analyticsDateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: ANALYTICS_DISPLAY_TIME_ZONE,
  timeZoneName: "short",
});

export function formatAnalyticsTimestamp(timestampSeconds: number): string {
  return analyticsDateTimeFormatter.format(new Date(timestampSeconds * 1000));
}
