"use client";

import { ChangeEvent, useId, useRef, useState } from "react";
import CroppedImage from "@/components/CroppedImage";
import { uploadAsset } from "@/lib/uploads";
import type { CropBox } from "@/types";

interface CoverImageUploadProps {
  imageUrl: string;
  onImageChange: (url: string) => void;
  disabled?: boolean;
  uploadPrefix?: string;
  crop?: CropBox | null;
}

export default function CoverImageUpload({
  imageUrl,
  onImageChange,
  disabled = false,
  uploadPrefix,
  crop = null,
}: CoverImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || disabled) return;

    setUploading(true);
    setError(null);
    try {
      const url = await uploadAsset(file, uploadPrefix);
      onImageChange(url);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Cover upload failed."
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  function openPicker() {
    if (disabled || uploading) return;
    inputRef.current?.click();
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 pt-6">
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        disabled={disabled || uploading}
        onChange={(e) => void handleUpload(e)}
      />

      {!imageUrl ? (
        <>
          <div className="aspect-[16/9] overflow-hidden bg-[#F0EDE6]">
            <button
              type="button"
              onClick={openPicker}
              disabled={disabled || uploading}
              className="group flex h-full w-full cursor-pointer items-center justify-center transition-colors hover:bg-[#E8E4DB] disabled:cursor-not-allowed"
            >
              <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-black/35 transition-colors group-hover:text-black/55">
                {uploading ? "Uploading..." : "+ Add cover image"}
              </span>
            </button>
          </div>
          <p className="mt-2 text-[11px] leading-5 text-black/45">
            Recommended: landscape, ~16:9, around 2000px on the long edge. Max 4 MB. JPEG, PNG, WebP, or GIF.
          </p>
        </>
      ) : (
        <div className="space-y-2">
          <div className="group relative overflow-hidden">
            <CroppedImage
              src={imageUrl}
              crop={crop}
              alt="Cover"
              className={crop ? "" : "aspect-[16/9]"}
              fit="cover"
            />
            <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/30" />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={openPicker}
              disabled={disabled || uploading}
              className="rounded-md border border-black/15 bg-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-black transition hover:border-black hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {uploading ? "Uploading..." : "Change cover"}
            </button>
            <button
              type="button"
              onClick={() => {
                if (disabled || uploading) return;
                setError(null);
                onImageChange("");
              }}
              disabled={disabled || uploading}
              className="rounded-md border border-black/15 bg-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-black/60 transition hover:border-black hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
            >
              Remove
            </button>
          </div>
        </div>
      )}

      {error ? (
        <p
          role="alert"
          className="mt-2 text-[11px] font-medium text-red-700"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
