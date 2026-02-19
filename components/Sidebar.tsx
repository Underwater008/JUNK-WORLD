"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { University } from "@/types";
import ProjectCard from "./ProjectCard";

interface SidebarProps {
  universities: University[];
  selectedUniversity: University | null;
  onSelect: (uni: University | null) => void;
  onHoverProject: (id: string | null) => void;
}

export default function Sidebar({
  universities,
  selectedUniversity,
  onSelect,
  onHoverProject,
}: SidebarProps) {
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(
    null
  );

  const handleBack = () => {
    setExpandedProjectId(null);
    onSelect(null);
  };

  const handleSelectUniversity = (uni: University) => {
    setExpandedProjectId(null);
    onSelect(uni);
  };

  return (
    <div className="w-[300px] border-r-2 border-black bg-white flex flex-col shrink-0">
      <div className="flex-1 overflow-y-auto sidebar-scroll">
        <AnimatePresence mode="wait">
          {selectedUniversity ? (
            <motion.div
              key={`projects-${selectedUniversity.id}`}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              {/* Back button */}
              <button
                onClick={handleBack}
                className="flex items-center gap-2 px-6 py-4 text-sm text-[#6B6B6B] hover:text-[#171717] transition-colors cursor-pointer font-medium w-full border-b border-[#E5E5E5]"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M10 12L6 8L10 4" />
                </svg>
                Back
              </button>

              {/* University heading */}
              <div className="px-6 py-4 border-b-2 border-black">
                <h2 className="text-base font-semibold text-[#171717]">
                  {selectedUniversity.name}
                </h2>
                <p className="text-xs text-[#6B6B6B] mt-1 font-medium">
                  {selectedUniversity.city}, {selectedUniversity.country}
                </p>
              </div>

              {/* Disciplines */}
              {selectedUniversity.disciplines.length > 0 && (
                <div className="px-6 py-4 border-b border-[#E5E5E5]">
                  <p className="text-[10px] uppercase tracking-[0.1em] text-[#6B6B6B] font-semibold mb-2">
                    Disciplines
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedUniversity.disciplines.map((d) => (
                      <span
                        key={d}
                        className="text-[11px] px-2.5 py-1 bg-[#F5F5F5] text-[#171717] font-medium border border-[#E5E5E5]"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Project cards */}
              {selectedUniversity.projects.length > 0 ? (
                <div className="p-4 flex flex-col gap-3">
                  {selectedUniversity.projects.map((project, i) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      index={i}
                      isExpanded={expandedProjectId === project.id}
                      onToggle={() =>
                        setExpandedProjectId(
                          expandedProjectId === project.id ? null : project.id
                        )
                      }
                      onHover={onHoverProject}
                    />
                  ))}
                </div>
              ) : (
                <div className="px-6 py-8 text-center">
                  <p className="text-xs text-[#6B6B6B]">
                    No projects added yet
                  </p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="universities"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              {universities.map((uni, i) => (
                <motion.button
                  key={uni.id}
                  onClick={() => handleSelectUniversity(uni)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className="w-full flex items-center gap-4 px-6 py-5 text-left border-b border-[#E5E5E5] hover:bg-[#FAFAFA] transition-colors cursor-pointer group"
                >
                  {/* Black dot */}
                  <div className="w-2 h-2 rounded-full bg-black shrink-0" />

                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-[#171717] block">
                      {uni.name}
                    </span>
                    <span className="text-xs text-[#6B6B6B] mt-0.5 block">
                      {uni.city}, {uni.country}
                    </span>
                  </div>

                  {/* Arrow */}
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="#D4D4D4"
                    strokeWidth="2"
                    className="shrink-0 group-hover:stroke-[#171717] transition-colors"
                  >
                    <path d="M6 4L10 8L6 12" />
                  </svg>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
