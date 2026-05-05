"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CropBox } from "@/types";

interface CardCropOverlayProps {
  coverImageUrl: string;
  onCrop: (crop: CropBox) => void;
  onCancel: () => void;
  disabled?: boolean;
  title?: string;
  subtitle?: string;
  confirmLabel?: string;
  skipLabel?: string;
  /** If set, hides the aspect picker and forces this width-over-height ratio. */
  lockedAspect?: number;
}

const ASPECT_PRESETS: { key: string; label: string; ratio: number }[] = [
  { key: "16:9", label: "16 : 9 landscape", ratio: 16 / 9 },
  { key: "4:3", label: "4 : 3", ratio: 4 / 3 },
  { key: "1:1", label: "1 : 1 square", ratio: 1 },
  { key: "3:4", label: "3 : 4 portrait", ratio: 3 / 4 },
  { key: "9:16", label: "9 : 16 portrait", ratio: 9 / 16 },
];
const DEFAULT_ASPECT_KEY = "16:9";

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
  title = "Image crop",
  subtitle = "Drag the box to choose the visible area.",
  confirmLabel = "Save crop",
  skipLabel = "Use full image",
  lockedAspect,
}: CardCropOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const [crop, setCrop] = useState<CropRect>({ x: 0, y: 0, w: 0, h: 0 });
  const [dragging, setDragging] = useState<DragMode>(null);
  const [dragStart, setDragStart] = useState({ mx: 0, my: 0, crop: { x: 0, y: 0, w: 0, h: 0 } });
  const [error, setError] = useState<string | null>(null);
  const [aspectKey, setAspectKey] = useState(DEFAULT_ASPECT_KEY);

  const aspect =
    typeof lockedAspect === "number"
      ? lockedAspect
      : ASPECT_PRESETS.find((preset) => preset.key === aspectKey)?.ratio ?? 16 / 9;

  // Initialize crop centered, filling ~60% of width while respecting aspect
  const initCrop = useCallback(() => {
    if (!imgSize.w || !imgSize.h) return;
    let cropW = imgSize.w * 0.6;
    let cropH = cropW / aspect;
    if (cropH > imgSize.h * 0.92) {
      cropH = imgSize.h * 0.92;
      cropW = cropH * aspect;
    }
    if (cropW > imgSize.w) {
      cropW = imgSize.w;
      cropH = cropW / aspect;
    }
    setCrop({
      x: (imgSize.w - cropW) / 2,
      y: (imgSize.h - cropH) / 2,
      w: cropW,
      h: cropH,
    });
  }, [imgSize, aspect]);

  useEffect(() => {
    initCrop();
  }, [initCrop]);

  function handleImageLoad() {
    const el = imgRef.current;
    if (!el) return;
    setImgSize({ w: el.clientWidth, h: el.clientHeight });
    setNaturalSize({ w: el.naturalWidth, h: el.naturalHeight });
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

        const newH = newW / aspect;
        if (dragging === "nw" || dragging === "ne") {
          newY = sc.y + sc.h - newH;
        }

        // Bounds check
        if (newY < 0) {
          newY = 0;
          const maxH = sc.y + sc.h;
          const h = Math.min(newH, maxH);
          newW = h * aspect;
          if (dragging === "nw" || dragging === "sw") {
            newX = sc.x + sc.w - newW;
          }
        }
        if (newY + newW / aspect > imgSize.h) {
          const h = imgSize.h - newY;
          newW = h * aspect;
          if (dragging === "nw" || dragging === "sw") {
            newX = sc.x + sc.w - newW;
          }
        }

        setCrop({ x: newX, y: newY, w: newW, h: newW / aspect });
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
  }, [dragging, dragStart, imgSize, aspect]);

  function handleConfirm() {
    if (disabled) return;
    setError(null);

    if (
      naturalSize.w <= 0 ||
      naturalSize.h <= 0 ||
      imgSize.w <= 0 ||
      imgSize.h <= 0
    ) {
      setError("Image is still loading — try again in a moment.");
      return;
    }

    const scaleX = naturalSize.w / imgSize.w;
    const scaleY = naturalSize.h / imgSize.h;

    onCrop({
      x: Math.max(0, Math.round(crop.x * scaleX)),
      y: Math.max(0, Math.round(crop.y * scaleY)),
      w: Math.max(1, Math.round(crop.w * scaleX)),
      h: Math.max(1, Math.round(crop.h * scaleY)),
      natW: naturalSize.w,
      natH: naturalSize.h,
    });
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
      <div className="border-b border-white/10 bg-black/80 px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55">
          {title}
        </p>
        <p className="mt-1 text-sm leading-5 text-white/85">
          {subtitle}
        </p>
        {typeof lockedAspect === "number" ? null : (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">
              Aspect
            </span>
            {ASPECT_PRESETS.map((preset) => {
              const active = preset.key === aspectKey;
              return (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => setAspectKey(preset.key)}
                  className={`rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] transition ${
                    active
                      ? "border-white bg-white text-black"
                      : "border-white/30 bg-transparent text-white hover:bg-white/10"
                  }`}
                  aria-pressed={active}
                >
                  {preset.key}
                </button>
              );
            })}
          </div>
        )}
      </div>
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
                {typeof lockedAspect === "number"
                  ? lockedAspect >= 1
                    ? `${(lockedAspect).toFixed(2)} : 1`
                    : `1 : ${(1 / lockedAspect).toFixed(2)}`
                  : aspectKey.replace(":", " : ")}
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
      <div className="flex shrink-0 flex-col gap-2 bg-black/80 px-4 py-3">
        {error ? (
          <p role="alert" className="text-[11px] font-semibold text-red-300">
            {error}
          </p>
        ) : null}
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60">
            Drag the box to choose the area
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="border border-white/30 bg-transparent px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-white/10"
            >
              {skipLabel}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={disabled || imgSize.w === 0}
              className="border border-white bg-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-black transition hover:bg-white/90 disabled:opacity-40"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
