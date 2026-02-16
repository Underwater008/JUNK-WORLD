"use client";

import { motion } from "framer-motion";
import { Project } from "@/types";

interface ProjectCardProps {
  project: Project;
  color: string;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onHover: (id: string | null) => void;
}

export default function ProjectCard({
  project,
  color,
  index,
  isExpanded,
  onToggle,
  onHover,
}: ProjectCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{
        duration: 0.4,
        delay: index * 0.1,
        layout: { duration: 0.3 },
      }}
      onClick={onToggle}
      onMouseEnter={() => onHover(project.id)}
      onMouseLeave={() => onHover(null)}
      className={`
        rounded-xl border cursor-pointer transition-colors
        ${
          isExpanded
            ? "bg-white/8 border-white/15"
            : "bg-white/4 border-white/8 hover:bg-white/6 hover:border-white/12"
        }
      `}
    >
      {/* Compact view */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Color accent line */}
          <div
            className="w-1 h-10 rounded-full shrink-0 mt-0.5"
            style={{ backgroundColor: color }}
          />

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] leading-tight">
              {project.title}
            </h3>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs text-[var(--text-secondary)]">
                {project.year}
              </span>
              <span className="text-[var(--text-secondary)] opacity-30">
                ·
              </span>
              <span className="text-xs text-[var(--text-secondary)]">
                {project.participants} participants
              </span>
            </div>
          </div>

          {/* Expand indicator */}
          <motion.svg
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-[var(--text-secondary)] shrink-0 mt-1"
          >
            <path d="M4 6L8 10L12 6" />
          </motion.svg>
        </div>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.1 }}
          className="px-4 pb-4 pt-0"
        >
          <div className="ml-4 border-l border-white/8 pl-3">
            <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
              {project.description}
            </p>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 mt-3">
              {project.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-[10px] rounded-full font-medium"
                  style={{
                    backgroundColor: `${color}20`,
                    color: color,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* View project button */}
            <button
              className="mt-3 flex items-center gap-1.5 text-xs font-medium transition-opacity hover:opacity-80"
              style={{ color }}
              onClick={(e) => {
                e.stopPropagation();
                // Future: navigate to project terrain page
              }}
            >
              View Project
              <svg
                width="12"
                height="12"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M6 4L10 8L6 12" />
              </svg>
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
