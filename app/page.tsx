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
  const [showAbout, setShowAbout] = useState(true);

  const handleToggleAbout = () => {
    const entering = !showAbout;
    if (entering) {
      setSelectedUniversity(null);
    }
    setShowAbout(entering);
  };

  return (
    <main className="w-screen h-screen overflow-hidden flex flex-col relative">
      <Header showAbout={showAbout} onToggleAbout={handleToggleAbout} />

      {/* JUNK logo — sits in header row, horizontally tracks globe center */}
      <motion.div
        className="absolute top-0 h-14 flex items-center pointer-events-none z-20"
        animate={{
          left: showAbout ? "calc(79% + 176px)" : "calc(50% + 161px)",
        }}
        style={{ x: "-50%" }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      >
        <img
          src="/images/JUNK logos/JUNK-logo.gif"
          alt="JUNK"
          className="h-8"
        />
      </motion.div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel: animated width between sidebar (320px) and about content (55%) */}
        <motion.div
          className="shrink-0 overflow-hidden bg-white"
          initial={false}
          animate={{
            width: showAbout ? "58%" : "320px",
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

        {/* Globe container: fills remaining space, overflow hidden clips right edge */}
        <div className="flex-1 relative bg-white overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 transition-[width] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]"
            style={{ width: showAbout ? "calc(100% + 350px)" : "100%" }}
          >
            <Globe
              universities={universities}
              selectedUniversity={selectedUniversity}
              onSelectUniversity={setSelectedUniversity}
              hoveredProject={hoveredProject}
              compact={showAbout}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
