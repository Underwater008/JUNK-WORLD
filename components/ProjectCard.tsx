"use client";

import { motion } from "framer-motion";
import { Project } from "@/types";

interface ProjectCardProps {
  project: Project;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onHover: (id: string | null) => void;
}

export default function ProjectCard({
  project,
  index,
  isExpanded,
  onToggle,
  onHover,
}: ProjectCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{
        duration: 0.3,
        delay: index * 0.08,
        layout: { duration: 0.25 },
      }}
      onClick={onToggle}
      onMouseEnter={() => onHover(project.id)}
      onMouseLeave={() => onHover(null)}
      className={`
        border-2 border-black cursor-pointer transition-colors duration-200
        ${isExpanded ? "bg-black text-white" : "bg-white hover:bg-[#FAFAFA]"}
      `}
    >
      {/* Compact view */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3
              className={`text-sm font-bold leading-tight ${
                isExpanded ? "text-white" : "text-black"
              }`}
            >
              {project.title}
            </h3>
            <div className="flex items-center gap-2 mt-1.5">
              <span
                className={`text-xs font-medium ${
                  isExpanded ? "text-white/60" : "text-[#888]"
                }`}
              >
                {project.year}
              </span>
              <span className={isExpanded ? "text-white/30" : "text-[#CCC]"}>
                ·
              </span>
              <span
                className={`text-xs font-medium ${
                  isExpanded ? "text-white/60" : "text-[#888]"
                }`}
              >
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
            strokeWidth="2.5"
            className={`shrink-0 mt-0.5 ${
              isExpanded ? "text-white/60" : "text-[#888]"
            }`}
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
          className="px-4 pb-4"
        >
          <p className="text-xs leading-relaxed text-white/70 font-medium">
            {project.description}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {project.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-[10px] font-semibold border border-white/30 text-white/80 uppercase tracking-wide"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* View project */}
          <button
            className="mt-3 flex items-center gap-1.5 text-xs font-bold text-white hover:text-white/80 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            View Project
            <svg
              width="12"
              height="12"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M6 4L10 8L6 12" />
            </svg>
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
