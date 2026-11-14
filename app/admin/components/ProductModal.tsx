"use client";

/* ══════════════════════════════════════════════════════════════
   Admin Product Modal — Slide-over
   ──────────────────────────────────────────────────────────────
   Create and edit products: names/descriptions (EN + AR), price,
   category (with quick create), images by link, and options
   (size / colour) with one row per variant for SKU, stock, price.

   Render it only while open and give it `key={product?.id ?? "new"}`:
   the form state is initialised from the product once per mount.
   Existing variants keep their database id, so saving updates them
   in place instead of re-creating them.
   ══════════════════════════════════════════════════════════════ */

import { useState, useEffect, useTransition } from "react";
import { X, Save, Plus, Loader2, Image as ImageIcon, Trash2, Info } from "lucide-react";
import { toast } from "sonner";
import { createProduct, updateProduct, createCategory } from "@/lib/actions/admin";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import { errorText, fill, getAdminText } from "@/lib/admin/i18n";
import { ALLOWED_IMAGE_HOSTS_LABEL, isAllowedImageUrl } from "@/lib/admin/products";
import type { AdminCategory, AdminProduct } from "@/lib/admin/types";

type ProductModalProps = {
  onClose: () => void;
  product: AdminProduct | null; // null when adding
  categories: AdminCategory[];
  dict: Dictionary;
  locale: string;
};

/** The two option dimensions the database stores per variant. */
type OptionKey = "size" | "color";
type Option = { key: OptionKey; values: string[] };

type VariantRow = {
  /** Database id for an existing variant, null for a new one. */
  dbId: string | null;
  size: string | null;
  color: string | null;
  sku: string;
  stock: string;
  price_override: string;
};

/** Base for SKUs of new variants (called from event handlers only). */
const skuStamp = () => Date.now().toString(36).toUpperCase();

const comboKey = (size: string | null, color: string | null) => `${size ?? ""}|${color ?? ""}`.toLowerCase();
const uniq = (values: (string | null)[]) => [...new Set(values.filter((v): v is string => !!v && v.trim() !== ""))];

function initialState(product: AdminProduct | null) {
  const variants = product?.variants ?? [];
  const hasOptions = variants.some((v) => v.size || v.color_en);
  const options: Option[] = [];
  if (hasOptions) {
    const sizes = uniq(variants.map((v) => v.size));
    const colors = uniq(variants.map((v) => v.color_en));
    if (sizes.length) options.push({ key: "size", values: sizes });
    if (colors.length) options.push({ key: "color", values: colors });
  }
  return {
    options,
    variants: hasOptions
      ? variants.map(
          (v): VariantRow => ({
            dbId: v.id,
            size: v.size,
            color: v.color_en,
            sku: v.sku,
            stock: String(v.stock ?? 0),
            price_override: v.price_override == null ? "" : String(v.price_override),
          }),
        )
      : [],
    globalStock: hasOptions ? "" : String(variants[0]?.stock ?? (product ? 0 : "")),
  };
}

export function ProductModal({ onClose, product, categories: initialCategories, dict, locale }: ProductModalProps) {
  const [isPending, startTransition] = useTransition();
  const isRTL = locale === "ar";
  const t = getAdminText(locale);
  const init = initialState(product);

  const [categories, setCategories] = useState(initialCategories);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCatEn, setNewCatEn] = useState("");
  const [newCatAr, setNewCatAr] = useState("");

  const [nameEn, setNameEn] = useState(product?.name_en ?? "");
  const [nameAr, setNameAr] = useState(product?.name_ar ?? "");
  const [descEn, setDescEn] = useState(product?.description_en ?? "");
  const [descAr, setDescAr] = useState(product?.description_ar ?? "");
  const [basePrice, setBasePrice] = useState(product ? String(product.base_price) : "");
  const [salePrice, setSalePrice] = useState(product?.sale_price ? String(product.sale_price) : "");
  const [categoryId, setCategoryId] = useState(product?.category_id ?? "");
  const [globalStock, setGlobalStock] = useState(init.globalStock);

  const [images, setImages] = useState<string[]>(product?.images.map((i) => i.url) ?? []);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [imageError, setImageError] = useState(false);

  const [options, setOptions] = useState<Option[]>(init.options);
  const [variants, setVariants] = useState<VariantRow[]>(init.variants);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  /* ── Variants from options (keeps rows that already exist) ── */
  const rebuildVariants = (nextOptions: Option[]) => {
    const sizes = nextOptions.find((o) => o.key === "size")?.values ?? [];
    const colors = nextOptions.find((o) => o.key === "color")?.values ?? [];
    if (!sizes.length && !colors.length) {
      setVariants([]);
      return;
    }
    const sizeList: (string | null)[] = sizes.length ? sizes : [null];
    const colorList: (string | null)[] = colors.length ? colors : [null];
    const byKey = new Map(variants.map((v) => [comboKey(v.size, v.color), v]));
    const stamp = skuStamp();
    const next: VariantRow[] = [];
    let i = 0;
    for (const size of sizeList) {
      for (const color of colorList) {
        const existing = byKey.get(comboKey(size, color));
        next.push(
          existing ?? {
            dbId: null,
            size,
            color,
            sku: `SKU-${stamp}-${++i}`,
            stock: "0",
            price_override: "",
          },
        );
      }
    }
    setVariants(next);
  };

  const availableKeys = (["size", "color"] as OptionKey[]).filter((k) => !options.some((o) => o.key === k));

  const handleAddOption = () => {
    if (!availableKeys.length) return;
    setOptions([...options, { key: availableKeys[0], values: [] }]);
  };

  const handleRemoveOption = (key: OptionKey) => {
    const next = options.filter((o) => o.key !== key);
    setOptions(next);
    rebuildVariants(next);
  };

  const handleOptionKeyChange = (oldKey: OptionKey, key: OptionKey) => {
    const next = options.map((o) => (o.key === oldKey ? { ...o, key } : o));
    setOptions(next);
    rebuildVariants(next);
  };

  const handleOptionValuesChange = (key: OptionKey, valStr: string) => {
    const values = uniq(valStr.split(/[,،]/).map((v) => v.trim()));
    const next = options.map((o) => (o.key === key ? { ...o, values } : o));
    setOptions(next);
    rebuildVariants(next);
  };

  const updateVariant = (index: number, patch: Partial<VariantRow>) => {
    setVariants((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  /* ── Form Handlers ──────────────────────────────────────── */

  const handleSaveCategory = () => {
    if (!newCatEn || !newCatAr) return;
    startTransition(async () => {
      const res = await createCategory(newCatEn, newCatAr);
      if (res.ok) {
        setCategories([...categories, res.category]);
        setCategoryId(res.category.id);
        setIsAddingCategory(false);
        setNewCatEn("");
        setNewCatAr("");
      } else {
        toast.error(errorText(t.products.error, res.error));
      }
    });
  };

  const handleAddImage = () => {
    const url = newImageUrl.trim();
    if (!isAllowedImageUrl(url)) {
      setImageError(true);
      return;
    }
    if (!images.includes(url)) setImages([...images, url]);
    setNewImageUrl("");
    setImageError(false);
  };

  const handleRemoveImage = (index: number) => setImages(images.filter((_, i) => i !== index));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.append("name_en", nameEn);
      formData.append("name_ar", nameAr);
      formData.append("description_en", descEn);
      formData.append("description_ar", descAr);
      formData.append("base_price", basePrice);
      formData.append("sale_price", salePrice);
      formData.append("category_id", categoryId);
      formData.append("images", JSON.stringify(images));
      formData.append(
        "variants",
        JSON.stringify(
          variants.map((v) => ({
            id: v.dbId,
            sku: v.sku,
            stock: v.stock === "" ? 0 : v.stock,
            price_override: v.price_override,
            size: v.size,
            color_en: v.color,
          })),
        ),
      );
      formData.append("stock", globalStock || "0");

      const res = product ? await updateProduct(product.id, formData) : await createProduct(formData);
      if (res.ok) {
        toast.success(t.products.savedToast);
        onClose();
      } else {
        setError(errorText(t.products.error, res.error));
      }
    });
  };

  const inputBaseClasses =
    "w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#0a0a0a] px-4 py-2.5 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all";
  const labelClasses = "block text-[13px] font-bold text-zinc-700 dark:text-zinc-300 mb-1.5";
  const arabicFontClass = "font-arabic";
  const currency = dict.common?.currency || "EGP";
  const optionLabel = (k: OptionKey) => (k === "size" ? t.products.optionSize : t.products.optionColor);

  return (
    <div className="fixed inset-0 z-[120] flex justify-end">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 dark:bg-black/80 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Slide-over panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-modal-title"
        className={`relative w-full max-w-4xl h-full bg-white dark:bg-[#0a0a0a] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 ${
          isRTL ? "font-arabic border-r border-zinc-200 dark:border-zinc-800/80" : "font-sans border-l border-zinc-200 dark:border-zinc-800/80"
        }`}
        dir={isRTL ? "rtl" : "ltr"}
      >
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800/80 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md shrink-0">
          <h2 id="product-modal-title" className="text-xl font-bold text-zinc-900 dark:text-white">
            {product ? dict.admin?.products?.editProduct || "Edit Product" : dict.admin?.products?.addProduct || "Add New Product"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={dict.common?.close || "Close"}
            className="p-2 bg-zinc-100 dark:bg-zinc-900 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          <form id="productForm" onSubmit={handleSubmit} className="space-y-10 pb-10">
            {/* Grid 1: Basic Info (English & Arabic) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4 p-5 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/30 border border-zinc-100 dark:border-zinc-800/50" dir="ltr">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded-full">EN</span>
                  <h3 className="font-semibold text-zinc-900 dark:text-white">English Details</h3>
                </div>
                <div>
                  <label className={labelClasses} htmlFor="p-name-en">Product Name *</label>
                  <input id="p-name-en" required type="text" value={nameEn} onChange={(e) => setNameEn(e.target.value)} className={inputBaseClasses} placeholder="e.g. Wireless Headphones" maxLength={200} />
                </div>
                <div>
                  <label className={labelClasses} htmlFor="p-desc-en">Description</label>
                  <textarea id="p-desc-en" rows={4} value={descEn} onChange={(e) => setDescEn(e.target.value)} className={`${inputBaseClasses} resize-none`} placeholder="Detailed product description..." maxLength={5000} />
                </div>
              </div>

              <div className="space-y-4 p-5 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/30 border border-zinc-100 dark:border-zinc-800/50" dir="rtl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded-full">AR</span>
                  <h3 className="font-semibold text-zinc-900 dark:text-white">التفاصيل بالعربية</h3>
                </div>
                <div>
                  <label className={labelClasses} htmlFor="p-name-ar">اسم المنتج *</label>
                  <input id="p-name-ar" required type="text" value={nameAr} onChange={(e) => setNameAr(e.target.value)} className={`${inputBaseClasses} ${arabicFontClass}`} placeholder="مثال: سماعات لاسلكية" maxLength={200} />
                </div>
                <div>
                  <label className={labelClasses} htmlFor="p-desc-ar">الوصف</label>
                  <textarea id="p-desc-ar" rows={4} value={descAr} onChange={(e) => setDescAr(e.target.value)} className={`${inputBaseClasses} resize-none ${arabicFontClass}`} placeholder="وصف تفصيلي للمنتج..." maxLength={5000} />
                </div>
              </div>
            </div>

            {/* Grid 2: Pricing & Organization */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-bold text-lg text-zinc-900 dark:text-white border-b border-zinc-200 dark:border-zinc-800 pb-2">
                  {dict.admin?.products?.price || "Price"}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClasses} htmlFor="p-base">
                      {dict.admin?.products?.basePrice || "Base Price"} ({currency}) *
                    </label>
                    <input id="p-base" required type="number" min={0.01} step="0.01" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} className={inputBaseClasses} placeholder="0.00" dir="ltr" />
                  </div>
                  <div>
                    <label className={labelClasses} htmlFor="p-sale">
                      {dict.admin?.products?.salePrice || "Sale Price"} ({currency})
                    </label>
                    <input id="p-sale" type="number" min={0} step="0.01" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} className={inputBaseClasses} placeholder="0.00" dir="ltr" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-bold text-lg text-zinc-900 dark:text-white border-b border-zinc-200 dark:border-zinc-800 pb-2">
                  {dict.admin?.products?.category || "Category"}
                </h3>
                <div>
                  {!isAddingCategory ? (
                    <select
                      required
                      aria-label={dict.admin?.products?.category || "Category"}
                      value={categoryId}
                      onChange={(e) => {
                        if (e.target.value === "ADD_NEW") setIsAddingCategory(true);
                        else setCategoryId(e.target.value);
                      }}
                      className={inputBaseClasses}
                    >
                      <option value="">{dict.admin?.products?.selectCategory || "Select a category"}</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {isRTL ? cat.name_ar : cat.name_en}
                        </option>
                      ))}
                      <option value="ADD_NEW">+ {dict.admin?.products?.createCategory || "Create New Category"}</option>
                    </select>
                  ) : (
                    <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-900/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-blue-700 dark:text-blue-400">{dict.admin?.products?.createCategory || "New Category"}</span>
                        <button type="button" onClick={() => setIsAddingCategory(false)} className="text-zinc-500 hover:text-zinc-900" aria-label={dict.common?.cancel || "Cancel"}>
                          <X size={14} />
                        </button>
                      </div>
                      <input type="text" placeholder={dict.admin?.products?.categoryNameEn || "Category Name (EN)"} value={newCatEn} onChange={(e) => setNewCatEn(e.target.value)} className={`${inputBaseClasses} py-2 text-xs`} dir="ltr" />
                      <input type="text" placeholder={dict.admin?.products?.categoryNameAr || "اسم الفئة (AR)"} value={newCatAr} onChange={(e) => setNewCatAr(e.target.value)} className={`${inputBaseClasses} py-2 text-xs ${arabicFontClass}`} dir="rtl" />
                      <button
                        type="button"
                        onClick={handleSaveCategory}
                        disabled={isPending || !newCatEn || !newCatAr}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                      >
                        {isPending ? "..." : dict.admin?.products?.create || "Save Category"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Images (by link) */}
            <div className="space-y-4">
              <h3 className="font-bold text-lg text-zinc-900 dark:text-white border-b border-zinc-200 dark:border-zinc-800 pb-2">
                {dict.admin?.products?.images || "Images"}
              </h3>

              {images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {images.map((img, idx) => (
                    <div key={img} className="relative group aspect-square rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of a link the admin just typed */}
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        aria-label={dict.admin?.products?.remove || "Remove"}
                        className="absolute top-2 end-2 p-2 bg-red-500/90 hover:bg-red-500 rounded-full text-white shadow-lg"
                      >
                        <Trash2 size={14} />
                      </button>
                      {idx === 0 && (
                        <span className="absolute top-2 start-2 bg-zinc-900 dark:bg-white text-white dark:text-black text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm">
                          {dict.admin?.products?.primary || "Primary"}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 max-w-xl">
                <div className="relative flex-1">
                  <ImageIcon size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="url"
                    value={newImageUrl}
                    onChange={(e) => {
                      setNewImageUrl(e.target.value);
                      setImageError(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddImage();
                      }
                    }}
                    placeholder={dict.admin?.products?.enterImageUrl || "Enter image URL"}
                    className={`${inputBaseClasses} ps-9`}
                    dir="ltr"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddImage}
                  disabled={!newImageUrl}
                  className="px-4 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl font-semibold text-sm disabled:opacity-50 shrink-0"
                >
                  {dict.admin?.products?.addUrl || "Add URL"}
                </button>
              </div>
              <p className={`text-xs ${imageError ? "text-red-600 dark:text-red-400" : "text-zinc-500"}`}>
                {imageError ? t.products.error.image_url + " " : ""}
                {fill(t.products.imageHelp, { hosts: ALLOWED_IMAGE_HOSTS_LABEL })}
              </p>
            </div>

            {/* Options & Variants */}
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
                <div>
                  <h3 className="font-bold text-lg text-zinc-900 dark:text-white">{dict.admin?.products?.options || "Options & Variants"}</h3>
                  <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1.5">
                    <Info size={14} />
                    {t.products.optionHelp}
                  </p>
                </div>
                {availableKeys.length > 0 && (
                  <button
                    type="button"
                    onClick={handleAddOption}
                    className="px-3 py-1.5 text-sm font-semibold bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors flex items-center gap-1.5"
                  >
                    <Plus size={16} />
                    {dict.admin?.products?.addOption || "Add Option"}
                  </button>
                )}
              </div>

              {options.length > 0 && (
                <div className="space-y-4 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#0a0a0a]">
                  {options.map((opt) => (
                    <div key={opt.key} className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                      <div className="w-full sm:w-1/3">
                        <label className={labelClasses}>{dict.admin?.products?.optionName || "Option Name"}</label>
                        <select
                          value={opt.key}
                          onChange={(e) => handleOptionKeyChange(opt.key, e.target.value as OptionKey)}
                          className={inputBaseClasses}
                        >
                          {(["size", "color"] as OptionKey[])
                            .filter((k) => k === opt.key || availableKeys.includes(k))
                            .map((k) => (
                              <option key={k} value={k}>
                                {optionLabel(k)}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div className="w-full sm:w-2/3 flex items-end gap-2">
                        <div className="flex-1">
                          <label className={labelClasses}>{dict.admin?.products?.optionValues || "Values"}</label>
                          <input
                            type="text"
                            defaultValue={opt.values.join(", ")}
                            onBlur={(e) => handleOptionValuesChange(opt.key, e.target.value)}
                            placeholder={dict.admin?.products?.optionValuesPlaceholder || "Red, Blue, Green"}
                            className={inputBaseClasses}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(opt.key)}
                          className="p-2.5 mb-[1px] text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors shrink-0"
                          title={dict.admin?.products?.remove || "Remove"}
                          aria-label={dict.admin?.products?.remove || "Remove"}
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {variants.length > 0 ? (
                <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-x-auto">
                  <table className="w-full text-sm text-start whitespace-nowrap">
                    <thead className="bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 font-bold text-[11px] uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3 text-start">{dict.admin?.products?.variants || "Variant"}</th>
                        <th className="px-4 py-3 text-start">{dict.admin?.products?.sku || "SKU"}</th>
                        <th className="px-4 py-3 text-start w-24">{dict.admin?.products?.stock || "Stock"}</th>
                        <th className="px-4 py-3 text-start w-32">
                          {dict.admin?.products?.priceOverride || "Price"} ({currency})
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-[#0a0a0a]">
                      {variants.map((v, i) => (
                        <tr key={`${v.dbId ?? "new"}-${comboKey(v.size, v.color)}`} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/30">
                          <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-white">{[v.size, v.color].filter(Boolean).join(" • ")}</td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={v.sku}
                              onChange={(e) => updateVariant(i, { sku: e.target.value })}
                              aria-label={dict.admin?.products?.sku || "SKU"}
                              className="w-full min-w-32 bg-transparent border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1 focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none"
                              dir="ltr"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min={0}
                              step={1}
                              value={v.stock}
                              onChange={(e) => updateVariant(i, { stock: e.target.value })}
                              aria-label={dict.admin?.products?.stock || "Stock"}
                              className="w-full min-w-16 bg-transparent border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1 focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none"
                              dir="ltr"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={v.price_override}
                              placeholder={basePrice || "—"}
                              onChange={(e) => updateVariant(i, { price_override: e.target.value })}
                              aria-label={dict.admin?.products?.priceOverride || "Price"}
                              className="w-full min-w-20 bg-transparent border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1 focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none"
                              dir="ltr"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="max-w-xs">
                  <label className={labelClasses} htmlFor="p-stock">
                    {dict.admin?.products?.stockQuantity || "Stock Quantity"} *
                  </label>
                  <input id="p-stock" required type="number" min={0} step={1} value={globalStock} onChange={(e) => setGlobalStock(e.target.value)} className={inputBaseClasses} placeholder="0" dir="ltr" />
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Sticky Footer */}
        <div className="sticky bottom-0 z-10 px-6 py-4 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-200 dark:border-zinc-800 backdrop-blur-md shrink-0 space-y-3">
          {error && (
            <div role="alert" className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}
          <div className="flex items-center justify-end gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
              {dict.common?.cancel || "Cancel"}
            </button>
            <button
              form="productForm"
              type="submit"
              disabled={isPending}
              className="px-5 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl text-sm font-bold shadow-lg shadow-zinc-900/20 dark:shadow-white/10 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isPending ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {product ? dict.admin?.products?.editProduct || "Update Product" : dict.admin?.products?.saveProduct || "Save Product"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
