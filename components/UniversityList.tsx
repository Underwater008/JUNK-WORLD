"use client";

import { motion, AnimatePresence } from "framer-motion";
import { University } from "@/types";

interface UniversityListProps {
  universities: University[];
  selectedUniversity: University | null;
  onSelect: (uni: University | null) => void;
}

export default function UniversityList({
  universities,
  selectedUniversity,
  onSelect,
}: UniversityListProps) {
  return (
    <motion.div
      className="absolute left-0 top-0 bottom-0 z-20 flex flex-col justify-center pl-8 pointer-events-none"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
    >
      <div className="pointer-events-auto">
        {/* Back button when university selected */}
        <AnimatePresence>
          {selectedUniversity && (
            <motion.button
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.3 }}
              onClick={() => onSelect(null)}
              className="flex items-center gap-2 mb-6 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M10 12L6 8L10 4" />
              </svg>
              All Universities
            </motion.button>
          )}
        </AnimatePresence>

        {/* University list */}
        <div className="flex flex-col gap-1">
          {universities.map((uni, i) => {
            const isSelected = selectedUniversity?.id === uni.id;
            const isOther =
              selectedUniversity && selectedUniversity.id !== uni.id;

            return (
              <motion.button
                key={uni.id}
                onClick={() =>
                  onSelect(isSelected ? null : uni)
                }
                initial={{ opacity: 0, x: -20 }}
                animate={{
                  opacity: isOther ? 0.25 : 1,
                  x: 0,
                  scale: isSelected ? 1.02 : 1,
                }}
                transition={{
                  duration: 0.4,
                  delay: isOther ? 0 : i * 0.05,
                }}
                className={`
                  flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-all cursor-pointer
                  ${isSelected ? "bg-white/10 backdrop-blur-sm" : "hover:bg-white/5"}
                `}
              >
                {/* Color dot */}
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0 transition-shadow duration-300"
                  style={{
                    backgroundColor: uni.color,
                    boxShadow: isSelected
                      ? `0 0 12px ${uni.color}80`
                      : "none",
                  }}
                />

                {/* Name */}
                <div className="flex flex-col">
                  <span
                    className={`text-sm font-medium transition-colors ${
                      isSelected
                        ? "text-[var(--text-primary)]"
                        : "text-[var(--text-secondary)]"
                    }`}
                  >
                    {uni.shortName}
                  </span>
                  {isSelected && (
                    <motion.span
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="text-xs text-[var(--text-secondary)] mt-0.5"
                    >
                      {uni.country}
                    </motion.span>
                  )}
                </div>

                {/* Project count */}
                <span className="ml-auto text-xs text-[var(--text-secondary)] opacity-60">
                  {uni.projects.length}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
