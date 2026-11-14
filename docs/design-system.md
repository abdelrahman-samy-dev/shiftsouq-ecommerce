# ShiftSouq Design System — "Editorial"

The storefront should feel like a modern fashion house (COS, Arket, Our Legacy, Mr Porter, Aesop), not a component-library template.
Photography is the hero. Type does the decorating. Chrome stays quiet.

The store is white-label: name, logo, colours, contact, currency and shipping live in `lib/brand/config.ts` (build-time) and the `store_settings` table (editable by the super admin). Never hard-code the brand name or colours in components.

---

## 1. Principles

1. **Image first.** Product imagery is large, edge-to-edge where possible, on a warm neutral ground. No drop shadows, no boxed cards around products.
2. **Quiet chrome.** Hairline 1px borders, square-ish corners (2–4px), no gradients, no glassmorphism, no glow.
3. **Type as decoration.** Big display serif for moments (hero, page titles, product name); small, calm sans for everything else; tiny uppercase eyebrows (Latin only).
4. **One accent.** Clay (`--accent`) marks sale prices, highlights and focus details. Everything else is ink on paper.
5. **Fast and honest.** Server components by default, no layout shift, skeletons that match the final layout, every number shown to buyers comes from the server.
6. **Two languages, one design.** Every screen works in English (LTR) and Arabic (RTL) with logical CSS only.

## 2. Tokens (defined in `app/globals.css`, used via Tailwind classes / CSS vars)

| Token | Light | Dark | Use |
|---|---|---|---|
| `--background` (paper) | `#F6F4EF` | `#121110` | page |
| `--surface` (sand) | `#EEEAE2` | `#1B1A18` | image placeholders, sections, hover fills |
| `--surface-elevated` | `#FBFAF7` | `#22201E` | drawers, dropdowns, dialogs, inputs |
| `--surface-inset` | `#E4DFD5` | `#2A2724` | skeletons, pressed |
| `--text-primary` (ink) | `#161513` | `#EDEAE3` | text, primary buttons |
| `--text-secondary` | `#4A4741` | `#BDB8AE` | body copy |
| `--text-muted` | `#77736B` | `#8F8A80` | meta, labels |
| `--text-faint` | `#A8A39A` | `#6A665E` | placeholders, disabled |
| `--border` | `#DDD8CE` | `#2E2B27` | hairlines |
| `--border-hover` / strong | `#BDB6A8` | `#4A453F` | hover, selected outline uses `--text-primary` |
| `--primary` / `--primary-foreground` | ink / paper | paper-ish / ink | buttons |
| `--accent` (clay) | `#9C4A2A` | `#D27A55` | sale price, highlights |
| `--success` | `#3F6B4B` | `#7FB08C` | in stock, paid |
| `--warning` | `#A6741D` | `#E0B35A` | low stock, pending |
| `--destructive` | `#A3352B` | `#E07A6E` | errors, cancel |

Radius: `--radius-sm 2px`, `--radius-md 4px`, `--radius-lg 6px`, `--radius-xl 8px`, `--radius-full` for swatches/avatars/counters only.
Shadows: none on the page. Only floating layers (drawer, dropdown, dialog) get `--shadow-float`.
Motion: `--duration-fast 150ms`, `--duration-base 240ms`, `--duration-slow 420ms`, easing `--ease-out-expo`. Respect `prefers-reduced-motion`.

## 3. Typography

| Family | Variable | Use |
|---|---|---|
| Instrument Sans (Latin) + IBM Plex Sans Arabic | `--font-sans` | all UI and body text |
| Instrument Serif (Latin) + IBM Plex Sans Arabic 600 | `--font-display` | hero, page titles, product names, section titles |

The browser picks the Arabic or Latin face per glyph, so components never switch fonts by locale.

Scale (utility classes in globals.css):

- `.t-display` — clamp(2.75rem, 7vw, 6.5rem), display font, leading 0.95, tracking -0.02em
- `.t-h1` — clamp(2rem, 4.2vw, 3.5rem), display font, leading 1.02
- `.t-h2` — clamp(1.5rem, 2.6vw, 2.25rem), display font, leading 1.1
- `.t-h3` — 1.125rem, sans 500
- body — 0.9375rem (15px) / 1.6, sans 400, `--text-secondary`
- `.t-small` — 0.8125rem (13px)
- `.t-eyebrow` — 0.6875rem (11px), sans 500, uppercase, tracking 0.14em, `--text-muted`. **Arabic: no uppercase, no letter-spacing** (letter-spacing breaks Arabic joining) — handled in CSS with `:lang(ar)`.
- Prices: sans 500, `font-variant-numeric: tabular-nums`. Sale price in `--accent`, old price `--text-muted` with line-through. Arabic UI shows Western digits ("120 ج.م") via `formatPrice`.

## 4. Layout

- Container: `.container-x` → max-width 1600px, inline padding 20px (mobile) / 32px (≥768) / 48px (≥1280).
- Sections are separated by space (`py-16 md:py-24`), not boxes.
- Product grids: 2 columns mobile (column gap 12px, row gap 32px), 3 at ≥768, 4 at ≥1280. PLP has a 2/4 density toggle on desktop.
- Images: product 4:5 (`aspect-[4/5]`), editorial 3:4 or 16:9. Always `next/image` with correct `sizes`; `priority` only on the LCP image.

## 5. Components (`components/ds/*` — import from `@/components/ds`)

- **Button** — `variant`: `primary` (ink fill), `secondary` (hairline outline), `ghost`, `link` (underline grows on hover); `size`: `sm` 36px, `md` 44px, `lg` 52px; full-width option; loading state keeps width. Square corners (`--radius-sm`). Labels in sentence case, sans 500.
- **IconButton** — 40px hit area, ghost, `aria-label` required.
- **Input / Textarea / Select** — 48px, `--surface-elevated` fill, hairline border, label above (13px, muted), error text below in `--destructive`. Focus: border ink + 2px ring `color-mix(ink 15%)`.
- **Checkbox / Radio / RadioCard** — square 18px checkbox; RadioCard = bordered row that becomes ink-outlined when selected.
- **Badge** — small text tag on paper, 11px sans 500, e.g. "New", "−20%", "Sold out". No pills, no red boxes.
- **Swatch** — 20px circle with hairline ring; selected = 2px ink ring with 2px gap; `title` + visually hidden name.
- **SizeButton** — min 48×40, hairline; selected ink fill; sold out = diagonal strike + muted, still focusable with "sold out" label.
- **Drawer** — slides from the inline end (cart, filters, size guide) or start (mobile menu); full height, `--surface-elevated`, header with title + close, focus trap, Esc closes, body scroll lock.
- **Dialog**, **Accordion** (hairline separated, + / − icon), **Tabs** (underline), **Breadcrumbs** (muted, `/` separators), **Rating** (stars, numeric), **QuantityStepper**, **Price**, **Skeleton**, **EmptyState** (display-font title, one sentence, one action), **Toast** (sonner, ink background).
- **ProductCard** — no border/box. Image on `--surface`, second image cross-fades on hover (desktop); wishlist heart top-end; badges top-start; name (14px, `--text-primary`), price row below; "+N colours" meta. Desktop hover reveals quick-add sizes along the image bottom; mobile shows a small "+" that opens a size sheet.

## 6. Page patterns

- **Announcement bar** (ink, 32px): rotating messages from settings — free shipping threshold, cash on delivery, returns.
- **Header** (64px): start = nav links with mega menu (desktop) / menu button (mobile); centre = wordmark; end = search, account, wishlist, bag (with count), language, theme (sky toggle). Transparent over the home hero, solid paper with hairline once scrolled.
- **Search**: icon opens a panel under the header with a large input, recent + trending searches, matching categories and live product results (debounced); Enter → `/search?q=`. Arabic-aware matching (أ/إ/آ→ا, ة→ه, ى→ي, diacritics removed).
- **Home**: full-bleed hero (image + display headline + 1 CTA) → category tiles → new arrivals rail → editorial split (image + story) → best sellers → values strip (delivery, COD, returns) → newsletter. Content comes from the DB where it exists (categories, products, home blocks).
- **PLP / search results**: title + count; sticky toolbar (Filter button → drawer, active filter chips, sort, density); facets computed from the current result set: category, size (grouped by size system), colour (named swatches), price (range), availability, on sale. URL holds the state. "Load more" with paginated URLs underneath for SEO.
- **PDP**: gallery (desktop: 2-column image stack, mobile: swipe with counter) + sticky info: breadcrumbs, name, price, colour, size + size guide, stock note, add to bag, wishlist, delivery promise by governorate, accordions (description, details & care, delivery & returns). Below: reviews, related, recently viewed. Mobile: sticky add-to-bag bar.
- **Cart**: mini-cart drawer on add + full page; free-shipping progress; quantity steppers; promo code at checkout.
- **Checkout**: one page, guest allowed; sections Contact → Delivery → Payment; sticky summary with promo code; mobile summary collapsible at the top.
- **Account**: orders (with status timeline), addresses, wishlist, profile, security.
- **Footer**: newsletter, link columns, payment methods, social, language/theme, legal.
- **Admin**: same tokens, denser: sidebar navigation, data tables with hairlines, filters bar, detail drawers, simple charts. Function over decoration.

## 7. Arabic / RTL rules

- Logical utilities only: `ms-/me-/ps-/pe-/start-/end-/text-start/text-end/border-s/rounded-s…`. Never `ml/mr/pl/pr/left/right/text-left/text-right`.
- Direction icons flip with `rtl:-scale-x-100`.
- No uppercase or letter-spacing on Arabic text.
- Copy is Modern Standard Arabic; never machine-literal. Check every word for double meanings.
- Numbers and prices use Western digits in both languages.

## 8. Accessibility

WCAG 2.2 AA: contrast ≥ 4.5:1 for text, visible focus (`:focus-visible` 2px ink ring with offset), 44px touch targets, every icon button labelled, drawers/dialogs trap focus and restore it, forms announce errors, images have meaningful `alt` (decorative = `alt=""`).

## 9. Performance budgets

- Mobile Lighthouse ≥ 90 performance, 100 SEO, ≥ 95 accessibility on home, PLP and PDP (production build).
- LCP < 2.5s, CLS < 0.05, INP < 200ms.
- No Swiper; carousels are CSS scroll-snap. framer-motion only where CSS can't do it (use `LazyMotion` + `m`).
- Fonts via `next/font` with `display: swap`; only Instrument Sans is preloaded.

## 10. Data access (backend-agnostic)

Components never import Supabase. Reads go through `lib/dal/*` (server-only), writes through server actions in `lib/actions/*`. Swapping Supabase for another backend means rewriting `lib/dal`, `lib/actions` and `lib/supabase` only.
