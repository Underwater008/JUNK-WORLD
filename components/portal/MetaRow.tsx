"use client";

import { useState, useRef, useEffect } from "react";
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
  onParticipantsChange: (count: number) => void;
  onMarkerOffsetChange: (markerOffset: ProjectMarkerOffset) => void;
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
  onParticipantsChange,
  onMarkerOffsetChange,
  onLocationLabelChange,
  onSlugChange,
  disabled = false,
}: MetaRowProps) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const university = universities.find((u) => u.id === universityId);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  return (
    <div className="relative" ref={popoverRef}>
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
        <div className="absolute left-0 top-full z-50 mt-3 w-[min(30rem,calc(100vw-3rem))] rounded-2xl border border-black/10 bg-white p-4 shadow-[0_20px_45px_rgba(0,0,0,0.12)]">
          <div className="mb-4 flex items-start justify-between gap-4 border-b border-black/8 pb-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/35">
                Project settings
              </p>
              <p className="mt-1 text-xs leading-5 text-black/45">
                Core metadata lives here so it stays out of the way while writing.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-2 text-black/30 transition hover:bg-black/5 hover:text-black/60"
              aria-label="Close project settings"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              >
                <path d="M2 2L10 10" />
                <path d="M10 2L2 10" />
              </svg>
            </button>
          </div>
          <div className="space-y-4">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-black/40">
                University
              </span>
              <select
                value={universityId}
                onChange={(e) => onUniversityChange(e.target.value)}
                className="rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none focus:border-black/30"
              >
                <option value="">Select university</option>
                {universities.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-black/40">
                  Year
                </span>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => onYearChange(Number(e.target.value) || new Date().getFullYear())}
                  className="rounded-md border border-black/10 px-3 py-2 text-sm text-black outline-none focus:border-black/30"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-black/40">
                  Participants
                </span>
                <input
                  type="number"
                  min={0}
                  value={participantsCount}
                  onChange={(e) => onParticipantsChange(Number(e.target.value) || 0)}
                  className="rounded-md border border-black/10 px-3 py-2 text-sm text-black outline-none focus:border-black/30"
                />
              </label>
            </div>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-black/40">
                Location
              </span>
              <input
                value={locationLabel}
                onChange={(e) => onLocationLabelChange(e.target.value)}
                className="rounded-md border border-black/10 px-3 py-2 text-sm text-black outline-none focus:border-black/30"
                placeholder="City, Country"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-black/40">
                  Latitude
                </span>
                <input
                  type="number"
                  step="0.0001"
                  value={markerOffset.lat}
                  onChange={(e) =>
                    onMarkerOffsetChange({
                      ...markerOffset,
                      lat: Number(e.target.value) || 0,
                    })
                  }
                  className="rounded-md border border-black/10 px-3 py-2 text-sm text-black outline-none focus:border-black/30"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-black/40">
                  Longitude
                </span>
                <input
                  type="number"
                  step="0.0001"
                  value={markerOffset.lng}
                  onChange={(e) =>
                    onMarkerOffsetChange({
                      ...markerOffset,
                      lng: Number(e.target.value) || 0,
                    })
                  }
                  className="rounded-md border border-black/10 px-3 py-2 text-sm text-black outline-none focus:border-black/30"
                />
              </label>
            </div>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-black/40">
                Slug
              </span>
              <input
                value={slug}
                onChange={(e) => onSlugChange(e.target.value)}
                className="rounded-md border border-black/10 px-3 py-2 text-sm text-black outline-none focus:border-black/30"
                placeholder="project-slug"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
