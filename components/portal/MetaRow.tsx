"use client";

import { useEffect, useState } from "react";
import type { ProjectMarkerOffset, University } from "@/types";

interface MetaRowProps {
  slug: string;
  universityId: string;
  year: number;
  participantsCount: number;
  markerOffset: ProjectMarkerOffset;
  locationLabel: string;
  universities: University[];
  onUniversityChange: (universityId: string) => void;
  onYearChange: (year: number) => void;
  onLocationLabelChange: (label: string) => void;
  onSlugChange: (slug: string) => void;
  disabled?: boolean;
}

export default function MetaRow({
  slug,
  universityId,
  year,
  participantsCount,
  markerOffset,
  locationLabel,
  universities,
  onUniversityChange,
  onYearChange,
  onLocationLabelChange,
  onSlugChange,
  disabled = false,
}: MetaRowProps) {
  const [open, setOpen] = useState(false);
  const university = universities.find((u) => u.id === universityId);

  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

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
        <span className="text-black/25">·</span>
        <span>{participantsCount} participants</span>
        {!disabled && (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="ml-1 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-2 text-[11px] font-medium text-black/45 shadow-[0_1px_0_rgba(0,0,0,0.04)] transition hover:border-black/20 hover:bg-black/[0.03] hover:text-black"
            aria-expanded={open}
            aria-label="Project settings"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="shrink-0"
            >
              <path
                d="M6.8 1.6h2.4l.35 1.65c.4.14.77.35 1.12.6l1.58-.66 1.2 2.08-1.23 1.1c.07.41.07.83 0 1.24l1.23 1.1-1.2 2.08-1.58-.66c-.35.25-.72.46-1.12.6L9.2 14.4H6.8l-.35-1.65a4.7 4.7 0 0 1-1.12-.6l-1.58.66-1.2-2.08 1.23-1.1a4.3 4.3 0 0 1 0-1.24l-1.23-1.1 1.2-2.08 1.58.66c.35-.25.72-.46 1.12-.6L6.8 1.6Z"
              />
              <circle cx="8" cy="8" r="2.05" />
            </svg>
            <span>Project settings</span>
          </button>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 sm:p-8"
          onClick={() => setOpen(false)}
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
                    Project settings
                  </p>
                  <h3
                    id="project-settings-title"
                    className="mt-3 font-serif text-2xl leading-none text-black sm:text-[2rem]"
                  >
                    Edit core metadata.
                  </h3>
                  <p className="mt-3 max-w-lg text-sm leading-6 text-black/60">
                    Set the university, year, location, and URL slug here. Adjust the globe
                    position directly on the project view while editing.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="shrink-0 border border-black bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-black hover:text-white"
                  aria-label="Close project settings"
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
                      Globe position
                    </p>
                    <p className="mt-2 text-sm leading-6 text-black/58">
                      Drag the globe on the project page while editing. The marker stays fixed
                      and the coordinates update from that interaction instead of this panel.
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="border border-black/10 bg-white px-3 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/45">
                        Latitude
                      </p>
                      <p className="mt-2 text-sm text-black">
                        {markerOffset.lat.toFixed(4)}
                      </p>
                    </div>
                    <div className="border border-black/10 bg-white px-3 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/45">
                        Longitude
                      </p>
                      <p className="mt-2 text-sm text-black">
                        {markerOffset.lng.toFixed(4)}
                      </p>
                    </div>
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
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
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
