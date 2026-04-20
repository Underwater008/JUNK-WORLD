"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { uploadAsset } from "@/lib/uploads";

interface CardCropOverlayProps {
  coverImageUrl: string;
  onCrop: (cardImageUrl: string) => void;
  onCancel: () => void;
  disabled?: boolean;
  uploadPrefix?: string;
}

const ASPECT = 16 / 9;

interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

type DragMode = "move" | "nw" | "ne" | "sw" | "se" | null;

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

export default function CardCropOverlay({
  coverImageUrl,
  onCrop,
  onCancel,
  disabled = false,
  uploadPrefix,
}: CardCropOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [crop, setCrop] = useState<CropRect>({ x: 0, y: 0, w: 0, h: 0 });
  const [dragging, setDragging] = useState<DragMode>(null);
  const [dragStart, setDragStart] = useState({ mx: 0, my: 0, crop: { x: 0, y: 0, w: 0, h: 0 } });
  const [uploading, setUploading] = useState(false);

  // Initialize crop to centered 4:3 rect filling ~60% of width
  const initCrop = useCallback(() => {
    if (!imgSize.w || !imgSize.h) return;
    const cropW = imgSize.w * 0.6;
    const cropH = cropW / ASPECT;
    const finalW = cropH > imgSize.h ? imgSize.h * ASPECT : cropW;
    const finalH = finalW / ASPECT;
    setCrop({
      x: (imgSize.w - finalW) / 2,
      y: (imgSize.h - finalH) / 2,
      w: finalW,
      h: finalH,
    });
  }, [imgSize]);

  useEffect(() => {
    initCrop();
  }, [initCrop]);

  function handleImageLoad() {
    const el = imgRef.current;
    if (!el) return;
    setImgSize({ w: el.clientWidth, h: el.clientHeight });
    setImgLoaded(true);
  }

  function getRelPos(e: React.MouseEvent | MouseEvent) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handlePointerDown(e: React.MouseEvent, mode: DragMode) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(mode);
    const pos = getRelPos(e);
    setDragStart({ mx: pos.x, my: pos.y, crop: { ...crop } });
  }

  useEffect(() => {
    if (!dragging) return;

    function onMove(e: MouseEvent) {
      const pos = getRelPos(e);
      const dx = pos.x - dragStart.mx;
      const dy = pos.y - dragStart.my;
      const sc = dragStart.crop;

      if (dragging === "move") {
        setCrop({
          ...sc,
          x: clamp(sc.x + dx, 0, imgSize.w - sc.w),
          y: clamp(sc.y + dy, 0, imgSize.h - sc.h),
        });
      } else {
        // Corner resize — maintain 4:3 aspect
        let newW = sc.w;
        let newX = sc.x;
        let newY = sc.y;

        if (dragging === "se") {
          newW = clamp(sc.w + dx, 40, imgSize.w - sc.x);
        } else if (dragging === "sw") {
          const dw = -dx;
          newW = clamp(sc.w + dw, 40, sc.x + sc.w);
          newX = sc.x + sc.w - newW;
        } else if (dragging === "ne") {
          newW = clamp(sc.w + dx, 40, imgSize.w - sc.x);
        } else if (dragging === "nw") {
          const dw = -dx;
          newW = clamp(sc.w + dw, 40, sc.x + sc.w);
          newX = sc.x + sc.w - newW;
        }

        const newH = newW / ASPECT;
        if (dragging === "nw" || dragging === "ne") {
          newY = sc.y + sc.h - newH;
        }

        // Bounds check
        if (newY < 0) {
          newY = 0;
          const maxH = sc.y + sc.h;
          const h = Math.min(newH, maxH);
          newW = h * ASPECT;
          if (dragging === "nw" || dragging === "sw") {
            newX = sc.x + sc.w - newW;
          }
        }
        if (newY + newW / ASPECT > imgSize.h) {
          const h = imgSize.h - newY;
          newW = h * ASPECT;
          if (dragging === "nw" || dragging === "sw") {
            newX = sc.x + sc.w - newW;
          }
        }

        setCrop({ x: newX, y: newY, w: newW, h: newW / ASPECT });
      }
    }

    function onUp() {
      setDragging(null);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, dragStart, imgSize]);

  async function handleConfirm() {
    if (disabled || uploading) return;
    setUploading(true);

    try {
      // Load full-res image to crop from
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load image for cropping."));
        img.src = coverImageUrl;
      });

      // Calculate crop in natural image coordinates
      const displayEl = imgRef.current;
      if (!displayEl) throw new Error("Image element not found.");
      const scaleX = img.naturalWidth / displayEl.clientWidth;
      const scaleY = img.naturalHeight / displayEl.clientHeight;

      const sx = crop.x * scaleX;
      const sy = crop.y * scaleY;
      const sw = crop.w * scaleX;
      const sh = crop.h * scaleY;

      const canvas = document.createElement("canvas");
      canvas.width = Math.round(sw);
      canvas.height = Math.round(sh);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context unavailable.");
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Canvas export failed."))),
          "image/jpeg",
          0.9
        );
      });

      const file = new File([blob], "card-crop.jpg", { type: "image/jpeg" });
      const url = await uploadAsset(file, uploadPrefix);
      onCrop(url);
    } catch {
      // silently fail, user can retry
    } finally {
      setUploading(false);
    }
  }

  const handleSize = 10;

  function cornerStyle(pos: "nw" | "ne" | "sw" | "se"): React.CSSProperties {
    const base: React.CSSProperties = {
      position: "absolute",
      width: handleSize,
      height: handleSize,
      backgroundColor: "white",
      border: "2px solid black",
      zIndex: 10,
    };
    if (pos === "nw") return { ...base, top: -handleSize / 2, left: -handleSize / 2, cursor: "nw-resize" };
    if (pos === "ne") return { ...base, top: -handleSize / 2, right: -handleSize / 2, cursor: "ne-resize" };
    if (pos === "sw") return { ...base, bottom: -handleSize / 2, left: -handleSize / 2, cursor: "sw-resize" };
    return { ...base, bottom: -handleSize / 2, right: -handleSize / 2, cursor: "se-resize" };
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-8">
      {!imgLoaded && (
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">
          Loading image...
        </div>
      )}
      <div className={`flex max-h-[80vh] max-w-xl flex-col overflow-hidden rounded-lg bg-black shadow-2xl ${imgLoaded ? "" : "invisible absolute"}`}>
      <div ref={containerRef} className="relative select-none">
        <img
          ref={imgRef}
          src={coverImageUrl}
          alt="Cover"
          className="block max-h-[calc(80vh-48px)] w-auto max-w-full"
          onLoad={handleImageLoad}
          draggable={false}
        />

        {/* Darkened overlay outside crop */}
        {imgSize.w > 0 && (
          <>
            <div
              className="absolute inset-0 bg-black/50"
              style={{
                clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${crop.x}px ${crop.y}px, ${crop.x}px ${crop.y + crop.h}px, ${crop.x + crop.w}px ${crop.y + crop.h}px, ${crop.x + crop.w}px ${crop.y}px, ${crop.x}px ${crop.y}px)`,
              }}
            />

            {/* Crop box */}
            <div
              className="absolute border-2 border-white"
              style={{
                left: crop.x,
                top: crop.y,
                width: crop.w,
                height: crop.h,
                cursor: dragging === "move" ? "grabbing" : "grab",
                boxShadow: "none",
              }}
              onMouseDown={(e) => handlePointerDown(e, "move")}
            >
              {/* Aspect label */}
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70 pointer-events-none">
                16 : 9
              </span>

              {/* Corner handles */}
              <div style={cornerStyle("nw")} onMouseDown={(e) => handlePointerDown(e, "nw")} />
              <div style={cornerStyle("ne")} onMouseDown={(e) => handlePointerDown(e, "ne")} />
              <div style={cornerStyle("sw")} onMouseDown={(e) => handlePointerDown(e, "sw")} />
              <div style={cornerStyle("se")} onMouseDown={(e) => handlePointerDown(e, "se")} />
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center justify-between bg-black/80 px-4 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60">
          Drag to select card thumbnail area
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={uploading}
            className="border border-white/30 bg-transparent px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-white/10 disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={disabled || uploading || imgSize.w === 0}
            className="border border-white bg-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-black transition hover:bg-white/90 disabled:opacity-40"
          >
            {uploading ? "Cropping..." : "Confirm"}
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
