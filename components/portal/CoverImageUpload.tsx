"use client";

import { ChangeEvent, useState } from "react";
import { uploadAsset } from "@/lib/uploads";

interface CoverImageUploadProps {
  imageUrl: string;
  onImageChange: (url: string) => void;
  disabled?: boolean;
}

export default function CoverImageUpload({
  imageUrl,
  onImageChange,
  disabled = false,
}: CoverImageUploadProps) {
  const [uploading, setUploading] = useState(false);

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || disabled) return;

    setUploading(true);
    try {
      const url = await uploadAsset(file);
      onImageChange(url);
    } catch {
      // parent handles error display
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  if (!imageUrl) {
    return (
      <div className="mx-auto w-full max-w-3xl px-6 pt-6">
        <div className="aspect-[16/9] overflow-hidden bg-[#F0EDE6]">
          <label className="group flex h-full w-full cursor-pointer items-center justify-center transition-colors hover:bg-[#E8E4DB]">
            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-black/35 transition-colors group-hover:text-black/55">
              {uploading ? "Uploading..." : "+ Add cover image"}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={disabled || uploading}
              onChange={(e) => void handleUpload(e)}
            />
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 pt-6">
      <div className="group relative aspect-[16/9] overflow-hidden">
        <img
          src={imageUrl}
          alt="Cover"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
          <label className="cursor-pointer rounded-full bg-white/90 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-black transition hover:bg-white">
            {uploading ? "Uploading..." : "Change cover"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={disabled || uploading}
              onChange={(e) => void handleUpload(e)}
            />
          </label>
          <button
            type="button"
            onClick={() => onImageChange("")}
            disabled={disabled}
            className="rounded-full bg-white/90 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-black transition hover:bg-white"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
