"use client";

import { useTransition, useState } from "react";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { deleteProduct } from "@/lib/actions/admin";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import { errorText, getAdminText } from "@/lib/admin/i18n";

export function DeleteProductDialog({
  isOpen,
  onClose,
  product,
  dict,
  locale,
}: {
  isOpen: boolean;
  onClose: () => void;
  product: { id: string } | null;
  dict: Dictionary;
  locale: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const t = getAdminText(locale).products;

  if (!isOpen || !product) return null;

  const handleDelete = () => {
    startTransition(async () => {
      setError(null);
      const res = await deleteProduct(product.id);
      if (!res.ok) {
        setError(errorText(t.error, res.error));
        return;
      }
      toast.success(res.hidden ? t.hiddenToast : t.deletedToast);
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        role="alertdialog"
        aria-modal="true"
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
      >
        <div className="p-6">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center mb-4">
            <Trash2 size={24} className="text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
            {dict.admin?.products?.deleteConfirmTitle || "Are you sure?"}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
            {dict.admin?.products?.deleteConfirmDesc || "This action cannot be undone. This will permanently delete the product."}
          </p>

          {error && (
            <div role="alert" className="mb-4 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              {dict.admin?.products?.cancel || "Cancel"}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold shadow-sm hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isPending ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              {dict.admin?.products?.delete || "Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
