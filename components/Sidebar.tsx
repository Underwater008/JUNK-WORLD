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
    <div className="flex h-full w-full flex-col bg-[#F4F0E8]">
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
                  className="flex w-full cursor-pointer items-center gap-2 border-b border-black/10 px-6 py-4 text-xs font-semibold uppercase tracking-wider text-[#888] transition-colors hover:bg-[#EFE8DA] hover:text-black"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M10 12L6 8L10 4" />
                </svg>
                Back
              </button>

              {/* University heading */}
                <div className="border-b-2 border-black px-6 py-5">
                <h2 className="text-base font-bold text-black leading-tight">
                  {selectedUniversity.name}
                </h2>
                <p className="text-xs text-[#888] mt-1.5 font-medium">
                  {selectedUniversity.city}, {selectedUniversity.country}
                </p>
              </div>

              {/* Disciplines */}
              {selectedUniversity.disciplines.length > 0 && (
                <div className="border-b border-black/10 px-6 py-4">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-[#888] font-bold mb-2">
                    Disciplines
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedUniversity.disciplines.map((d) => (
                      <span
                        key={d}
                        className="border border-black/15 bg-[#FBF6EC] px-2.5 py-1 text-[11px] font-medium text-black"
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
                      onToggle={() => {
                        const newId = expandedProjectId === project.id ? null : project.id;
                        setExpandedProjectId(newId);
                        onHoverProject(newId);
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="px-6 py-8 text-center">
                  <p className="text-xs text-[#AAA] font-medium">
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
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                  className="group flex w-full cursor-pointer items-center gap-4 border-b border-black/10 px-6 py-5 text-left transition-colors hover:bg-[#EFE8DA]"
                >
                  {/* University logo */}
                  {uni.logo ? (
                    <img
                      src={uni.logo}
                      alt={uni.shortName}
                      className="w-8 h-8 object-contain shrink-0"
                    />
                  ) : (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E7DDCA] text-[10px] font-bold text-[#888]">
                      {uni.shortName}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-black block leading-tight">
                      {uni.name}
                    </span>
                    <span className="text-xs text-[#888] mt-0.5 block font-medium">
                      {uni.city}, {uni.country}
                    </span>
                  </div>

                  {/* Arrow */}
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="#CCC"
                    strokeWidth="2.5"
                    className="shrink-0 group-hover:stroke-black transition-colors"
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
