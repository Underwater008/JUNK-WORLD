"use client";

import { motion } from "framer-motion";

export interface ProjectCardData {
  slug: string;
  title: string;
  thumbnail: string;
  year: number;
  tags: string[];
  locationLabel: string;
  shortName: string;
  color: string;
  logo?: string;
  status?: "draft" | "published";
  hasUnpublishedChanges?: boolean;
}

interface ProjectCardDisplayProps {
  project: ProjectCardData;
  index: number;
  onSelect: () => void;
  onPreview?: () => void;
  onPreviewEnd?: () => void;
  onDelete?: () => void;
  deletePending?: boolean;
  showBadges?: boolean;
  isActive?: boolean;
  isSuppressed?: boolean;
}

export default function ProjectCardDisplay({
  project,
  index,
  onSelect,
  onPreview,
  onPreviewEnd,
  onDelete,
  deletePending = false,
  showBadges = false,
  isActive = false,
  isSuppressed = false,
}: ProjectCardDisplayProps) {
  const hasThumbnail = Boolean(project.thumbnail);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{
        opacity: isSuppressed ? 0 : 1,
        y: 0,
        scale: isSuppressed ? 0.985 : 1,
      }}
      transition={{
        opacity: { duration: 0.22, ease: [0.22, 1, 0.36, 1], delay: index * 0.035 },
        y: { duration: 0.35, delay: index * 0.035 },
        scale: { duration: 0.22, ease: [0.22, 1, 0.36, 1], delay: index * 0.035 },
      }}
      onMouseEnter={onPreview}
      onMouseLeave={onPreviewEnd}
      style={{ pointerEvents: isSuppressed ? "none" : "auto" }}
      className={`group relative flex flex-col overflow-hidden border border-black text-left transition-all ${
        isActive
          ? "z-10 -translate-y-[2px] shadow-[4px_4px_0_#000]"
          : "hover:-translate-y-[2px] hover:shadow-[4px_4px_0_#000]"
      } ${isSuppressed ? "shadow-none" : ""}`}
    >
      {onDelete ? (
        <div className="pointer-events-none absolute right-3 top-3 z-20 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
            disabled={deletePending}
            className="pointer-events-auto border border-red-600 bg-white px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-red-600 transition hover:bg-red-600 hover:text-white disabled:opacity-40"
          >
            {deletePending ? "Deleting..." : "Delete"}
          </button>
        </div>
      ) : null}

      <button
        type="button"
        onClick={onSelect}
        onFocus={onPreview}
        onBlur={onPreviewEnd}
        className="flex h-full w-full flex-col overflow-hidden text-left"
      >
        {/* Image area */}
        <div className="relative aspect-[16/9] w-full overflow-hidden border-b border-black">
          {hasThumbnail ? (
            <img
              src={project.thumbnail}
              alt={project.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-[#F4F0E8]" />
          )}
        </div>

        {/* Text content */}
        <div className="flex flex-1 flex-col bg-white p-3">
          <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[var(--ink-wash-700)]">
            {project.shortName} / {project.year}
          </p>

          <h3
            className="mt-1.5 overflow-hidden font-serif text-[1.05rem] leading-[1] text-black"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {project.title}
          </h3>

          <div className="mt-auto flex items-end justify-between gap-2 pt-3">
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--ink-wash-700)]">
              {project.locationLabel}
            </p>
            {project.logo ? (
              <img src={project.logo} alt="" className="h-6 w-auto shrink-0 object-contain" />
            ) : null}
          </div>

          {/* Status badges */}
          {showBadges && (project.status === "draft" || project.hasUnpublishedChanges) && (
            <div className="mt-2 flex gap-1">
              {project.status === "draft" && (
                <span className="border border-black px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.14em] text-black">
                  Draft
                </span>
              )}
              {project.hasUnpublishedChanges && (
                <span className="border border-black bg-black px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.14em] text-white">
                  Unsaved
                </span>
              )}
            </div>
          )}
        </div>
      </button>
    </motion.div>
  );
}
