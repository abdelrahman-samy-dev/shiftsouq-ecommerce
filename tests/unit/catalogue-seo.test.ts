import { describe, expect, it } from "vitest";
import { priceSummary, productPrice, unitPrice } from "@/lib/seo/pricing";
import { breadcrumbJsonLd, productJsonLd, serializeJsonLd } from "@/lib/seo/json-ld";
import { toSafeLikeTerm } from "@/lib/search/normalize";

/* The display price must follow place_order():
   COALESCE(variant.price_override, sale_price if 0 < sale < base, base_price). */
describe("display pricing mirrors the checkout rule", () => {
  it("uses a valid sale price, otherwise the base price", () => {
    expect(productPrice({ base_price: 200, sale_price: 150 })).toBe(150);
    expect(productPrice({ base_price: 200, sale_price: null })).toBe(200);
    expect(productPrice({ base_price: 200, sale_price: 250 })).toBe(200); // not lower
    expect(productPrice({ base_price: 200, sale_price: 200 })).toBe(200); // equal
    expect(productPrice({ base_price: 200, sale_price: 0 })).toBe(200); // must be > 0
    expect(productPrice({ base_price: "200.00", sale_price: "150.50" })).toBe(150.5); // NUMERIC as text
  });

  it("lets the variant price override win, even above the base price", () => {
    const product = { base_price: 200, sale_price: 150 };
    expect(unitPrice(product, { price_override: 180 })).toBe(180);
    expect(unitPrice(product, { price_override: 260 })).toBe(260);
    expect(unitPrice(product, { price_override: null })).toBe(150);
    expect(unitPrice(product, undefined)).toBe(150);
  });

  it("summarises in-stock variants for 'From' prices and stock", () => {
    const product = { base_price: 300, sale_price: null };
    const summary = priceSummary(product, [
      { price_override: 250, stock: 0 }, // cheapest but sold out: ignored
      { price_override: null, stock: 3 },
      { price_override: 320, stock: 1 },
    ]);
    expect(summary.price).toBe(300);
    expect(summary.maxPrice).toBe(320);
    expect(summary.varies).toBe(true);
    expect(summary.compareAt).toBeNull();
    expect(summary.inStock).toBe(true);
    expect(summary.purchasable).toBe(true);
  });

  it("reports a discount against the base price and sold-out / unpurchasable products", () => {
    const sale = priceSummary({ base_price: 200, sale_price: 150 }, [{ stock: 2 }]);
    expect(sale).toMatchObject({ price: 150, compareAt: 200, discountPercent: 25, inStock: true });

    const soldOut = priceSummary({ base_price: 100 }, [{ stock: 0 }]);
    expect(soldOut).toMatchObject({ price: 100, inStock: false, purchasable: true });

    const noVariants = priceSummary({ base_price: 100 }, []);
    expect(noVariants).toMatchObject({ price: 100, inStock: false, purchasable: false });
  });
});

describe("JSON-LD", () => {
  it("escapes '<' so data can't close the script tag", () => {
    const out = serializeJsonLd({ name: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("<");
    expect(JSON.parse(out).name).toBe("</script><script>alert(1)</script>");
  });

  it("builds a Product with an EGP offer priced and stocked like checkout", () => {
    const data = productJsonLd({
      product: { slug: "urban-runner-x", base_price: 450, sale_price: 399, brand: "Shift", rating: 4.5, review_count: 12 },
      variants: [{ sku: "URX-42", size: "42", color_en: "Black", color_ar: "أسود", stock: 12, price_override: null }],
      locale: "en",
      name: "Urban Runner X",
      description: "Light running shoe.",
      images: ["https://images.example.com/a.jpg"],
      categoryName: "Sneakers",
    });
    expect(data["@type"]).toBe("Product");
    expect(data.sku).toBe("URX-42");
    expect(data.brand).toEqual({ "@type": "Brand", name: "Shift" });
    expect(data.offers).toMatchObject({
      "@type": "Offer",
      priceCurrency: "EGP",
      price: "399.00",
      availability: "https://schema.org/InStock",
    });
  });

  it("uses an AggregateOffer for several variants and marks sold-out products", () => {
    const data = productJsonLd({
      product: { slug: "tee", base_price: 100, sale_price: null, brand: null },
      variants: [
        { sku: "T-S", size: "S", color_en: null, color_ar: null, stock: 0, price_override: null },
        { sku: "T-XL", size: "XL", color_en: null, color_ar: null, stock: 0, price_override: 120 },
      ],
      locale: "ar",
      name: "تيشيرت",
      description: "",
      images: [],
      categoryName: null,
    });
    expect(data.offers).toMatchObject({
      "@type": "AggregateOffer",
      lowPrice: "100.00",
      highPrice: "120.00",
      offerCount: 2,
      availability: "https://schema.org/OutOfStock",
    });
  });

  it("numbers breadcrumb items from 1 with absolute URLs", () => {
    const data = breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Sneakers", path: "/category/sneakers" },
    ]);
    const items = data.itemListElement as { position: number; item: string }[];
    expect(items.map((i) => i.position)).toEqual([1, 2]);
    expect(items[1].item).toMatch(/^https?:\/\/.+\/category\/sneakers$/);
  });
});

describe("search terms", () => {
  it("strips PostgREST filter separators and LIKE wildcards", () => {
    expect(toSafeLikeTerm("polo,is_active.eq.false")).toBe("polo is active.eq.false");
    expect(toSafeLikeTerm("a%b*(c)")).toBe("a b c");
    expect(toSafeLikeTerm("  قميص  أبيض ")).toBe("قميص أبيض");
  });
});
