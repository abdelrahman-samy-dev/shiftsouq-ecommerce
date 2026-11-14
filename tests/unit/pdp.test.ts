import { describe, expect, it } from "vitest";
import {
  colourOptions,
  deliveryQuote,
  galleryLayout,
  imagesForColour,
  initialColour,
  initialSize,
  maxQuantity,
  resolveVariant,
  reviewerName,
  sizeOptions,
  sizeRank,
  splitLines,
  splitParagraphs,
  stockState,
  summarizeRatings,
  toSizeSystem,
  type PdpVariant,
} from "@/components/product/pdp-logic";
import { relevantRows, rowMatches, sizeLabel, sizeTable } from "@/components/product/size-guide";
import { parseRecent, pushRecent, recentForDisplay, type RecentItem } from "@/components/product/recently-viewed";
import { cleanText, createReviewSchema } from "@/components/product/review-schema";
import { pdpCopy, reviewsCopy } from "@/components/product/pdp-copy";
import { DEFAULT_SETTINGS } from "@/lib/settings/types";

const v = (id: string, colour: string | null, size: string | null, stock: number, extra: Partial<PdpVariant> = {}) => ({
  id,
  size,
  color_en: colour,
  color_ar: colour ? `${colour}-ar` : null,
  color_hex: colour ? "#000000" : null,
  stock,
  price_override: null,
  ...extra,
});

const shirt = [
  v("nv-s", "Navy", "S", 0),
  v("nv-m", "Navy", "M", 3),
  v("nv-l", "Navy", "L", 12),
  v("wh-s", "White", "S", 5),
  v("wh-m", "White", "M", 0),
  v("sg-m", "Sage", "M", 0),
];

describe("options", () => {
  it("lists colours once, marking a colour sold out only when no size is left", () => {
    const colours = colourOptions(shirt);
    expect(colours.map((c) => [c.key, c.inStock])).toEqual([
      ["Navy", true],
      ["White", true],
      ["Sage", false],
    ]);
  });

  it("keys colours by name, so two colours with the same hex stay apart", () => {
    const colours = colourOptions([v("a", "Black", "M", 1), v("b", "Black/Red", "M", 1)]);
    expect(colours).toHaveLength(2);
  });

  it("gives sizes with the stock of the chosen colour, in size order", () => {
    expect(sizeOptions(shirt, "Navy")).toEqual([
      { size: "S", stock: 0 },
      { size: "M", stock: 3 },
      { size: "L", stock: 12 },
    ]);
    expect(sizeOptions(shirt, "White").find((s) => s.size === "M")?.stock).toBe(0);
    // Without a colour: summed over colours.
    expect(sizeOptions(shirt, null).find((s) => s.size === "S")?.stock).toBe(5);
  });

  it("orders sizes by admin position first, then the usual size order", () => {
    const vs = [v("1", null, "XL", 1), v("2", null, "S", 1), v("3", null, "M", 1)];
    expect(sizeOptions(vs, null).map((s) => s.size)).toEqual(["S", "M", "XL"]);
    const positioned = [
      { ...v("1", null, "XL", 1), position: 0 },
      { ...v("2", null, "S", 1), position: 1 },
    ];
    expect(sizeOptions(positioned, null).map((s) => s.size)).toEqual(["XL", "S"]);
    expect(sizeRank("42")).toBeLessThan(sizeRank("43"));
  });

  it("resolves the exact variant only once every option is chosen", () => {
    expect(resolveVariant(shirt, "Navy", null)).toBeNull();
    expect(resolveVariant(shirt, null, "M")).toBeNull();
    expect(resolveVariant(shirt, "Navy", "L")?.id).toBe("nv-l");
    expect(resolveVariant(shirt, "Sage", "L")).toBeNull(); // combination doesn't exist
    // No options at all: the first variant in stock.
    expect(resolveVariant([v("a", null, null, 0), v("b", null, null, 2)], null, null)?.id).toBe("b");
  });

  it("pre-selects a single size and picks a sensible first colour", () => {
    expect(initialSize([v("a", "Navy", "OS", 3)])).toBe("OS");
    expect(initialSize(shirt)).toBeNull();
    expect(initialColour(shirt, [], "white")).toBe("White"); // ?color= (case-insensitive)
    expect(initialColour(shirt, [], "Purple")).toBe("Navy"); // unknown → first in stock
    expect(initialColour(shirt, [{ colour: "White" }], null)).toBe("White"); // colour of the main photo
    expect(initialColour([v("a", null, "M", 1)], [], null)).toBeNull();
    expect(initialColour([v("s", "Sage", "M", 0), v("n", "Navy", "M", 1)], [], null)).toBe("Navy");
  });

  it("normalises the size system", () => {
    expect(toSizeSystem("shoes")).toBe("shoes");
    expect(toSizeSystem("weird")).toBe("apparel");
    expect(toSizeSystem(null)).toBe("apparel");
  });
});

describe("gallery", () => {
  const images = [
    { id: "1", colour: "Navy" },
    { id: "2", colour: "White" },
    { id: "3", colour: null },
    { id: "4", colour: "navy" },
  ];

  it("shows the colour's photos first, then shared ones, and hides other colours", () => {
    expect(imagesForColour(images, "Navy").map((i) => i.id)).toEqual(["1", "4", "3"]);
    expect(imagesForColour(images, "White").map((i) => i.id)).toEqual(["2", "3"]);
  });

  it("falls back to every photo when the colour has none of its own", () => {
    expect(imagesForColour(images, "Sage").map((i) => i.id)).toEqual(["1", "2", "3", "4"]);
    expect(imagesForColour(images, null)).toHaveLength(4);
  });

  it("lays out the desktop stack without holes", () => {
    expect(galleryLayout(0)).toEqual([]);
    expect(galleryLayout(1)).toEqual(["full"]);
    expect(galleryLayout(2)).toEqual(["full", "full"]);
    expect(galleryLayout(3)).toEqual(["full", "half", "half"]);
    expect(galleryLayout(4)).toEqual(["full", "half", "half", "full"]);
    expect(galleryLayout(5)).toEqual(["full", "half", "half", "half", "half"]);
  });
});

describe("stock, quantity and delivery", () => {
  it("flags low stock at or below the threshold", () => {
    expect(stockState(0, 5)).toEqual({ kind: "out" });
    expect(stockState(5, 5)).toEqual({ kind: "low", count: 5 });
    expect(stockState(6, 5)).toEqual({ kind: "in" });
    expect(stockState(2, 0)).toEqual({ kind: "in" }); // threshold 0 = never "low"
  });

  it("caps quantity at the stock and the cart limit of 10", () => {
    expect(maxQuantity(3)).toBe(3);
    expect(maxQuantity(40)).toBe(10);
    expect(maxQuantity(0)).toBe(1);
    expect(maxQuantity(null)).toBe(10);
  });

  it("prices delivery with the checkout rule", () => {
    const shipping = { ...DEFAULT_SETTINGS.shipping, freeThreshold: 1500, zones: { cairo: 50, aswan: 120 }, defaultFee: 100 };
    expect(deliveryQuote(shipping, "cairo", 990)).toEqual({ fee: 50, free: false, remaining: 510 });
    expect(deliveryQuote(shipping, "aswan", 1500)).toEqual({ fee: 0, free: true, remaining: 0 });
    expect(deliveryQuote(shipping, "unknown", 200).fee).toBe(100);
    expect(deliveryQuote({ ...shipping, freeThreshold: 0 }, "cairo", 99999)).toEqual({ fee: 50, free: false, remaining: 0 });
  });
});

describe("text", () => {
  it("turns details into bullets, one per line", () => {
    expect(splitLines("- 100% cotton\n\n• Relaxed fit \r\n  Button-down collar")).toEqual([
      "100% cotton",
      "Relaxed fit",
      "Button-down collar",
    ]);
    expect(splitLines(null)).toEqual([]);
  });

  it("keeps descriptions as plain-text paragraphs", () => {
    expect(splitParagraphs("One\ntwo\n\n<b>Three</b>")).toEqual([["One", "two"], ["<b>Three</b>"]]);
  });

  it("shows reviewers by first name and last initial", () => {
    expect(reviewerName("Mona Buyer")).toBe("Mona B.");
    expect(reviewerName("  Omar   El Sayed ")).toBe("Omar S.");
    expect(reviewerName("منى أحمد")).toBe("منى أ.");
    expect(reviewerName("Cher")).toBe("Cher");
    expect(reviewerName("")).toBeNull();
    expect(reviewerName(null)).toBeNull();
  });

  it("summarises ratings 5 → 1", () => {
    const s = summarizeRatings([5, 4, 4, 2, 9]);
    expect(s.count).toBe(4);
    expect(s.average).toBe(3.8);
    expect(s.distribution).toEqual([
      { stars: 5, count: 1 },
      { stars: 4, count: 2 },
      { stars: 3, count: 0 },
      { stars: 2, count: 1 },
      { stars: 1, count: 0 },
    ]);
  });

  it("writes Arabic counts with the right noun forms and Western digits", () => {
    const ar = pdpCopy("ar");
    expect(ar.onlyLeft(1)).toBe("لم يتبقَّ سوى قطعة واحدة");
    expect(ar.onlyLeft(2)).toBe("لم يتبقَّ سوى قطعتين");
    expect(ar.onlyLeft(3)).toBe("لم يتبقَّ سوى 3 قطع");
    expect(ar.reviewsCount(12)).toBe("12 تقييمًا");
    expect(ar.freeReturns(14)).toBe("إرجاع سهل خلال 14 يومًا");
    expect(ar.freeReturns(7)).toBe("إرجاع سهل خلال 7 أيام");
    expect(pdpCopy("en").onlyLeft(3)).toBe("Only 3 left");
    expect(reviewsCopy("en").basedOn(1)).toBe("Based on 1 review");
  });
});

describe("size systems", () => {
  it("labels kids sizes naturally in Arabic and keeps others as stored", () => {
    expect(sizeLabel("kids", "8Y", "en")).toBe("8Y");
    expect(sizeLabel("kids", "8Y", "ar")).toBe("8 سنوات");
    expect(sizeLabel("kids", "12Y", "ar")).toBe("12 سنة");
    expect(sizeLabel("kids", "7-8Y", "ar")).toBe("⁦7–8⁩ سنوات");
    expect(sizeLabel("kids", "6-12M", "ar")).toBe("⁦6–12⁩ شهرًا");
    expect(sizeLabel("apparel", "M", "ar")).toBe("M");
    expect(sizeLabel("one_size", "OS", "en")).toBe("One size");
  });

  it("has a table for every system except one size", () => {
    expect(sizeTable("apparel")?.columns[0].en).toBe("Size");
    expect(sizeTable("shoes")?.columns[1].en).toMatch(/Foot length/);
    expect(sizeTable("waist")).not.toBeNull();
    expect(sizeTable("kids")).not.toBeNull();
    expect(sizeTable("one_size")).toBeNull();
  });

  it("converts EU shoe sizes to foot length", () => {
    const row = sizeTable("shoes")!.rows.find((r) => r.size === "42")!;
    expect(row.values[0]).toBe("26.5");
    expect(row.values[1]).toBe("8.5"); // UK
  });

  it("narrows long tables to the product's range and highlights its sizes", () => {
    const shoes = sizeTable("shoes")!;
    expect(relevantRows(shoes, "shoes", ["40", "44"]).map((r) => r.size)).toEqual(["39", "40", "41", "42", "43", "44", "45"]);
    expect(relevantRows(sizeTable("apparel")!, "apparel", ["S"])).toHaveLength(6);
    expect(rowMatches("xl", ["S", "XL"])).toBe(true);
  });
});

describe("recently viewed", () => {
  const item = (id: string, extra: Partial<RecentItem> = {}): RecentItem => ({
    id,
    slug: `p-${id}`,
    name_en: `P ${id}`,
    name_ar: `م ${id}`,
    image: "https://images.unsplash.com/x.jpg",
    price: 100,
    compareAt: null,
    varies: false,
    viewedAt: 1,
    ...extra,
  });

  it("moves a viewed product to the front, without duplicates, up to the limit", () => {
    let list: RecentItem[] = [];
    for (const id of ["a", "b", "c", "a"]) list = pushRecent(list, item(id), 3);
    expect(list.map((i) => i.id)).toEqual(["a", "c", "b"]);
    list = pushRecent(list, item("d"), 3);
    expect(list.map((i) => i.id)).toEqual(["d", "a", "c"]);
    expect(recentForDisplay(list, "a").map((i) => i.id)).toEqual(["d", "c"]);
  });

  it("drops malformed or unsafe entries from storage", () => {
    expect(parseRecent("not json")).toEqual([]);
    expect(parseRecent('{"a":1}')).toEqual([]);
    const parsed = parseRecent(
      JSON.stringify([
        item("ok"),
        { ...item("bad-slug"), slug: "../../admin" },
        { ...item("js"), image: "javascript:alert(1)" },
        { ...item("http"), image: "http://evil.example/x.jpg" },
        { id: "no-price", slug: "x", name_en: "X" },
        item("ok"),
      ]),
    );
    expect(parsed.map((i) => i.id)).toEqual(["ok", "js", "http"]);
    expect(parsed[1].image).toBeNull();
    expect(parsed[2].image).toBeNull();
  });
});

describe("review input", () => {
  const schema = createReviewSchema(reviewsCopy("en").errors);
  const base = { productId: "aaaaaaaa-0000-4000-8000-000000000001", rating: 4, title: "Nice", comment: "Soft and fits well." };

  it("accepts a valid review and tidies whitespace", () => {
    const r = schema.parse({ ...base, title: "  Very   nice ", comment: "Line one\n\n\n\nline   two here" });
    expect(r.title).toBe("Very nice");
    expect(r.comment).toBe("Line one\n\nline two here");
    expect(cleanText(42)).toBe("");
  });

  it("rejects ratings outside 1–5, long titles and short or long comments", () => {
    expect(schema.safeParse({ ...base, rating: 0 }).success).toBe(false);
    expect(schema.safeParse({ ...base, rating: 6 }).success).toBe(false);
    expect(schema.safeParse({ ...base, rating: 4.5 }).success).toBe(false);
    expect(schema.safeParse({ ...base, title: "x".repeat(121) }).success).toBe(false);
    expect(schema.safeParse({ ...base, comment: "too short" }).success).toBe(false);
    expect(schema.safeParse({ ...base, comment: "   padded   " }).success).toBe(false);
    expect(schema.safeParse({ ...base, comment: "x".repeat(2001) }).success).toBe(false);
    expect(schema.safeParse({ ...base, productId: "not-a-uuid" }).success).toBe(false);
  });

  it("lets the title be empty", () => {
    expect(schema.safeParse({ ...base, title: "" }).success).toBe(true);
    expect(schema.safeParse({ ...base, title: undefined }).success).toBe(true);
  });
});
