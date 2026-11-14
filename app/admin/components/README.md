# Admin building blocks

Shared pieces for every admin page. Same tokens as the storefront (`docs/design-system.md` §6), denser: hairlines, 2–4px corners, no shadows except floating layers. Import by relative path (`../components/…`) or `@/app/admin/components/…`.

The shell (`app/admin/AdminShell.tsx`) already provides the sidebar, top bar, breadcrumbs and the scroll container (`#admin-content`, padding `px-4 md:px-6 lg:px-8`, `pt-6 lg:pt-8`). Pages render only their content.

## Layout and display — `ui.tsx` (server-safe)

| Block | Use |
|---|---|
| `PageHeader` | `title` (h1, display font), `description`, `actions` (end side), `back={{ href, label }}`, `meta` (tags under the title). One per page. |
| `Panel` | Bordered section. `title`, `description`, `actions` in a header row; `padded={false}` for tables/lists that run edge to edge; `id` for anchor links. |
| `StatCard` | KPI tile: `label`, `value`, optional `delta={{ change, label, context, upIsGood }}`, `hint`, `href`. |
| `AdminEmptyState` | Icon, title, one sentence, one action. Use inside a `Panel`. |
| `Tag` | Status tag. `tone`: neutral, ink, success, warning, danger, accent, muted; `dot` adds a dot. |
| `KeyValueList` + `KeyValue` | Label/value rows with hairlines (`ltr` for e-mails, phone numbers, ids). |
| `TabsNav` | Underlined link tabs; state lives in the URL. `tabs=[{ href, label, count?, current }]`. |
| `FilterBar` | Row above a table: search first, selects after; `end` for result counts / "clear filters". |
| `Notice` | Inline message (`neutral`, `warning`, `danger`, `success`), e.g. owner-only notices. |
| `Avatar` | Initials circle for people. |

## Tables — `DataTable.tsx` (server-safe)

```tsx
<DataTable
  caption="Customers"                       // accessible name (visually hidden)
  rows={rows}
  rowKey={(r) => r.id}
  sort={{ key, dir, href: (key, dir) => `?sort=${key}&dir=${dir}`, sortLabel: t.common.sortBy }}
  columns={[
    { key: "name", header: "Customer", sortKey: "name", firstDir: "asc", cell: (r) => <Link …/> },
    { key: "total", header: "Total", align: "end", sortKey: "total", cell: (r) => … },
    { key: "region", header: "Region", hideBelow: "lg", cell: (r) => … },
    { key: "actions", header: <span className="sr-only">Actions</span>, align: "end", className: "w-12", cell: (r) => <ActionMenu …/> },
  ]}
/>
```

Sticky header (sticks to the shell's scroll container), hairline rows, `aria-sort` on sorted columns. Put it in `<Panel padded={false}>`. On phones prefer a card list for the main list pages (see `app/admin/orders/page.tsx`).

## Actions (client)

| Block | Use |
|---|---|
| `ActionButton` | One bound server action: `action={approve.bind(null, id)}`, `success`, `errors` (key → text, `generic` fallback), optional `confirm={{ title, body, confirmLabel, cancelLabel, tone }}`. The action's `revalidatePath` refreshes the page. |
| `ActionMenu` | "⋯" row menu. Items: `{ type: "link", label, href }`, `{ type: "action", label, action, success, errors, confirm?, tone? }`, `{ type: "button", label, onSelect }` (client callers only), `{ type: "separator" }`, `{ type: "note", label }`. Keyboard: ↑/↓, Home/End, Esc. |
| `ConfirmDialog` | "Are you sure?" on the design-system `Dialog`. Mounted only while open. `children` for extra fields (e.g. type-to-confirm). |
| `adminButton(variant, size, extra?)` (`buttons.ts`) | Class string for `<button>`, `<Link>`, `<a>`. Variants: `primary`, `outline`, `ghost`, `danger`, `dangerSolid`, `warningSolid`. Sizes: `sm` (36px), `md` (40px), `icon`; all 44px on touch screens. |

Server actions return `{ ok: true } | { ok: false, error: key }` and must check the role on the server and call `logAdminAction` after the write.

## Filters and lists (client)

| Block | Use |
|---|---|
| `AdminSearchInput` | Debounced `?search=` (resets the page). |
| `AdminFilterDropdown` | Native select for one URL param: `param`, `options`, `defaultLabel` ("All …"), `label`. |
| `DateRangeFilter` | `?from=` / `?to=` (YYYY-MM-DD, store time). |
| `AdminPagination` | Previous / next links that keep the other params. |
| `ExportCsvButton` | `fetchData` = a server action bound to the current filters; cells are formula-escaped (`lib/admin/csv.ts`). |

## Other

- `StatusBadges.tsx`: order status, payment status and payment method.
- `OrderActionsDropdown`, `OrderStatusPanel`, `useOrderActions`: order transitions (rules in `lib/admin/orders.ts`).
- `RevenueChart`: plain-SVG daily bars with an accessible table.
- `Skeletons.tsx`: `PageHeaderSkeleton`, `FilterBarSkeleton`, `TableSkeleton` for `loading.tsx` files.
- Text: `getAdminText(locale)` from `lib/admin/i18n.ts` (`common`, `shell`, … ); images: `adminImage(url)` from `lib/admin/images.ts`.
