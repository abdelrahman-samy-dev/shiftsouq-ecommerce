/* ══════════════════════════════════════════════════════════════
   Admin — KPI periods (pure, shared by server and tests)
   ──────────────────────────────────────────────────────────────
   Periods are counted in the store's time zone (Cairo), "to date":
     today → from local midnight until now
     7d    → the last 7 calendar days including today, until now
     30d   → the last 30 calendar days including today, until now
   The previous period has the same length and ends the same
   amount of time after its start, so "today so far" is compared
   with "yesterday until the same hour".
   ══════════════════════════════════════════════════════════════ */

export const STORE_TIME_ZONE = "Africa/Cairo";

export const KPI_PERIODS = ["today", "7d", "30d"] as const;
export type KpiPeriod = (typeof KPI_PERIODS)[number];

export const PERIOD_DAYS: Record<KpiPeriod, number> = { today: 1, "7d": 7, "30d": 30 };

export const isKpiPeriod = (v: unknown): v is KpiPeriod =>
  typeof v === "string" && (KPI_PERIODS as readonly string[]).includes(v);

export interface PeriodRange {
  from: Date;
  to: Date;
  prevFrom: Date;
  prevTo: Date;
}

const partsFormatter = new Map<string, Intl.DateTimeFormat>();
function formatterFor(tz: string): Intl.DateTimeFormat {
  let f = partsFormatter.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    partsFormatter.set(tz, f);
  }
  return f;
}

function wallClock(instant: Date, tz: string) {
  const parts = formatterFor(tz).formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { y: get("year"), m: get("month"), d: get("day"), h: get("hour"), min: get("minute"), s: get("second") };
}

/** Offset of `tz` at `instant`, in ms (local wall-clock time minus UTC). */
export function tzOffsetMs(instant: Date, tz: string): number {
  const w = wallClock(instant, tz);
  const asUtc = Date.UTC(w.y, w.m - 1, w.d, w.h, w.min, w.s);
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/** The calendar date of `instant` in `tz`. */
export function zonedDate(instant: Date, tz: string = STORE_TIME_ZONE): { y: number; m: number; d: number } {
  const w = wallClock(instant, tz);
  return { y: w.y, m: w.m, d: w.d };
}

/** The instant of local midnight at the start of y-m-d in `tz` (day may overflow, e.g. d = 0). */
export function zonedMidnight(y: number, m: number, d: number, tz: string = STORE_TIME_ZONE): Date {
  const guess = Date.UTC(y, m - 1, d);
  const first = tzOffsetMs(new Date(guess), tz);
  let t = guess - first;
  const second = tzOffsetMs(new Date(t), tz);
  if (second !== first) t = guess - second;
  return new Date(t);
}

/** Current and previous period for a KPI comparison. */
export function periodRange(period: KpiPeriod, now: Date = new Date(), tz: string = STORE_TIME_ZONE): PeriodRange {
  const days = PERIOD_DAYS[period];
  const { y, m, d } = zonedDate(now, tz);
  const from = zonedMidnight(y, m, d - (days - 1), tz);
  const prevFrom = zonedMidnight(y, m, d - (2 * days - 1), tz);
  const elapsed = now.getTime() - from.getTime();
  return { from, to: now, prevFrom, prevTo: new Date(prevFrom.getTime() + elapsed) };
}

/**
 * Relative change from `previous` to `current` (0.25 = +25 %).
 * null when there is nothing to compare with (previous was 0 and current isn't).
 */
export function percentChange(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  if (previous === 0) return current === 0 ? 0 : null;
  return (current - previous) / Math.abs(previous);
}

/** Average order value; 0 when there were no orders. */
export function averageOrderValue(revenue: number, orders: number): number {
  return orders > 0 ? revenue / orders : 0;
}

export interface DailyPoint {
  day: string; // YYYY-MM-DD
  revenue: number;
  orders: number;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** YYYY-MM-DD of a UTC date built from (y, m, d) — overflowing days roll over. */
export function isoDay(y: number, m: number, d: number): string {
  const date = new Date(Date.UTC(y, m - 1, d));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/**
 * Exactly `days` points ending today (store time), oldest first.
 * Missing days are filled with zeros so the chart never has gaps.
 */
export function fillDailySeries(
  rows: readonly { day: string; revenue: number; orders: number }[],
  days: number,
  now: Date = new Date(),
  tz: string = STORE_TIME_ZONE,
): DailyPoint[] {
  const byDay = new Map(rows.map((r) => [r.day.slice(0, 10), r]));
  const { y, m, d } = zonedDate(now, tz);
  const out: DailyPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = isoDay(y, m, d - i);
    const row = byDay.get(key);
    out.push({ day: key, revenue: row ? Number(row.revenue) || 0 : 0, orders: row ? Number(row.orders) || 0 : 0 });
  }
  return out;
}

/** A rounded axis maximum (1, 2, 2.5, 5 × 10ⁿ) at or above `max`, so gridlines land on clean numbers. */
export function niceMax(max: number): number {
  if (!Number.isFinite(max) || max <= 0) return 1;
  const exp = Math.floor(Math.log10(max));
  const base = 10 ** exp;
  for (const step of [1, 2, 2.5, 5, 10]) {
    if (step * base >= max) return step * base;
  }
  return 10 * base;
}
