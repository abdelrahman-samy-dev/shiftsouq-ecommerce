/* ══════════════════════════════════════════════════════════════
   RevenueChart — daily revenue bars in plain SVG (server-safe).
   ──────────────────────────────────────────────────────────────
   Bars are an SVG stretched to the plot width; axis labels are
   HTML so they stay readable at any width. Mirrors in Arabic
   (newest day on the left, as the reading direction runs).
   Accessible: the figure has a text summary, every bar has a
   <title>, and a visually hidden table lists every day.
   ══════════════════════════════════════════════════════════════ */

import type { DailyPoint } from "@/lib/admin/kpi";
import { niceMax } from "@/lib/admin/kpi";
import { formatAmount, formatInt, numberLocale } from "@/lib/admin/i18n";

function dayLabel(day: string, locale: string, withYear = false): string {
  const date = new Date(`${day}T12:00:00Z`);
  return date.toLocaleDateString(numberLocale(locale), {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
  });
}

export function RevenueChart({
  points,
  locale,
  title,
  summary,
  labels,
}: {
  points: DailyPoint[];
  locale: string;
  /** Heading id the figure is labelled by is created here. */
  title: string;
  /** One sentence describing the chart (shown under it). */
  summary: string;
  labels: { day: string; revenue: string; orders: string };
}) {
  const rtl = locale === "ar";
  const n = points.length;
  const max = niceMax(Math.max(0, ...points.map((p) => p.revenue)));
  const compact = new Intl.NumberFormat(numberLocale(locale), { notation: "compact", maximumFractionDigits: 1 });
  const ticks = [max, max / 2, 0];
  const slot = 10;
  const tickDays = n > 1 ? [0, Math.floor((n - 1) / 3), Math.floor((2 * (n - 1)) / 3), n - 1] : [0];
  const id = "revenue-chart";

  return (
    <figure aria-labelledby={`${id}-title`} className="m-0">
      <figcaption className="sr-only" id={`${id}-title`}>
        {title}
      </figcaption>
      <div className="grid grid-cols-[auto_1fr] gap-x-3">
        {/* y axis */}
        <div aria-hidden="true" className="flex h-48 flex-col justify-between py-0 text-end text-[0.6875rem] tabular-nums text-text-muted">
          {ticks.map((v, i) => (
            <span key={i} className="leading-none">
              {compact.format(v)}
            </span>
          ))}
        </div>
        {/* plot */}
        <div className="relative h-48">
          {ticks.map((_, i) => (
            <div
              key={i}
              aria-hidden="true"
              className="absolute inset-x-0 border-t border-border"
              style={{ top: `${(i / (ticks.length - 1)) * 100}%`, borderTopStyle: i === ticks.length - 1 ? "solid" : "dashed" }}
            />
          ))}
          <svg
            role="img"
            aria-label={summary}
            viewBox={`0 0 ${n * slot} 100`}
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full overflow-visible"
          >
            {points.map((p, i) => {
              const h = p.revenue > 0 ? Math.max(1.2, (p.revenue / max) * 100) : 0;
              const x = (rtl ? n - 1 - i : i) * slot + slot * 0.18;
              const today = i === n - 1;
              return (
                <g key={p.day}>
                  <rect x={(rtl ? n - 1 - i : i) * slot} y={0} width={slot} height={100} fill="transparent">
                    <title>{`${dayLabel(p.day, locale, true)} · ${formatAmount(p.revenue, locale)} · ${labels.orders}: ${formatInt(p.orders, locale)}`}</title>
                  </rect>
                  {h > 0 ? (
                    <rect
                      x={x}
                      y={100 - h}
                      width={slot * 0.64}
                      height={h}
                      className={today ? "pointer-events-none fill-accent" : "pointer-events-none fill-text-primary/75"}
                    />
                  ) : null}
                </g>
              );
            })}
          </svg>
        </div>
        {/* x axis */}
        <div aria-hidden="true" />
        <div aria-hidden="true" className="relative mt-2 h-4 text-[0.6875rem] tabular-nums text-text-muted">
          {tickDays.map((i) => {
            const pct = ((i + 0.5) / n) * 100;
            const edge = i === 0 ? "start" : i === n - 1 ? "end" : "mid";
            return (
              <span
                key={i}
                className="absolute top-0 whitespace-nowrap"
                style={
                  edge === "start"
                    ? { insetInlineStart: 0 }
                    : edge === "end"
                      ? { insetInlineEnd: 0 }
                      : { insetInlineStart: `${pct}%`, transform: `translateX(${rtl ? "50%" : "-50%"})` }
                }
              >
                {dayLabel(points[i].day, locale)}
              </span>
            );
          })}
        </div>
      </div>
      <p className="mt-4 text-[0.75rem] text-text-muted">{summary}</p>

      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">{labels.day}</th>
            <th scope="col">{labels.revenue}</th>
            <th scope="col">{labels.orders}</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.day}>
              <th scope="row">{dayLabel(p.day, locale, true)}</th>
              <td>{formatAmount(p.revenue, locale)}</td>
              <td>{formatInt(p.orders, locale)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
