"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { University } from "@/types";
import ProjectCard from "./ProjectCard";

interface ProjectPanelProps {
  university: University | null;
  hoveredProject: string | null;
  onHoverProject: (id: string | null) => void;
}

export default function ProjectPanel({
  university,
  hoveredProject,
  onHoverProject,
}: ProjectPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Reset expanded card when university changes
  const handleToggle = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <AnimatePresence mode="wait">
      {university && (
        <motion.div
          key={university.id}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 40 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
            mass: 0.8,
          }}
          className="absolute right-0 top-0 bottom-0 z-20 flex flex-col justify-center pr-8 pointer-events-none"
        >
          <div className="pointer-events-auto w-80 max-h-[70vh] overflow-y-auto rounded-2xl bg-[var(--bg-panel)] backdrop-blur-xl border border-white/8 shadow-2xl">
            {/* Header */}
            <div className="p-5 pb-3 border-b border-white/6">
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: university.color,
                    boxShadow: `0 0 12px ${university.color}60`,
                  }}
                />
                <div>
                  <h2 className="text-base font-semibold text-[var(--text-primary)]">
                    {university.shortName}
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    {university.name}
                  </p>
                </div>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-2 opacity-60">
                {university.projects.length} projects · {university.country}
              </p>
            </div>

            {/* Project cards */}
            <div className="p-3 flex flex-col gap-2">
              <AnimatePresence>
                {university.projects.map((project, i) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    color={university.color}
                    index={i}
                    isExpanded={expandedId === project.id}
                    onToggle={() => handleToggle(project.id)}
                    onHover={onHoverProject}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
