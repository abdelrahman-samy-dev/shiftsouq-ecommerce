import { describe, expect, it } from "vitest";
import {
  cleanQuery,
  editDistance,
  normalizeSearch,
  searchTokens,
  textMatchLevel,
  tokenMatchLevel,
} from "@/lib/search/normalize";
import { compareSizes, groupSizeOptions, parseSizeToken, sizeLabel } from "@/lib/search/sizes";
import {
  activeFilterCount,
  clearFilters,
  listingHref,
  listingSearchParams,
  pageWindow,
  parseListingParams,
  resultKey,
  toggleValue,
  updateListing,
} from "@/lib/search/listing-params";
import { buildCategoryFacetTree, parseFacets, pricePresets } from "@/lib/search/facets";
import { activeChips, priceRangeLabel, sizeChipLabel } from "@/lib/search/filter-labels";

describe("search normalisation (mirror of normalize_ar)", () => {
  it("matches the database output for mixed English and Arabic", () => {
    // Same input as the SQL check; expected text is what normalize_ar() returned.
    const input =
      "  Men's T-Shirt — «قَمِيصٌ» أحمد إسلام آمنة ٱلله مدرسة مستشفى مؤمن قائم قمیص کتاب ١٢٣ ۴۵ ـــطويل ";
    expect(normalizeSearch(input)).toBe("men s t shirt قميص احمد اسلام امنه الله مدرسه مستشفي مومن قايم قميص كتاب 123 45 طويل");
  });

  it("treats Persian ye and Arabic ya the same", () => {
    expect(normalizeSearch("قمیص")).toBe(normalizeSearch("قميص"));
  });

  it("splits into distinct tokens, at most eight", () => {
    expect(searchTokens("Black  black, SHIRT")).toEqual(["black", "shirt"]);
    expect(searchTokens("a b c d e f g h i j")).toHaveLength(8);
  });

  it("cleans a raw query to 60 characters without control characters", () => {
    expect(cleanQuery("  polo\u0000  shirt ")).toBe("polo shirt");
    expect(cleanQuery("x".repeat(80))).toHaveLength(60);
    expect(cleanQuery(null)).toBe("");
  });
});

describe("typo tolerance", () => {
  it("counts an adjacent swap as one edit", () => {
    expect(editDistance("shrit", "shirt")).toBe(1);
    expect(editDistance("shrit", "short")).toBe(2);
    expect(editDistance("kitten", "sitting")).toBe(3);
    expect(editDistance("بنطلوم", "بنطلون")).toBe(1);
  });

  it("ranks prefix > typo > inside a word", () => {
    expect(tokenMatchLevel("shi", "shirt")).toBe(3);
    expect(tokenMatchLevel("shirts", "shirt")).toBe(3); // plural
    expect(tokenMatchLevel("قميص", "القميص")).toBe(3); // article ignored
    expect(tokenMatchLevel("shrit", "shirt")).toBe(2);
    expect(tokenMatchLevel("shrit", "short")).toBe(0);
    expect(tokenMatchLevel("irt", "shirt")).toBe(1);
    expect(tokenMatchLevel("sh", "trash")).toBe(0); // too short to match inside a word
  });

  it("scores whole texts like the database tiers", () => {
    expect(textMatchLevel("men", "Men")).toBe(5);
    expect(textMatchLevel("sne", "Sneakers")).toBe(4);
    expect(textMatchLevel("shoes", "Formal Oxford Shoes")).toBe(3);
    expect(textMatchLevel("sneekers", "Sneakers")).toBe(2);
    expect(textMatchLevel("أحذية", "احذيه رياضية")).toBe(4);
    expect(textMatchLevel("hats", "Sneakers")).toBe(0);
  });

  it("uses the synonyms table for everyday words", () => {
    const synonyms = new Map([["بنطلون", ["بنطال", "بناطيل"]]]);
    expect(textMatchLevel("بنطلون", "بناطيل")).toBe(0);
    expect(textMatchLevel("بنطلون", "بناطيل", synonyms)).toBe(3);
  });
});

describe("size order", () => {
  const sort = (list: string[]) => [...list].sort(compareSizes);

  it("orders clothing sizes the way people read them", () => {
    expect(sort(["XL", "S", "M", "XXL", "XS", "L", "3XL"])).toEqual(["XS", "S", "M", "L", "XL", "XXL", "3XL"]);
    expect(sort(["L/XL", "S/M", "M"])).toEqual(["S/M", "M", "L/XL"]);
  });

  it("orders kids, waist and shoe sizes numerically", () => {
    expect(sort(["10Y", "6Y", "18M", "8Y", "12-13Y"])).toEqual(["18M", "6Y", "8Y", "10Y", "12-13Y"]);
    expect(sort(["34", "30", "32", "28"])).toEqual(["28", "30", "32", "34"]);
    expect(sort(["42.5", "41", "43", "40", "EU 39"])).toEqual(["EU 39", "40", "41", "42.5", "43"]);
  });

  it("groups by size system in a fixed order, never mixing them", () => {
    const groups = groupSizeOptions([
      { group: "shoes", value: "42", count: 2 },
      { group: "apparel", value: "L", count: 1 },
      { group: "one_size", value: "OS", count: 3 },
      { group: "apparel", value: "S", count: 4 },
      { group: "waist", value: "32", count: 1 },
    ]);
    expect(groups.map((g) => g.group)).toEqual(["apparel", "waist", "shoes", "one_size"]);
    expect(groups[0].options.map((o) => o.value)).toEqual(["S", "L"]);
  });

  it("parses size tokens and labels", () => {
    expect(parseSizeToken("shoes.42.5")).toEqual({ group: "shoes", value: "42.5" });
    expect(parseSizeToken("M")).toEqual({ group: null, value: "M" });
    expect(parseSizeToken("bogus.M")).toEqual({ group: null, value: "bogus.M" });
    expect(sizeLabel("OS", "en")).toBe("One size");
    expect(sizeChipLabel("shoes.42", "en")).toBe("EU 42");
    expect(sizeChipLabel("waist.32", "en")).toBe("W32");
    expect(sizeChipLabel("apparel.M", "ar")).toBe("M");
  });
});

describe("listing URL state", () => {
  it("parses and serialises a full state in a stable order", () => {
    const state = parseListingParams(
      new URLSearchParams("color=Black&size=apparel.M&size=shoes.42&q=+polo++shirt&category=men&min=100&max=250&stock=1&sale=1&sort=price_asc&page=2&view=2"),
    );
    expect(state).toMatchObject({
      q: "polo shirt",
      categories: ["men"],
      sizes: ["apparel.M", "shoes.42"],
      colors: ["Black"],
      min: 100,
      max: 250,
      inStock: true,
      onSale: true,
      sort: "price_asc",
      page: 2,
      view: 2,
    });
    expect(listingSearchParams(state).toString()).toBe(
      "q=polo+shirt&category=men&size=apparel.M&size=shoes.42&color=Black&min=100&max=250&stock=1&sale=1&sort=price_asc&view=2&page=2",
    );
    // Round trip.
    expect(parseListingParams(listingSearchParams(state))).toEqual(state);
  });

  it("accepts the older parameter names", () => {
    const state = parseListingParams({ sizes: "M,L", colors: "Black,Navy", minPrice: "50", maxPrice: "10", isNew: "true", sort: "popular" });
    expect(state.sizes).toEqual(["M", "L"]);
    expect(state.colors).toEqual(["Black", "Navy"]);
    expect([state.min, state.max]).toEqual([10, 50]); // swapped
    expect(state.isNew).toBe(true);
    expect(state.sort).toBe("bestselling");
  });

  it("drops invalid values", () => {
    const state = parseListingParams({ page: "-3", min: "abc", sort: "hack", category: ["men", "bad slug!"], view: "9" });
    expect(state.page).toBe(1);
    expect(state.min).toBeNull();
    expect(state.sort).toBe("relevance");
    expect(state.categories).toEqual(["men"]);
    expect(state.view).toBe(4);
  });

  it("goes back to page 1 when a filter changes, not when the page or view does", () => {
    const state = parseListingParams({ page: "3", size: "apparel.M" });
    expect(updateListing(state, { sizes: toggleValue(state.sizes, "apparel.L") }).page).toBe(1);
    expect(updateListing(state, { view: 2 }).page).toBe(3);
    expect(listingHref("/shop", updateListing(state, { page: 4 }))).toBe("/shop?size=apparel.M&page=4");
  });

  it("counts and clears filters but keeps the search text", () => {
    const state = parseListingParams({ q: "polo", size: ["apparel.M", "apparel.L"], min: "10", stock: "1", sort: "newest" });
    expect(activeFilterCount(state)).toBe(4);
    const cleared = clearFilters(state);
    expect(activeFilterCount(cleared)).toBe(0);
    expect(cleared.q).toBe("polo");
    expect(cleared.sort).toBe("newest");
  });

  it("keys result sets by everything except page and view", () => {
    const a = parseListingParams({ size: "apparel.M", page: "2", view: "2" });
    const b = parseListingParams({ size: "apparel.M" });
    expect(resultKey(a)).toBe(resultKey(b));
    expect(resultKey(a)).not.toBe(resultKey(parseListingParams({ size: "apparel.L" })));
  });

  it("builds a compact page window", () => {
    expect(pageWindow(1, 1)).toEqual([1]);
    expect(pageWindow(5, 12)).toEqual([1, null, 4, 5, 6, null, 12]);
    expect(pageWindow(2, 3)).toEqual([1, 2, 3]);
  });
});

describe("facets", () => {
  it("builds price presets from the real spread", () => {
    const presets = pricePresets([55, 60, 85, 90, 99, 120, 120, 130, 145, 150, 150, 180, 200, 220, 240, 290, 310, 350, 390, 399]);
    expect(presets.length).toBeGreaterThan(1);
    expect(presets[0].min).toBeNull();
    expect(presets.at(-1)!.max).toBeNull();
    // Every cut is a round number inside the spread.
    for (const p of presets) for (const edge of [p.min, p.max]) if (edge !== null) expect(edge % 25).toBe(0);
    expect(presets.reduce((n, p) => n + p.count, 0)).toBeGreaterThanOrEqual(20);
    expect(pricePresets([100, 100, 100, 100])).toEqual([]);
    expect(pricePresets([10, 20])).toEqual([]);
  });

  it("rolls subcategory counts into their parent and hides categories out of scope", () => {
    const tree = [
      { id: "m", slug: "men", name_en: "Men", name_ar: "رجال", children: [{ id: "p", slug: "polo", name_en: "Polo", name_ar: "بولو" }] },
      { id: "k", slug: "kids", name_en: "Kids", name_ar: "أطفال", children: [] },
      { id: "x", slug: "empty", name_en: "Empty", name_ar: "فارغ", children: [] },
    ];
    const nodes = buildCategoryFacetTree(tree, [
      { id: "m", count: 2 },
      { id: "p", count: 3 },
      { id: "k", count: 0 },
    ]);
    expect(nodes.map((n) => [n.slug, n.count])).toEqual([
      ["men", 5],
      ["kids", 0],
    ]);
    expect(nodes[0].children[0]).toMatchObject({ slug: "polo", count: 3 });
  });

  it("validates facet JSON", () => {
    const facets = parseFacets({
      total: "3",
      sizes: [{ group: "apparel", value: "M", count: 2 }, { bad: true }],
      colors: [{ name_en: "Black", name_ar: "", hex: "url(evil)", count: 1 }],
      price: { min: "55.00", max: 399, values: ["55.00", "x", 60] },
      in_stock: 2,
    });
    expect(facets.total).toBe(3);
    expect(facets.sizes).toHaveLength(1);
    expect(facets.colors[0]).toEqual({ name_en: "Black", name_ar: "Black", hex: null, count: 1 });
    expect(facets.price).toEqual({ min: 55, max: 399, values: [55, 60] });
    expect(parseFacets(null).total).toBe(0);
  });

  it("labels active filters as removable chips", () => {
    const state = parseListingParams({ color: "black", size: "shoes.42", min: "100", sale: "1", category: "men" });
    const chips = activeChips(
      state,
      {
        categories: [{ id: "m", slug: "men", name_en: "Men", name_ar: "رجال", count: 3, children: [] }],
        colors: [{ name_en: "Black", name_ar: "أسود", hex: "#000000", count: 4 }],
      },
      "ar",
    );
    expect(chips.map((c) => c.label)).toEqual(["رجال", "EU 42", "أسود", "100 ج.م فأكثر", "المنتجات المخفّضة"]);
    expect(chips[2].swatch).toBe("#000000");
    expect(chips.every((c) => c.next.page === 1)).toBe(true);
    expect(chips[1].next.sizes).toEqual([]);
    expect(priceRangeLabel(null, 150, "en")).toBe("Under EGP 150");
    expect(priceRangeLabel(100, 250, "en")).toBe("EGP 100 – EGP 250");
  });
});
