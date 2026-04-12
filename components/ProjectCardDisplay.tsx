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
  showBadges?: boolean;
  isActive?: boolean;
}

export default function ProjectCardDisplay({
  project,
  index,
  onSelect,
  onPreview,
  onPreviewEnd,
  showBadges = false,
  isActive = false,
}: ProjectCardDisplayProps) {
  const hasThumbnail = Boolean(project.thumbnail);

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.035 }}
      onClick={onSelect}
      onMouseEnter={onPreview}
      onMouseLeave={onPreviewEnd}
      onFocus={onPreview}
      onBlur={onPreviewEnd}
      className={`group relative flex flex-col overflow-hidden border border-black text-left transition-all ${
        isActive
          ? "translate-x-[1px] translate-y-[1px] shadow-[2px_2px_0_#000]"
          : "hover:-translate-y-[2px] hover:shadow-[4px_4px_0_#000]"
      }`}
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
          <div
            className="h-[2px] w-8 shrink-0"
            style={{ backgroundColor: project.color }}
          />
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
    </motion.button>
  );
}
