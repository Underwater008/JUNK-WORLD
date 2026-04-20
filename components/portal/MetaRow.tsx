"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { ProjectMarkerOffset, University } from "@/types";

interface MetaRowProps {
  slug: string;
  universityId: string;
  year: number;
  markerOffset: ProjectMarkerOffset;
  locationLabel: string;
  universities: University[];
  onUniversityChange: (universityId: string) => void;
  onYearChange: (year: number) => void;
  onMarkerOffsetChange: (markerOffset: ProjectMarkerOffset) => void;
  onLocationLabelChange: (label: string) => void;
  onSlugChange: (slug: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disabled?: boolean;
  participantsCount?: number;
  entityLabel?: string;
  showParticipants?: boolean;
  children?: ReactNode;
}

function formatCoordinate(value: number) {
  return value.toFixed(4);
}

function clampCoordinate(axis: "lat" | "lng", value: number) {
  return axis === "lat"
    ? Math.min(90, Math.max(-90, value))
    : Math.min(180, Math.max(-180, value));
}

export default function MetaRow({
  slug,
  universityId,
  year,
  markerOffset,
  locationLabel,
  universities,
  onUniversityChange,
  onYearChange,
  onMarkerOffsetChange,
  onLocationLabelChange,
  onSlugChange,
  open,
  onOpenChange,
  disabled = false,
  participantsCount,
  entityLabel = "Project",
  showParticipants = true,
  children,
}: MetaRowProps) {
  const [activeCoordinateInput, setActiveCoordinateInput] = useState<
    "lat" | "lng" | null
  >(null);
  const [latitudeInput, setLatitudeInput] = useState(() =>
    formatCoordinate(markerOffset.lat)
  );
  const [longitudeInput, setLongitudeInput] = useState(() =>
    formatCoordinate(markerOffset.lng)
  );
  const university = universities.find((u) => u.id === universityId);

  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onOpenChange, open]);

  function updateCoordinate(axis: "lat" | "lng", rawValue: string) {
    const setInput = axis === "lat" ? setLatitudeInput : setLongitudeInput;
    setInput(rawValue);

    const trimmed = rawValue.trim();
    if (
      !trimmed ||
      trimmed === "-" ||
      trimmed === "." ||
      trimmed === "-."
    ) {
      return;
    }

    const nextValue = Number(trimmed);
    if (Number.isNaN(nextValue)) return;

    const clamped = clampCoordinate(axis, nextValue);
    onMarkerOffsetChange({
      ...markerOffset,
      [axis]: clamped,
    });
  }

  function beginCoordinateEdit(axis: "lat" | "lng") {
    setActiveCoordinateInput(axis);

    if (axis === "lat") {
      setLatitudeInput(formatCoordinate(markerOffset.lat));
    } else {
      setLongitudeInput(formatCoordinate(markerOffset.lng));
    }
  }

  function commitCoordinate(axis: "lat" | "lng") {
    const input = axis === "lat" ? latitudeInput : longitudeInput;
    const trimmed = input.trim();
    if (!trimmed) {
      if (axis === "lat") {
        setLatitudeInput(formatCoordinate(markerOffset.lat));
      } else {
        setLongitudeInput(formatCoordinate(markerOffset.lng));
      }
      setActiveCoordinateInput((current) => (current === axis ? null : current));
      return;
    }

    const nextValue = Number(trimmed);
    if (Number.isNaN(nextValue)) {
      if (axis === "lat") {
        setLatitudeInput(formatCoordinate(markerOffset.lat));
      } else {
        setLongitudeInput(formatCoordinate(markerOffset.lng));
      }
      setActiveCoordinateInput((current) => (current === axis ? null : current));
      return;
    }

    const clamped = clampCoordinate(axis, nextValue);
    onMarkerOffsetChange({
      ...markerOffset,
      [axis]: clamped,
    });

    if (axis === "lat") {
      setLatitudeInput(formatCoordinate(clamped));
    } else {
      setLongitudeInput(formatCoordinate(clamped));
    }

    setActiveCoordinateInput((current) => (current === axis ? null : current));
  }

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-[12px] text-black/50">
        {university?.logo ? (
          <img
            src={university.logo}
            alt={university.shortName}
            className="h-4 w-auto object-contain opacity-50"
          />
        ) : null}
        <span>{university?.name || "No university"}</span>
        <span className="text-black/25">·</span>
        <span>{locationLabel || "Location"}</span>
        <span className="text-black/25">·</span>
        <span>{year}</span>
        {showParticipants && typeof participantsCount === "number" ? (
          <>
            <span className="text-black/25">·</span>
            <span>{participantsCount} participants</span>
          </>
        ) : null}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 sm:p-8"
          onClick={() => onOpenChange(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-settings-title"
            className="flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden border border-black bg-white shadow-[0_24px_60px_rgba(0,0,0,0.18)] sm:max-h-[calc(100vh-4rem)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-black px-5 py-4 sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/45">
                    {entityLabel} settings
                  </p>
                  <h3
                    id="project-settings-title"
                    className="mt-3 font-serif text-2xl leading-none text-black sm:text-[2rem]"
                  >
                    Edit core metadata.
                  </h3>
                  <p className="mt-3 max-w-lg text-sm leading-6 text-black/60">
                    Set the university, year, location, and URL slug here. Adjust the globe
                    position directly on the {entityLabel.toLowerCase()} view while editing.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="shrink-0 border border-black bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-black hover:text-white"
                  aria-label={`Close ${entityLabel.toLowerCase()} settings`}
                >
                  Close
                </button>
              </div>
            </div>

            <div className="overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
              <div className="grid gap-6">
                <label className="flex flex-col gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/45">
                    University
                  </span>
                  <select
                    value={universityId}
                    onChange={(e) => onUniversityChange(e.target.value)}
                    className="border border-black/15 bg-white px-3 py-3 text-sm text-black outline-none transition focus:border-black"
                  >
                    <option value="">Select university</option>
                    {universities.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid gap-4 sm:grid-cols-[minmax(0,0.6fr)_minmax(0,1fr)]">
                  <label className="flex flex-col gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/45">
                      Year
                    </span>
                    <input
                      type="number"
                      value={year}
                      onChange={(e) =>
                        onYearChange(Number(e.target.value) || new Date().getFullYear())
                      }
                      className="border border-black/15 px-3 py-3 text-sm text-black outline-none transition focus:border-black"
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/45">
                      Location label
                    </span>
                    <input
                      value={locationLabel}
                      onChange={(e) => onLocationLabelChange(e.target.value)}
                      className="border border-black/15 px-3 py-3 text-sm text-black outline-none transition focus:border-black"
                      placeholder="City, Country"
                    />
                  </label>
                </div>

                <div className="border border-black/10 bg-[#FBF8F1] px-4 py-4">
                  <div className="mb-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/45">
                      Marker position
                    </p>
                    <p className="mt-2 text-sm leading-6 text-black/58">
                      Type the exact coordinates here to place the marker. Drag
                      the globe on the project page while editing to rotate
                      around that pinned point.
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="flex flex-col gap-2 border border-black/10 bg-white px-3 py-3">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/45">
                        Latitude
                      </span>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.0001"
                        min="-90"
                        max="90"
                        value={
                          activeCoordinateInput === "lat"
                            ? latitudeInput
                            : formatCoordinate(markerOffset.lat)
                        }
                        onFocus={() => beginCoordinateEdit("lat")}
                        onChange={(event) =>
                          updateCoordinate("lat", event.target.value)
                        }
                        onBlur={() => commitCoordinate("lat")}
                        disabled={disabled}
                        className="border border-black/15 px-3 py-3 text-sm text-black outline-none transition focus:border-black disabled:bg-black/[0.03] disabled:text-black/45"
                      />
                    </label>
                    <label className="flex flex-col gap-2 border border-black/10 bg-white px-3 py-3">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/45">
                        Longitude
                      </span>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.0001"
                        min="-180"
                        max="180"
                        value={
                          activeCoordinateInput === "lng"
                            ? longitudeInput
                            : formatCoordinate(markerOffset.lng)
                        }
                        onFocus={() => beginCoordinateEdit("lng")}
                        onChange={(event) =>
                          updateCoordinate("lng", event.target.value)
                        }
                        onBlur={() => commitCoordinate("lng")}
                        disabled={disabled}
                        className="border border-black/15 px-3 py-3 text-sm text-black outline-none transition focus:border-black disabled:bg-black/[0.03] disabled:text-black/45"
                      />
                    </label>
                  </div>
                </div>

                <label className="flex flex-col gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/45">
                    Slug
                  </span>
                  <input
                    value={slug}
                    onChange={(e) => onSlugChange(e.target.value)}
                    className="border border-black/15 px-3 py-3 text-sm text-black outline-none transition focus:border-black"
                    placeholder="project-slug"
                  />
                </label>

                {children ? (
                  <div className="border-t border-black/10 pt-6">
                    {children}
                  </div>
                ) : null}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="border border-black bg-black px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-white hover:text-black"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
