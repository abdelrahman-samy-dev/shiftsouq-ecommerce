import { describe, expect, it } from "vitest";
import {
  announcementKey,
  announcementMessages,
  arabicDays,
  buildMenuItems,
  buildNavTree,
  chunk,
  clampQuantity,
  createRateLimiter,
  dayCount,
  freeDeliveryProgress,
  MAX_LINE_QUANTITY,
  navBreakpoint,
  phoneHref,
  rotateIndex,
  safeHref,
  socialLinks,
  whatsappHref,
  type CategoryRow,
  type Navigation,
} from "@/components/layout/shell-rules";
import { parseNewsletterEmail } from "@/lib/validations/newsletter";
import { legalFacts } from "@/components/shared/legal-facts";
import { DEFAULT_SETTINGS, normalizeSettings } from "@/lib/settings/types";

const row = (id: string, parent: string | null, sort = 0, extra: Partial<CategoryRow> = {}): CategoryRow => ({
  id,
  parent_id: parent,
  slug: id,
  name_en: id.toUpperCase(),
  name_ar: `ع-${id}`,
  image_url: null,
  sort_order: sort,
  ...extra,
});

describe("navigation tree", () => {
  const rows = [
    row("shoes", null, 2),
    row("clothing", null, 1, { is_featured: true, image_url: "https://img/clothing.jpg" }),
    row("empty", null, 3),
    row("shirts", "clothing", 2),
    row("polos", "clothing", 1),
    row("socks", "clothing", 3),
    row("boots", "shoes", 1),
  ];
  const counts: Record<string, number> = { shirts: 3, polos: 2, boots: 4 };
  const tree = buildNavTree(rows, (id) => counts[id] ?? 0, (id) => (id === "shoes" ? "https://img/boot.jpg" : null));

  it("keeps only branches with products, in sort order", () => {
    expect(tree.map((c) => c.slug)).toEqual(["clothing", "shoes"]);
    expect(tree[0].children.map((c) => c.slug)).toEqual(["polos", "shirts"]);
  });
  it("uses the category image, else a product photo", () => {
    expect(tree[0].image).toBe("https://img/clothing.jpg");
    expect(tree[1].image).toBe("https://img/boot.jpg");
    expect(tree[0].featured).toBe(true);
  });
  it("survives a parent cycle", () => {
    const cyclic = [row("a", "b"), row("b", "a")];
    expect(buildNavTree(cyclic, () => 1)).toEqual([]);
  });
});

describe("menu items", () => {
  const nav: Navigation = {
    categories: [
      { id: "1", slug: "clothing", name: { en: "Clothing", ar: "ملابس" }, featured: true, image: null, children: [{ id: "2", slug: "shirts", name: { en: "Shirts", ar: "قمصان" } }] },
      { id: "3", slug: "bags", name: { en: "Bags", ar: "حقائب" }, featured: false, image: null, children: [] },
    ],
    collections: [{ slug: "summer edit", title: { en: "Summer", ar: "الصيف" }, image: "https://img/s.jpg" }],
  };
  const labels = { newIn: "New in", collections: "Collections", shopAll: "Shop all" };

  it("builds categories, New in and Collections", () => {
    const items = buildMenuItems(nav, "en", labels);
    expect(items.map((i) => i.label)).toEqual(["Clothing", "Bags", "New in", "Collections"]);
    expect(items[0].panel?.links).toEqual([{ href: "/category/shirts", label: "Shirts" }]);
    expect(items[1].panel).toBeNull();
    expect(items[2].href).toBe("/shop?sort=newest");
    // Collections pages belong to another area: never prefetched, slugs encoded.
    expect(items[3].href).toBeNull();
    expect(items[3].panel?.links[0]).toEqual({ href: "/collections/summer%20edit", label: "Summer", prefetch: false });
  });
  it("adds collections and discover columns to category panels", () => {
    const items = buildMenuItems(nav, "en", { ...labels, discover: "Discover", bestSellers: "Best sellers" });
    expect(items[0].panel?.extras.map((c) => c.heading)).toEqual(["Collections", "Discover"]);
    expect(items[0].panel?.extras[1].links).toEqual([
      { href: "/shop?sort=newest", label: "New in" },
      { href: "/shop?sort=popular", label: "Best sellers" },
    ]);
    // The collections panel itself only adds Discover.
    expect(items[3].panel?.extras.map((c) => c.heading)).toEqual(["Discover"]);
  });
  it("drops the Discover \"New in\" link when a collection has that name", () => {
    const withNewIn: Navigation = { ...nav, collections: [...nav.collections, { slug: "new-in", title: { en: "New In", ar: "وصل حديثًا" }, image: null }] };
    const items = buildMenuItems(withNewIn, "en", { ...labels, discover: "Discover", bestSellers: "Best sellers" });
    expect(items[0].panel?.extras[1].links.map((l) => l.label)).toEqual(["Best sellers"]);
  });
  it("speaks Arabic and avoids two items with the same label", () => {
    const ar = buildMenuItems(nav, "ar", { ...labels, collections: "حقائب" });
    expect(ar.map((i) => i.label)).toEqual(["ملابس", "حقائب", "New in"]);
  });
  it("waits for wider screens when the labels are long", () => {
    expect(navBreakpoint(buildMenuItems(nav, "en", labels))).toBe("lg");
    const many = Array.from({ length: 8 }, (_, i) => ({ label: `Category number ${i}`, href: "/x", panel: null }));
    expect(navBreakpoint(many)).toBe("2xl");
  });
  it("splits links into columns", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
});

describe("mini-cart rules", () => {
  it("caps the quantity between 1 and 10", () => {
    expect(MAX_LINE_QUANTITY).toBe(10);
    expect(clampQuantity(0)).toBe(1);
    expect(clampQuantity(11)).toBe(10);
    expect(clampQuantity(3.7)).toBe(3);
    expect(clampQuantity(Number.NaN)).toBe(1);
  });
  it("tracks progress to free delivery", () => {
    expect(freeDeliveryProgress(250, 1000)).toEqual({ enabled: true, reached: false, remaining: 750, percent: 25 });
    expect(freeDeliveryProgress(1000, 1000)).toEqual({ enabled: true, reached: true, remaining: 0, percent: 100 });
    expect(freeDeliveryProgress(500, 0).enabled).toBe(false);
    expect(freeDeliveryProgress(-20, 500).percent).toBe(0);
  });
});

describe("announcement bar", () => {
  it("picks the visitor's language and drops empty messages", () => {
    const msgs = [{ en: "Free delivery", ar: "توصيل مجاني" }, { en: "", ar: "" }, { en: "Only English", ar: "" }];
    expect(announcementMessages(msgs, "ar")).toEqual(["توصيل مجاني", "Only English"]);
    expect(announcementMessages(msgs, "en")).toEqual(["Free delivery", "Only English"]);
  });
  it("rotates both ways", () => {
    expect(rotateIndex(2, 3)).toBe(0);
    expect(rotateIndex(0, 3, -1)).toBe(2);
    expect(rotateIndex(0, 0)).toBe(0);
  });
  it("changes its dismissal key when the messages change", () => {
    expect(announcementKey(["a", "b"])).toBe(announcementKey(["a", "b"]));
    expect(announcementKey(["a", "b"])).not.toBe(announcementKey(["a", "c"]));
  });
});

describe("links from settings", () => {
  it("accepts site paths and http(s) only", () => {
    expect(safeHref("/shop?sort=newest")).toBe("/shop?sort=newest");
    expect(safeHref("https://example.com/x")).toBe("https://example.com/x");
    expect(safeHref("javascript:alert(1)")).toBeNull();
    expect(safeHref("//evil.example")).toBeNull();
    expect(safeHref("")).toBeNull();
  });
  it("hides empty and placeholder social links", () => {
    expect(socialLinks({ instagram: "https://instagram.com/", facebook: "", tiktok: "https://tiktok.com/@store", x: "javascript:x" })).toEqual([
      { key: "tiktok", label: "TikTok", href: "https://tiktok.com/@store" },
    ]);
  });
  it("builds phone and WhatsApp links from digits", () => {
    expect(phoneHref("+20 100 000 0000")).toBe("tel:+201000000000");
    expect(phoneHref("n/a")).toBeNull();
    expect(whatsappHref("+20 100 123 4567")).toBe("https://wa.me/201001234567");
  });
});

describe("Arabic day counts", () => {
  it("agrees with the number", () => {
    expect(arabicDays(1)).toBe("يوم واحد");
    expect(arabicDays(2)).toBe("يومين");
    expect(arabicDays(7)).toBe("7 أيام");
    expect(arabicDays(14)).toBe("14 يومًا");
    expect(arabicDays(100)).toBe("100 يوم");
    expect(dayCount(1, "en")).toBe("1 day");
    expect(dayCount(30, "en")).toBe("30 days");
  });
});

describe("newsletter", () => {
  it("normalises and validates the address", () => {
    expect(parseNewsletterEmail("  Ahmed@Example.COM ")).toBe("ahmed@example.com");
    expect(parseNewsletterEmail("not-an-email")).toBeNull();
    expect(parseNewsletterEmail(undefined)).toBeNull();
    expect(parseNewsletterEmail(`${"a".repeat(250)}@x.com`)).toBeNull();
  });
  it("rate-limits per key within a window", () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 1000 });
    expect(limiter.hit("ip", 0)).toBe(true);
    expect(limiter.hit("ip", 10)).toBe(true);
    expect(limiter.hit("ip", 20)).toBe(false);
    expect(limiter.hit("other", 20)).toBe(true);
    expect(limiter.hit("ip", 1500)).toBe(true);
  });
  it("forgets old keys to stay bounded", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 10_000, maxKeys: 2 });
    limiter.hit("a", 0);
    limiter.hit("b", 0);
    limiter.hit("c", 0);
    expect(limiter.hit("a", 1)).toBe(true); // "a" was evicted
  });
});

describe("policy facts come from settings", () => {
  it("groups delivery fees by governorate", () => {
    const facts = legalFacts(DEFAULT_SETTINGS, "en");
    expect(facts.feeRows[0]).toEqual(["Cairo and Giza", "EGP 50"]);
    expect(facts.feeRows.at(-2)).toEqual(["All other governorates", "EGP 100"]);
    expect(facts.feeRows.at(-1)?.[1]).toBe("Free");
    expect(facts.paymentList).toBe("cash on delivery, bank cards (Visa, Mastercard and Meeza) and mobile wallets");
  });
  it("groups delivery times by range, fastest first, in checkout order", () => {
    const facts = legalFacts(DEFAULT_SETTINGS, "en", {
      aswan: { min: 4, max: 6 },
      giza: { min: 1, max: 2 },
      cairo: { min: 1, max: 2 },
      luxor: { min: 4, max: 6 },
    });
    expect(facts.etaRows).toEqual([
      ["Cairo and Giza", "1–2"],
      ["Luxor and Aswan", "4–6"],
    ]);
    expect(legalFacts(DEFAULT_SETTINGS, "en").etaRows).toEqual([]);
    expect(legalFacts(DEFAULT_SETTINGS, "ar", { cairo: { min: 1, max: 2 } }).etaRows[0][1]).toBe("1 إلى 2");
  });
  it("follows edited settings (return days, threshold, payment methods)", () => {
    const s = normalizeSettings({
      shipping: { default_fee: 80, free_threshold: 0, zones: {} },
      payments: { cod: true, card: false, wallet: false },
      policies: { return_days: 30 },
    });
    const ar = legalFacts(s, "ar");
    expect(ar.returnDays).toBe("30 يومًا");
    expect(ar.freeThreshold).toBeNull();
    expect(ar.paymentList).toBe("الدفع نقدًا عند الاستلام");
    expect(legalFacts(s, "en").feeRows.at(-1)).toEqual(["All other governorates", "EGP 80"]);
  });
});
