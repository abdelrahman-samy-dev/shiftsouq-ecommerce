/* ══════════════════════════════════════════════════════════════
   Admin — CSV building (pure)
   ──────────────────────────────────────────────────────────────
   Spreadsheet apps run a cell that starts with = + - @ (or a tab /
   carriage return) as a formula. Customer-typed text (names,
   addresses, notes) ends up in exports, so such text cells are
   prefixed with a single quote and shown as plain text instead.
   Numbers are written as-is.
   ══════════════════════════════════════════════════════════════ */

const FORMULA_START = /^[=+\-@\t\r]|^\s+[=+\-@]/;

/** Escapes one value as a quoted CSV cell. */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : '""';
  if (typeof value === "bigint") return String(value);

  let text: string;
  if (typeof value === "boolean") text = value ? "true" : "false";
  else if (value instanceof Date) text = value.toISOString();
  else if (typeof value === "object") text = JSON.stringify(value);
  else text = String(value);

  if (FORMULA_START.test(text)) text = "'" + text;
  return `"${text.replace(/"/g, '""')}"`;
}

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => unknown;
}

/** Builds CSV text. Without columns, every key of the first row becomes a column. */
export function toCsv<T extends object>(rows: readonly T[], columns?: readonly CsvColumn<T>[]): string {
  const cols: readonly CsvColumn<T>[] =
    columns ??
    (rows.length
      ? Object.keys(rows[0]).map((key) => ({
          header: key,
          value: (row: T) => (row as Record<string, unknown>)[key],
        }))
      : []);
  const lines = [cols.map((c) => csvCell(c.header)).join(",")];
  for (const row of rows) lines.push(cols.map((c) => csvCell(c.value(row))).join(","));
  // CRLF: what spreadsheet apps expect for line breaks between rows.
  return lines.join("\r\n");
}
