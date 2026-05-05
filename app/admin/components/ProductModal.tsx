"use client";

/* ══════════════════════════════════════════════════════════════
   Admin Product Modal — Premium Slide-over
   ──────────────────────────────────────────────────────────────
   Handles both Create and Edit flows for products.
   Includes:
   - 2-column responsive grid (max-w-4xl)
   - Dynamic Category Creation
   - Multi-Image Gallery with Preview
   - Dynamic Options (Variants) Cartesian product generator
   - Full English/Arabic Dictionary Support
   ══════════════════════════════════════════════════════════════ */

import { useState, useEffect, useTransition, useRef } from "react";
import { X, Save, Plus, Loader2, Image as ImageIcon, Trash2, Info, GripVertical } from "lucide-react";
import { createProduct, updateProduct, createCategory } from "@/lib/actions/admin";

type ProductModalProps = {
  isOpen: boolean;
  onClose: () => void;
  product?: any | null; // null if adding
  categories: any[];
  dict: any;
  locale: string;
};

// Types for Dynamic Options
type Option = {
  id: string;
  name: string;
  values: string[];
};

type VariantRow = {
  id: string;
  combination: Record<string, string>;
  sku: string;
  stock: number;
  price_override: string;
};

export function ProductModal({
  isOpen,
  onClose,
  product,
  categories: initialCategories,
  dict,
  locale
}: ProductModalProps) {
  const [isPending, startTransition] = useTransition();
  const isRTL = locale === "ar";
  
  const [categories, setCategories] = useState(initialCategories);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCatEn, setNewCatEn] = useState("");
  const [newCatAr, setNewCatAr] = useState("");
  
  // Basic Form State
  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [descEn, setDescEn] = useState("");
  const [descAr, setDescAr] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [globalStock, setGlobalStock] = useState(""); // Only used if no variants

  // Images State
  const [images, setImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState("");

  // Options & Variants State
  const [options, setOptions] = useState<Option[]>([]);
  const [variants, setVariants] = useState<VariantRow[]>([]);

  // Refs
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  useEffect(() => {
    if (isOpen) {
      if (product) {
        setNameEn(product.name_en || "");
        setNameAr(product.name_ar || "");
        setDescEn(product.description_en || "");
        setDescAr(product.description_ar || "");
        setBasePrice(product.base_price?.toString() || "");
        setSalePrice(product.sale_price?.toString() || "");
        setCategoryId(product.category_id || "");
        
        // Load Images
        if (product.product_images && product.product_images.length > 0) {
          const sorted = [...product.product_images].sort((a, b) => a.sort_order - b.sort_order);
          setImages(sorted.map((img: any) => img.url));
        } else {
          setImages([]);
        }

        // Load Variants / Options
        // If the product has options stored in JSON or inferred from variants
        // For simplicity, we try to reconstruct options from variants if possible,
        // or just set global stock if no variants.
        if (product.variants && product.variants.length > 0) {
           // Basic reconstruction logic: look at size, color_en, attributes
           // This is simplified. In a robust system, the product would have an `options` JSON column.
           // For now, if there are variants, we just set them. We won't reconstruct the full Option[] 
           // tree perfectly if it's complex, but we'll try basic size/color.
           let reconstructedOptions: Record<string, Set<string>> = {};
           
           product.variants.forEach((v: any) => {
              if (v.size) {
                 if (!reconstructedOptions["Size"]) reconstructedOptions["Size"] = new Set();
                 reconstructedOptions["Size"].add(v.size);
              }
              if (v.color_en) {
                 if (!reconstructedOptions["Color"]) reconstructedOptions["Color"] = new Set();
                 reconstructedOptions["Color"].add(v.color_en);
              }
              if (v.attributes) {
                 Object.keys(v.attributes).forEach(k => {
                    if (!reconstructedOptions[k]) reconstructedOptions[k] = new Set();
                    reconstructedOptions[k].add(v.attributes[k]);
                 });
              }
           });
           
           const newOpts: Option[] = Object.keys(reconstructedOptions).map((k, i) => ({
             id: `opt_${i}`,
             name: k,
             values: Array.from(reconstructedOptions[k])
           }));
           setOptions(newOpts);

           setVariants(product.variants.map((v: any) => {
             const combo: Record<string, string> = {};
             if (v.size) combo["Size"] = v.size;
             if (v.color_en) combo["Color"] = v.color_en;
             if (v.attributes) {
               Object.keys(v.attributes).forEach(k => combo[k] = v.attributes[k]);
             }
             return {
               id: v.id,
               combination: combo,
               sku: v.sku || "",
               stock: v.stock || 0,
               price_override: v.price_override?.toString() || ""
             };
           }));
           setGlobalStock("");
        } else {
           setGlobalStock(product.stock?.toString() || "0");
           setOptions([]);
           setVariants([]);
        }

      } else {
        setNameEn("");
        setNameAr("");
        setDescEn("");
        setDescAr("");
        setBasePrice("");
        setSalePrice("");
        setCategoryId("");
        setGlobalStock("");
        setImages([]);
        setOptions([]);
        setVariants([]);
      }
      setIsAddingCategory(false);
      setNewCatEn("");
      setNewCatAr("");
      setNewImageUrl("");
    }
  }, [isOpen, product]);

  // Click outside to close (Optional, since there's a close button)
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  /* ── Cartesian Product Logic ───────────────────────────── */
  const generateVariants = (currentOptions: Option[]) => {
    // Filter out options with no values
    const validOptions = currentOptions.filter(o => o.name.trim() !== "" && o.values.length > 0);
    
    if (validOptions.length === 0) {
      setVariants([]);
      return;
    }

    const cartesianProduct = (arr: any[][]): any[][] => {
      return arr.reduce((a, b) =>
        a.map(x => b.map(y => x.concat([y]))).reduce((c, d) => c.concat(d), [])
      , [[]]);
    };

    const valuesArrays = validOptions.map(o => o.values.map(val => ({ key: o.name, value: val })));
    const combinations = cartesianProduct(valuesArrays);

    const newVariants: VariantRow[] = combinations.map((combo, idx) => {
      const comboObj: Record<string, string> = {};
      combo.forEach((c: {key: string, value: string}) => {
        comboObj[c.key] = c.value;
      });
      
      // Try to preserve existing variant data if combination matches
      const existing = variants.find(v => JSON.stringify(v.combination) === JSON.stringify(comboObj));
      
      return {
        id: existing?.id || `var_${Date.now()}_${idx}`,
        combination: comboObj,
        sku: existing?.sku || `SKU-${Date.now()}-${idx}`,
        stock: existing?.stock || 0,
        price_override: existing?.price_override || ""
      };
    });

    setVariants(newVariants);
  };

  const handleAddOption = () => {
    setOptions([...options, { id: `opt_${Date.now()}`, name: "", values: [] }]);
  };

  const handleRemoveOption = (id: string) => {
    const newOptions = options.filter(o => o.id !== id);
    setOptions(newOptions);
    generateVariants(newOptions);
  };

  const handleOptionNameChange = (id: string, name: string) => {
    const newOptions = options.map(o => o.id === id ? { ...o, name } : o);
    setOptions(newOptions);
    generateVariants(newOptions);
  };

  const handleOptionValuesChange = (id: string, valStr: string) => {
    const values = valStr.split(",").map(v => v.trim()).filter(v => v !== "");
    const newOptions = options.map(o => o.id === id ? { ...o, values } : o);
    setOptions(newOptions);
    generateVariants(newOptions);
  };

  /* ── Form Handlers ──────────────────────────────────────── */

  const handleSaveCategory = async () => {
    if (!newCatEn || !newCatAr) return;
    startTransition(async () => {
      const res = await createCategory(newCatEn, newCatAr);
      if (res.success && res.category) {
        setCategories([...categories, res.category]);
        setCategoryId(res.category.id);
        setIsAddingCategory(false);
        setNewCatEn("");
        setNewCatAr("");
      } else {
        alert(res.error || "Error adding category");
      }
    });
  };

  const handleAddImage = () => {
    if (newImageUrl && newImageUrl.startsWith("http")) {
      setImages([...images, newImageUrl]);
      setNewImageUrl("");
    }
  };

  const handleRemoveImage = (index: number) => {
    const newImgs = [...images];
    newImgs.splice(index, 1);
    setImages(newImgs);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
      
      // Process variants for JSONB attributes
      if (options.length > 0 && variants.length > 0) {
        const processedVariants = variants.map(v => {
           let size = null;
           let color_en = null;
           let attributes: Record<string, string> = {};
           
           Object.keys(v.combination).forEach(k => {
             const lowerK = k.toLowerCase();
             if (lowerK === "size" || lowerK === "مقاس") {
               size = v.combination[k];
             } else if (lowerK === "color" || lowerK === "لون") {
               color_en = v.combination[k];
             } else {
               attributes[k] = v.combination[k];
             }
           });

           return {
             sku: v.sku,
             stock: Number(v.stock),
             price_override: v.price_override ? Number(v.price_override) : null,
             size,
             color_en,
             attributes: Object.keys(attributes).length > 0 ? attributes : null
           };
        });
        formData.append("variants", JSON.stringify(processedVariants));
      } else {
        formData.append("stock", globalStock);
      }

      if (product) {
        const res = await updateProduct(product.id, formData);
        if (res.success) onClose();
        else alert(res.error);
      } else {
        const res = await createProduct(formData);
        if (res.success) onClose();
        else alert(res.error);
      }
    });
  };

  // Classes for standard inputs
  const inputBaseClasses = "w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#0a0a0a] px-4 py-2.5 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all";
  const labelClasses = "block text-[13px] font-bold text-zinc-700 dark:text-zinc-300 mb-1.5";
  const arabicFontClass = "font-arabic"; // Assuming Alexandria is mapped here

  return (
    <div className="fixed inset-0 z-[120] flex justify-end">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 dark:bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Slide-over panel */}
      <div 
        ref={modalRef}
        className={`relative w-full max-w-4xl h-full bg-white dark:bg-[#0a0a0a] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 ${isRTL ? "font-arabic border-r border-zinc-200 dark:border-zinc-800/80" : "font-sans border-l border-zinc-200 dark:border-zinc-800/80"}`}
        dir={isRTL ? "rtl" : "ltr"}
      >
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800/80 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md shrink-0">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
              {product ? (dict.admin?.products?.editProduct || "Edit Product") : (dict.admin?.products?.addProduct || "Add New Product")}
            </h2>
            <p className="text-xs font-medium text-zinc-500 mt-0.5">
              {product ? "Update product details and variants" : "Fill in the details to list a new item"}
            </p>
          </div>
          <button 
            onClick={onClose}
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
              <div className="space-y-4 p-5 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/30 border border-zinc-100 dark:border-zinc-800/50">
                 <div className="flex items-center gap-2 mb-2">
                   <span className="text-[10px] font-bold uppercase tracking-wider bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded-full">EN</span>
                   <h3 className="font-semibold text-zinc-900 dark:text-white">English Details</h3>
                 </div>
                 <div>
                  <label className={labelClasses}>{dict.admin?.products?.productName || "Product Name"} *</label>
                  <input
                    required
                    type="text"
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    className={inputBaseClasses}
                    placeholder="e.g. Wireless Headphones"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className={labelClasses}>{dict.admin?.products?.description || "Description"}</label>
                  <textarea
                    rows={4}
                    value={descEn}
                    onChange={(e) => setDescEn(e.target.value)}
                    className={`${inputBaseClasses} resize-none`}
                    placeholder="Detailed product description..."
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="space-y-4 p-5 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/30 border border-zinc-100 dark:border-zinc-800/50">
                 <div className="flex items-center gap-2 mb-2">
                   <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded-full">AR</span>
                   <h3 className="font-semibold text-zinc-900 dark:text-white">التفاصيل بالعربية</h3>
                 </div>
                 <div>
                  <label className={labelClasses}>اسم المنتج *</label>
                  <input
                    required
                    type="text"
                    value={nameAr}
                    onChange={(e) => setNameAr(e.target.value)}
                    className={`${inputBaseClasses} ${arabicFontClass}`}
                    placeholder="مثال: سماعات لاسلكية"
                    dir="rtl"
                  />
                </div>
                <div>
                  <label className={labelClasses}>الوصف</label>
                  <textarea
                    rows={4}
                    value={descAr}
                    onChange={(e) => setDescAr(e.target.value)}
                    className={`${inputBaseClasses} resize-none ${arabicFontClass}`}
                    placeholder="وصف تفصيلي للمنتج..."
                    dir="rtl"
                  />
                </div>
              </div>
            </div>

            {/* Grid 2: Pricing & Organization */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Pricing */}
              <div className="space-y-4">
                <h3 className="font-bold text-lg text-zinc-900 dark:text-white border-b border-zinc-200 dark:border-zinc-800 pb-2">Pricing</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClasses}>{dict.admin?.products?.basePrice || "Base Price (EGP)"} *</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-semibold text-sm">$</span>
                      <input
                        required
                        type="number"
                        step="0.01"
                        value={basePrice}
                        onChange={(e) => setBasePrice(e.target.value)}
                        className={`${inputBaseClasses} pl-8`}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelClasses}>{dict.admin?.products?.salePrice || "Sale Price (Optional)"}</label>
                     <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-semibold text-sm">$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={salePrice}
                        onChange={(e) => setSalePrice(e.target.value)}
                        className={`${inputBaseClasses} pl-8`}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Organization */}
              <div className="space-y-4">
                 <h3 className="font-bold text-lg text-zinc-900 dark:text-white border-b border-zinc-200 dark:border-zinc-800 pb-2">Organization</h3>
                 <div>
                    <label className={labelClasses}>{dict.admin?.products?.category || "Category"} *</label>
                    {!isAddingCategory ? (
                      <select
                        required
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
                        <option value="ADD_NEW" className="font-bold text-blue-600">
                          + {dict.admin?.products?.createCategory || "Create New Category"}
                        </option>
                      </select>
                    ) : (
                      <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-900/10 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-blue-700 dark:text-blue-400">New Category</span>
                          <button type="button" onClick={() => setIsAddingCategory(false)} className="text-zinc-500 hover:text-zinc-900">
                            <X size={14} />
                          </button>
                        </div>
                        <input
                          type="text"
                          placeholder="Category Name (EN)"
                          value={newCatEn}
                          onChange={(e) => setNewCatEn(e.target.value)}
                          className={`${inputBaseClasses} py-2 text-xs`}
                        />
                        <input
                          type="text"
                          placeholder="اسم الفئة (AR)"
                          value={newCatAr}
                          onChange={(e) => setNewCatAr(e.target.value)}
                          className={`${inputBaseClasses} py-2 text-xs ${arabicFontClass}`}
                          dir="rtl"
                        />
                        <button
                          type="button"
                          onClick={handleSaveCategory}
                          disabled={isPending || !newCatEn || !newCatAr}
                          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                        >
                          {isPending ? "..." : dict.admin?.products?.saveCategory || "Save Category"}
                        </button>
                      </div>
                    )}
                 </div>
              </div>
            </div>

            {/* Multi-Image Gallery */}
            <div className="space-y-4">
               <h3 className="font-bold text-lg text-zinc-900 dark:text-white border-b border-zinc-200 dark:border-zinc-800 pb-2">
                 {dict.admin?.products?.images || "Images"}
               </h3>
               
               <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                 {images.map((img, idx) => (
                   <div key={idx} className="relative group aspect-square rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
                     <img src={img} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                     <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-sm">
                       <button type="button" className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-md">
                         <GripVertical size={16} />
                       </button>
                       <button type="button" onClick={() => handleRemoveImage(idx)} className="p-2 bg-red-500/80 hover:bg-red-500 rounded-full text-white backdrop-blur-md shadow-lg">
                         <Trash2 size={16} />
                       </button>
                     </div>
                     {idx === 0 && (
                       <span className="absolute top-2 left-2 bg-zinc-900 dark:bg-white text-white dark:text-black text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm">
                         {dict.admin?.products?.primary || "Primary"}
                       </span>
                     )}
                   </div>
                 ))}
                 
                 {/* Upload Zone */}
                 <div className="aspect-square rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900/50 dark:hover:bg-zinc-900 flex flex-col items-center justify-center gap-3 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer p-4 text-center">
                    <ImageIcon size={32} className="opacity-50" />
                    <span className="text-xs font-semibold">{dict.admin?.products?.dragDropImages || "Drag & Drop images"}</span>
                 </div>
               </div>

               {/* URL Add logic */}
               <div className="flex gap-2 max-w-xl">
                 <input 
                   type="text" 
                   value={newImageUrl} 
                   onChange={e => setNewImageUrl(e.target.value)} 
                   placeholder={dict.admin?.products?.enterImageUrl || "Enter image URL"}
                   className={inputBaseClasses}
                 />
                 <button 
                   type="button" 
                   onClick={handleAddImage}
                   disabled={!newImageUrl}
                   className="px-4 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl font-semibold text-sm disabled:opacity-50 shrink-0"
                 >
                   {dict.admin?.products?.addUrl || "Add URL"}
                 </button>
               </div>
            </div>

            {/* Dynamic Options & Variants */}
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
                 <div>
                   <h3 className="font-bold text-lg text-zinc-900 dark:text-white">
                     {dict.admin?.products?.options || "Options & Variants"}
                   </h3>
                   <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1.5">
                     <Info size={14} />
                     Does this product have sizes, colors, or other options?
                   </p>
                 </div>
                 {options.length < 3 && (
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

              {/* Options List */}
              {options.length > 0 && (
                <div className="space-y-4 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#0a0a0a]">
                  {options.map((opt, i) => (
                    <div key={opt.id} className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                      <div className="w-full sm:w-1/3">
                        <label className={labelClasses}>{dict.admin?.products?.optionName || "Option Name"}</label>
                        <input
                          type="text"
                          value={opt.name}
                          onChange={(e) => handleOptionNameChange(opt.id, e.target.value)}
                          placeholder={dict.admin?.products?.optionNamePlaceholder || "e.g., Color"}
                          className={inputBaseClasses}
                        />
                      </div>
                      <div className="w-full sm:w-2/3 flex items-end gap-2">
                        <div className="flex-1">
                          <label className={labelClasses}>{dict.admin?.products?.optionValues || "Values"}</label>
                          <input
                            type="text"
                            value={opt.values.join(", ")}
                            onChange={(e) => handleOptionValuesChange(opt.id, e.target.value)}
                            placeholder={dict.admin?.products?.optionValuesPlaceholder || "Red, Blue, Green"}
                            className={inputBaseClasses}
                          />
                        </div>
                        <button 
                          type="button" 
                          onClick={() => handleRemoveOption(opt.id)}
                          className="p-2.5 mb-[1px] text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors shrink-0"
                          title={dict.admin?.products?.remove || "Remove"}
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Variants Table */}
              {variants.length > 0 ? (
                <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
                  <table className="w-full text-sm text-left whitespace-nowrap">
                    <thead className="bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 font-bold text-[11px] uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">{dict.admin?.products?.variants || "Variant"}</th>
                        <th className="px-4 py-3">{dict.admin?.products?.sku || "SKU"}</th>
                        <th className="px-4 py-3 w-24">{dict.admin?.products?.stock || "Stock"}</th>
                        <th className="px-4 py-3 w-32">{dict.admin?.products?.priceOverride || "Price"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-[#0a0a0a]">
                      {variants.map((v, i) => (
                        <tr key={v.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/30">
                          <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-white">
                            {Object.values(v.combination).join(" • ")}
                          </td>
                          <td className="px-4 py-3">
                            <input 
                              type="text" 
                              value={v.sku} 
                              onChange={(e) => {
                                const newV = [...variants];
                                newV[i].sku = e.target.value;
                                setVariants(newV);
                              }}
                              className="w-full bg-transparent border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1 focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none"
                            />
                          </td>
                          <td className="px-4 py-3">
                             <input 
                              type="number" 
                              value={v.stock} 
                              onChange={(e) => {
                                const newV = [...variants];
                                newV[i].stock = parseInt(e.target.value) || 0;
                                setVariants(newV);
                              }}
                              className="w-full bg-transparent border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1 focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input 
                              type="number"
                              step="0.01" 
                              value={v.price_override} 
                              placeholder="Base"
                              onChange={(e) => {
                                const newV = [...variants];
                                newV[i].price_override = e.target.value;
                                setVariants(newV);
                              }}
                              className="w-full bg-transparent border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1 focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white outline-none"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Global Stock (If no variants) */
                <div className="max-w-xs">
                  <label className={labelClasses}>{dict.admin?.products?.stockQuantity || "Stock Quantity"} *</label>
                  <input
                    required
                    type="number"
                    value={globalStock}
                    onChange={(e) => setGlobalStock(e.target.value)}
                    className={inputBaseClasses}
                    placeholder="0"
                  />
                </div>
              )}
            </div>

          </form>
        </div>

        {/* Sticky Footer */}
        <div className="sticky bottom-0 z-10 flex items-center justify-end gap-3 px-6 py-4 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-200 dark:border-zinc-800 backdrop-blur-md shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            {dict.common?.cancel || "Cancel"}
          </button>
          <button
            form="productForm"
            type="submit"
            disabled={isPending}
            className="px-5 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl text-sm font-bold shadow-lg shadow-zinc-900/20 dark:shadow-white/10 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isPending ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {product ? (dict.admin?.products?.updateProduct || "Update Product") : (dict.admin?.products?.saveProduct || "Save Product")}
          </button>
        </div>
      </div>
    </div>
  );
}
