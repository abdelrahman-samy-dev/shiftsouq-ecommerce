"use client";

/* Photos: multi upload with progress, drag (or buttons) to reorder, main photo, colour, alt text, paste a link. */

import Image from "next/image";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/ds";
import { discardUploadedImage } from "@/lib/actions/admin-catalog";
import { newKey, type EditorImage, type EditorState } from "@/lib/admin/catalog-editor";
import { ALLOWED_IMAGE_HOSTS, IMAGE_ACCEPT, isAllowedImageUrl, MAX_PRODUCT_IMAGES } from "@/lib/admin/catalog-images";
import { moveItem } from "@/lib/admin/catalog-variants";
import { catalogError, fmt, type CatalogText } from "@/lib/admin/i18n-catalog";
import { cn } from "@/lib/utils";
import { uploadImage } from "../upload";

interface UploadItem {
  key: string;
  name: string;
  preview: string;
  progress: number;
  error: string | null;
  file: File;
}

const small = "h-10 w-full rounded-sm border border-border bg-surface-elevated px-2.5 text-[0.8125rem] text-text-primary outline-none hover:border-border-hover focus:border-text-primary";

export function MediaSection({
  state,
  update,
  t,
  locale,
  onBusyChange,
}: {
  state: EditorState;
  update: (patch: Partial<EditorState> | ((s: EditorState) => Partial<EditorState>)) => void;
  t: CatalogText;
  locale: string;
  onBusyChange: (busy: boolean) => void;
}) {
  const tm = t.editor.media;
  const ar = locale === "ar";
  const inputId = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [over, setOver] = useState(false);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [dropKey, setDropKey] = useState<string | null>(null);
  const [link, setLink] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [limitNote, setLimitNote] = useState(false);
  const activeUploads = useRef(0);

  const room = MAX_PRODUCT_IMAGES - state.images.length - uploads.filter((u) => !u.error).length;

  const runUpload = async (item: UploadItem) => {
    activeUploads.current += 1;
    onBusyChange(true);
    const res = await uploadImage(item.file, "products", (p) =>
      setUploads((list) => list.map((u) => (u.key === item.key ? { ...u, progress: p } : u))),
    );
    activeUploads.current -= 1;
    if (activeUploads.current === 0) onBusyChange(false);
    if (res.ok) {
      URL.revokeObjectURL(item.preview);
      setUploads((list) => list.filter((u) => u.key !== item.key));
      update((s) => ({
        images: [...s.images, { key: newKey("i"), id: null, url: res.url, color_en: null, alt_text_en: "", alt_text_ar: "", fresh: true }],
      }));
    } else {
      setUploads((list) => list.map((u) => (u.key === item.key ? { ...u, error: res.error, progress: 0 } : u)));
    }
  };

  const addFiles = (files: FileList | File[] | null | undefined) => {
    const list = Array.from(files ?? []);
    if (!list.length) return;
    const accepted = list.slice(0, Math.max(0, room));
    setLimitNote(accepted.length < list.length);
    const items = accepted.map((file) => ({ key: newKey("u"), name: file.name, preview: URL.createObjectURL(file), progress: 0, error: null, file }));
    setUploads((prev) => [...prev, ...items]);
    for (const item of items) void runUpload(item);
  };

  const retry = (item: UploadItem) => {
    setUploads((list) => list.map((u) => (u.key === item.key ? { ...u, error: null, progress: 0 } : u)));
    void runUpload({ ...item, error: null });
  };
  const dismiss = (item: UploadItem) => {
    URL.revokeObjectURL(item.preview);
    setUploads((list) => list.filter((u) => u.key !== item.key));
  };

  const addLink = () => {
    const url = link.trim();
    if (!isAllowedImageUrl(url)) return setLinkError(t.error.image_url);
    if (state.images.some((i) => i.url === url)) return setLinkError(t.error.duplicate_image);
    if (room <= 0) return setLinkError(fmt(tm.limit, { count: MAX_PRODUCT_IMAGES }));
    setLinkError(null);
    setLink("");
    update((s) => ({ images: [...s.images, { key: newKey("i"), id: null, url, color_en: null, alt_text_en: "", alt_text_ar: "", fresh: false }] }));
  };

  const edit = (key: string, patch: Partial<EditorImage>) => update((s) => ({ images: s.images.map((i) => (i.key === key ? { ...i, ...patch } : i)) }));
  const move = (from: number, to: number) => update((s) => ({ images: moveItem(s.images, from, to) }));
  const remove = (img: EditorImage) => {
    update((s) => ({ images: s.images.filter((i) => i.key !== img.key) }));
    // A photo uploaded in this session and never saved can go straight away; saved ones go on save.
    if (img.fresh) void discardUploadedImage(img.url);
  };

  const colourOptions = state.colours.filter((c) => c.name_en.trim());

  return (
    <div className="flex flex-col gap-6">
      {/* Drop zone */}
      <div>
        <input
          ref={fileInput}
          id={inputId}
          type="file"
          multiple
          accept={IMAGE_ACCEPT}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={room <= 0}
          aria-describedby={`${inputId}-hint`}
          onClick={() => fileInput.current?.click()}
          onDragOver={(e) => {
            if (!e.dataTransfer.types.includes("Files")) return;
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            if (!e.dataTransfer.files?.length) return;
            e.preventDefault();
            setOver(false);
            addFiles(e.dataTransfer.files);
          }}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-2 rounded-sm border border-dashed px-6 py-10 text-center transition-colors disabled:opacity-50",
            over ? "border-text-primary bg-surface" : "border-border-hover bg-surface-elevated hover:border-text-primary",
          )}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-7 text-text-muted" fill="none" stroke="currentColor" strokeWidth="1.25">
            <path d="M12 16V5M7.5 9.5L12 5l4.5 4.5M4.5 15v3.5h15V15" />
          </svg>
          <span className="text-sm text-text-primary">{tm.drop}</span>
          <span id={`${inputId}-hint`} className="max-w-sm text-[0.75rem] text-text-muted">
            {tm.dropHint}
          </span>
        </button>
        {limitNote ? <p className="mt-2 text-[0.8125rem] text-warning">{fmt(tm.limit, { count: MAX_PRODUCT_IMAGES })}</p> : null}
      </div>

      {/* In-flight uploads */}
      {uploads.length ? (
        <ul className="flex flex-col gap-2" aria-live="polite">
          {uploads.map((u) => (
            <li key={u.key} className="flex items-center gap-3 border-b border-border pb-2">
              <span className="relative block h-12 w-[2.4rem] shrink-0 overflow-hidden rounded-[2px] bg-surface">
                <Image src={u.preview} alt="" fill unoptimized sizes="40px" className="object-cover" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.8125rem] text-text-primary">
                  {u.error ? fmt(tm.failed, { name: u.name }) : fmt(tm.uploading, { name: u.name })}
                </p>
                {u.error ? (
                  <p className="text-[0.75rem] text-destructive">{catalogError(t, u.error)}</p>
                ) : (
                  <span className="mt-1.5 block h-0.5 w-full overflow-hidden bg-border" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(u.progress * 100)} aria-label={u.name}>
                    <span className="block h-full bg-text-primary transition-[width] duration-150" style={{ width: `${Math.round(u.progress * 100)}%` }} />
                  </span>
                )}
              </div>
              {u.error ? (
                <div className="flex shrink-0 gap-1">
                  <Button size="sm" variant="ghost" onClick={() => retry(u)}>
                    {tm.retry}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => dismiss(u)}>
                    {t.common.remove}
                  </Button>
                </div>
              ) : (
                <span className="shrink-0 text-[0.75rem] text-text-muted tabular-nums">{Math.round(u.progress * 100)}%</span>
              )}
            </li>
          ))}
        </ul>
      ) : null}

      {/* Photos */}
      {state.images.length === 0 ? (
        <p className="text-sm text-text-muted">{tm.empty}</p>
      ) : (
        <ol className="grid gap-3 lg:grid-cols-2">
          {state.images.map((img, i) => {
            const isMain = i === 0;
            return (
              <li
                key={img.key}
                draggable
                onDragStart={(e) => {
                  setDragKey(img.key);
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", img.key);
                }}
                onDragOver={(e) => {
                  if (!dragKey) return;
                  e.preventDefault();
                  if (dropKey !== img.key) setDropKey(img.key);
                }}
                onDragLeave={() => setDropKey((k) => (k === img.key ? null : k))}
                onDrop={(e) => {
                  if (!dragKey) return;
                  e.preventDefault();
                  const from = state.images.findIndex((x) => x.key === dragKey);
                  if (from !== -1 && from !== i) move(from, i);
                  setDragKey(null);
                  setDropKey(null);
                }}
                onDragEnd={() => {
                  setDragKey(null);
                  setDropKey(null);
                }}
                className={cn(
                  "flex gap-3 rounded-sm border bg-background p-2.5 transition-colors",
                  dropKey === img.key && dragKey !== img.key ? "border-text-primary" : "border-border",
                  dragKey === img.key && "opacity-50",
                )}
              >
                <div className="relative w-24 shrink-0 sm:w-28">
                  <span className="relative block aspect-[4/5] w-full cursor-grab overflow-hidden rounded-[2px] bg-surface active:cursor-grabbing">
                    <Image src={img.url} alt="" fill sizes="112px" className="object-cover" />
                  </span>
                  <span className="absolute start-1.5 top-1.5 inline-flex h-5 items-center rounded-[2px] bg-background/90 px-1.5 text-[0.6875rem] tabular-nums text-text-primary">
                    {isMain ? tm.primary : fmt(tm.photo, { n: i + 1 })}
                  </span>
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-[0.75rem] text-text-muted">{tm.colour}</span>
                    <select value={img.color_en ?? ""} onChange={(e) => edit(img.key, { color_en: e.target.value || null })} className={small}>
                      <option value="">{tm.allColours}</option>
                      {colourOptions.map((c) => (
                        <option key={c.key} value={c.name_en}>
                          {ar ? c.name_ar || c.name_en : c.name_en}
                        </option>
                      ))}
                      {img.color_en && !colourOptions.some((c) => c.name_en === img.color_en) ? <option value={img.color_en}>{img.color_en}</option> : null}
                    </select>
                  </label>
                  <input aria-label={tm.altEn} placeholder={tm.altEn} value={img.alt_text_en} maxLength={200} dir="ltr" onChange={(e) => edit(img.key, { alt_text_en: e.target.value })} className={small} />
                  <input aria-label={tm.altAr} placeholder={tm.altAr} value={img.alt_text_ar} maxLength={200} dir="rtl" lang="ar" onChange={(e) => edit(img.key, { alt_text_ar: e.target.value })} className={small} />
                  <div className="mt-auto flex flex-wrap items-center gap-1">
                    {!isMain ? (
                      <button type="button" onClick={() => move(i, 0)} className="h-9 rounded-sm px-2 text-[0.75rem] text-text-primary underline-offset-4 hover:underline">
                        {tm.makePrimary}
                      </button>
                    ) : null}
                    <span className="ms-auto flex items-center">
                      <IconBtn label={tm.moveEarlier} disabled={i === 0} onClick={() => move(i, i - 1)} path="M10 3.5L5.5 8l4.5 4.5" flip />
                      <IconBtn label={tm.moveLater} disabled={i === state.images.length - 1} onClick={() => move(i, i + 1)} path="M6 3.5L10.5 8 6 12.5" flip />
                      <IconBtn label={tm.remove} onClick={() => remove(img)} path="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5" danger />
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {/* Paste a link */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${inputId}-link`} className="text-[0.8125rem] text-text-secondary">
          {tm.pasteUrl}
        </label>
        <div className="flex gap-2">
          <input
            id={`${inputId}-link`}
            type="url"
            inputMode="url"
            dir="ltr"
            value={link}
            placeholder="https://"
            aria-invalid={linkError ? true : undefined}
            aria-describedby={linkError ? `${inputId}-link-error` : `${inputId}-link-hint`}
            onChange={(e) => {
              setLink(e.target.value);
              setLinkError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addLink();
              }
            }}
            className={cn(small, "h-11 flex-1 text-sm aria-[invalid=true]:border-destructive")}
          />
          <Button size="sm" variant="secondary" onClick={addLink} disabled={!link.trim()} className="h-11">
            {tm.addUrl}
          </Button>
        </div>
        {linkError ? (
          <p id={`${inputId}-link-error`} role="alert" className="text-[0.8125rem] text-destructive">
            {linkError}
          </p>
        ) : (
          <p id={`${inputId}-link-hint`} className="text-[0.75rem] text-text-muted">
            {fmt(tm.pasteHint, { hosts: ALLOWED_IMAGE_HOSTS })}
          </p>
        )}
      </div>
    </div>
  );
}

function IconBtn({ label, onClick, path, disabled, danger, flip }: { label: string; onClick: () => void; path: string; disabled?: boolean; danger?: boolean; flip?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-sm text-text-muted hover:bg-surface disabled:opacity-30",
        danger ? "hover:text-destructive" : "hover:text-text-primary",
      )}
    >
      <svg aria-hidden="true" viewBox="0 0 16 16" className={cn("size-4", flip && "rtl:-scale-x-100")} fill="none" stroke="currentColor" strokeWidth="1.4">
        <path d={path} />
      </svg>
    </button>
  );
}
