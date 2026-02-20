"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Globe from "@/components/Globe";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import AboutContent from "@/components/AboutContent";
import { universities as rawUniversities } from "@/data/mock";
import { University } from "@/types";

const universities = [...rawUniversities].sort((a, b) =>
  a.name.localeCompare(b.name)
);

export default function Home() {
  const [selectedUniversity, setSelectedUniversity] =
    useState<University | null>(null);
  const [hoveredProject, setHoveredProject] = useState<string | null>(null);
  const [showAbout, setShowAbout] = useState(false);

  const handleToggleAbout = () => {
    const entering = !showAbout;
    if (entering) {
      setSelectedUniversity(null);
    }
    setShowAbout(entering);
  };

  return (
    <main className="w-screen h-screen overflow-hidden flex flex-col">
      <Header showAbout={showAbout} onToggleAbout={handleToggleAbout} />

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel: animated width between sidebar (320px) and about content (55%) */}
        <motion.div
          className="shrink-0 overflow-hidden bg-white"
          animate={{
            width: showAbout ? "55%" : "320px",
          }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          style={{ borderRight: "2px solid black" }}
        >
          <AnimatePresence mode="wait">
            {showAbout ? (
              <motion.div
                key="about"
                className="h-full"
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.35, ease: "easeOut", delay: 0.15 }}
              >
                <AboutContent />
              </motion.div>
            ) : (
              <motion.div
                key="sidebar"
                className="h-full"
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <Sidebar
                  universities={universities}
                  selectedUniversity={selectedUniversity}
                  onSelect={setSelectedUniversity}
                  onHoverProject={setHoveredProject}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Globe container: fills remaining space */}
        <div className="flex-1 relative bg-white">
          <Globe
            universities={universities}
            selectedUniversity={selectedUniversity}
            onSelectUniversity={setSelectedUniversity}
            hoveredProject={hoveredProject}
            compact={showAbout}
          />
        </div>
      </div>
    </main>
  );
}
