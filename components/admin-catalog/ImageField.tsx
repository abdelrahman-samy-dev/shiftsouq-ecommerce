"use client";

/* One image (category or collection cover): drop / browse / replace / remove, with progress. */

import Image from "next/image";
import { useId, useRef, useState } from "react";
import { IMAGE_ACCEPT, type ImageScope } from "@/lib/admin/catalog-images";
import { cn } from "@/lib/utils";
import { uploadImage } from "./upload";

export interface ImageFieldLabels {
  label: string;
  drop: string;
  hint: string;
  replace: string;
  remove: string;
  uploading: string;
  errors: Record<string, string>;
  fallbackError: string;
}

export function ImageField({
  value,
  onChange,
  onUploaded,
  scope,
  labels,
  aspect = "aspect-[4/3]",
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  /** Called with every new upload, so the parent can discard it if the form is cancelled. */
  onUploaded?: (url: string) => void;
  scope: ImageScope;
  labels: ImageFieldLabels;
  aspect?: string;
}) {
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);

  const start = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setProgress(0);
    const res = await uploadImage(file, scope, setProgress);
    setProgress(null);
    if (res.ok) {
      onUploaded?.(res.url);
      onChange(res.url);
    } else {
      setError(labels.errors[res.error] ?? labels.fallbackError);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[0.8125rem] text-text-secondary" id={`${inputId}-label`}>
        {labels.label}
      </span>
      <input
        ref={input}
        id={inputId}
        type="file"
        accept={IMAGE_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          void start(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {value ? (
        <div className={cn("group relative w-full overflow-hidden rounded-sm bg-surface", aspect)}>
          <Image src={value} alt="" fill sizes="(max-width: 640px) 90vw, 400px" className="object-cover" />
          {progress !== null ? <UploadOverlay progress={progress} label={labels.uploading} /> : null}
          <div className="absolute inset-x-0 bottom-0 flex gap-2 bg-gradient-to-t from-black/45 to-transparent p-3">
            <button
              type="button"
              onClick={() => input.current?.click()}
              className="h-9 rounded-sm bg-surface-elevated px-3 text-[0.8125rem] text-text-primary hover:bg-background"
            >
              {labels.replace}
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="h-9 rounded-sm bg-surface-elevated px-3 text-[0.8125rem] text-destructive hover:bg-background"
            >
              {labels.remove}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          aria-describedby={`${inputId}-hint`}
          onClick={() => input.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            void start(e.dataTransfer.files?.[0]);
          }}
          className={cn(
            "relative flex w-full flex-col items-center justify-center gap-2 rounded-sm border border-dashed px-4 text-center transition-colors",
            aspect,
            over ? "border-text-primary bg-surface" : "border-border-hover bg-surface-elevated hover:border-text-primary",
          )}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6 text-text-muted" fill="none" stroke="currentColor" strokeWidth="1.25">
            <path d="M12 16V5M7.5 9.5L12 5l4.5 4.5M4.5 15v3.5h15V15" />
          </svg>
          <span className="text-sm text-text-primary">{labels.drop}</span>
          <span id={`${inputId}-hint`} className="text-[0.75rem] text-text-muted">
            {labels.hint}
          </span>
          {progress !== null ? <UploadOverlay progress={progress} label={labels.uploading} /> : null}
        </button>
      )}
      {error ? (
        <p role="alert" className="text-[0.8125rem] text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function UploadOverlay({ progress, label }: { progress: number; label: string }) {
  const pct = Math.round(progress * 100);
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface-elevated/85" role="status" aria-live="polite">
      <span className="text-[0.8125rem] text-text-secondary tabular-nums">
        {label} {pct}%
      </span>
      <span className="h-0.5 w-2/3 overflow-hidden bg-border">
        <span className="block h-full bg-text-primary transition-[width] duration-150" style={{ width: `${pct}%` }} />
      </span>
    </div>
  );
}
