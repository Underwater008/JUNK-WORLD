"use client";

import type { CSSProperties } from "react";
import type { CropBox } from "@/types";

interface CroppedImageProps {
  src: string;
  crop?: CropBox | null;
  alt?: string;
  className?: string;
  style?: CSSProperties;
  /**
   * Display mode when no crop is set.
   *  - "cover" (default): img fills container with object-cover (matches existing layout)
   *  - "contain": img fits inside container (letterbox)
   *  - "raw": no aspect override; render an img and let parent control sizing
   */
  fit?: "cover" | "contain" | "raw";
}

/**
 * Renders an image with an optional virtual crop. The original `src` is loaded
 * and a wrapper element clips it so only the crop region is visible. This
 * preserves animation for GIFs and lets users re-crop without re-uploading.
 *
 * If no crop is set, behaves like a plain <img>.
 */
export default function CroppedImage({
  src,
  crop,
  alt = "",
  className,
  style,
  fit = "cover",
}: CroppedImageProps) {
  if (!crop || crop.natW <= 0 || crop.natH <= 0 || crop.w <= 0 || crop.h <= 0) {
    if (fit === "raw") {
      return <img src={src} alt={alt} className={className} style={style} />;
    }
    const fitClass = fit === "contain" ? "object-contain" : "object-cover";
    return (
      <img
        src={src}
        alt={alt}
        className={`${fitClass} h-full w-full ${className ?? ""}`.trim()}
        style={style}
      />
    );
  }

  // Container aspect ratio matches the crop region's rendered proportions.
  // crop.w / crop.h is in natural pixels — that's also the rendered aspect.
  const cropAspect = crop.w / crop.h;

  // Image scaled so the crop region fills the container.
  // Image rendered width as % of container = 100% * natW / cropW.
  const widthPct = (crop.natW / crop.w) * 100;
  const heightPct = (crop.natH / crop.h) * 100;
  const leftPct = -(crop.x / crop.w) * 100;
  const topPct = -(crop.y / crop.h) * 100;

  return (
    <div
      className={className}
      style={{
        position: "relative",
        overflow: "hidden",
        aspectRatio: `${cropAspect}`,
        ...style,
      }}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        style={{
          position: "absolute",
          top: `${topPct}%`,
          left: `${leftPct}%`,
          width: `${widthPct}%`,
          height: `${heightPct}%`,
          maxWidth: "none",
          maxHeight: "none",
          objectFit: "fill",
        }}
      />
    </div>
  );
}
