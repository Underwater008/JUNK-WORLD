"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Globe from "@/components/Globe";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import AboutContent from "@/components/AboutContent";
import MembersContent from "@/components/MembersContent";
import { universities as rawUniversities } from "@/data/mock";
import { University } from "@/types";

type View = "about" | "consortium" | "members";

const universities = [...rawUniversities].sort((a, b) => {
  const aActive = a.status !== "inactive";
  const bActive = b.status !== "inactive";
  if (aActive !== bActive) return aActive ? -1 : 1;
  return a.name.localeCompare(b.name);
});

function getViewFromParams(params: URLSearchParams): View {
  const v = params.get("view");
  if (v === "consortium" || v === "members") return v;
  return "about";
}

const panelWidth: Record<View, string> = {
  about: "58%",
  consortium: "320px",
  members: "70%",
};

const logoLeft: Record<View, string> = {
  about: "calc(79% + 176px)",
  consortium: "calc(50% + 161px)",
  members: "calc(85% + 175px)",
};

const globeContainerWidth: Record<View, string> = {
  about: "calc(100% + 350px)",
  consortium: "100%",
  members: "calc(100% + 350px)",
};

const ease = [0.4, 0, 0.2, 1] as const;

export default function Home() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [view, setView] = useState<View>(() => getViewFromParams(searchParams));
  const [selectedUniversity, setSelectedUniversity] =
    useState<University | null>(null);
  const [hoveredProject, setHoveredProject] = useState<string | null>(null);

  // Sync view from URL changes (e.g. browser back/forward)
  useEffect(() => {
    setView(getViewFromParams(searchParams));
  }, [searchParams]);

  const handleViewChange = useCallback(
    (newView: View) => {
      if (newView === view) return;
      setSelectedUniversity(null);
      setView(newView);
      const url = newView === "about" ? "/" : `/?view=${newView}`;
      router.replace(url, { scroll: false });
    },
    [view, router]
  );

  const handleSelectMember = useCallback(
    (universityId: string | undefined) => {
      if (!universityId) {
        setSelectedUniversity(null);
        return;
      }
      const uni = universities.find((u) => u.id === universityId) || null;
      setSelectedUniversity(uni);
    },
    []
  );

  const isCompact = view !== "consortium";

  return (
    <main className="w-screen h-screen overflow-hidden flex flex-col relative">
      <Header view={view} onViewChange={handleViewChange} />

      {/* JUNK logo — sits in header row, horizontally tracks globe center */}
      <motion.div
        className="absolute top-0 h-14 flex items-center pointer-events-none z-20"
        initial={false}
        animate={{ left: logoLeft[view] }}
        style={{ x: "-50%" }}
        transition={{ duration: 0.5, ease }}
      >
        <img
          src="/images/JUNK logos/JUNK-logo.gif"
          alt="JUNK"
          className="h-8"
        />
      </motion.div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel: animated width between views */}
        <motion.div
          className="shrink-0 overflow-hidden bg-white"
          initial={false}
          animate={{ width: panelWidth[view] }}
          transition={{ duration: 0.5, ease }}
          style={{ borderRight: "2px solid black" }}
        >
          <AnimatePresence mode="wait">
            {view === "about" && (
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
            )}
            {view === "consortium" && (
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
            {view === "members" && (
              <motion.div
                key="members"
                className="h-full"
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.35, ease: "easeOut", delay: 0.15 }}
              >
                <MembersContent onSelectMember={handleSelectMember} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Globe container: fills remaining space, overflow hidden clips right edge */}
        <div className="flex-1 relative bg-white overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 transition-[width] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]"
            style={{ width: globeContainerWidth[view] }}
          >
            <Globe
              universities={universities}
              selectedUniversity={selectedUniversity}
              onSelectUniversity={setSelectedUniversity}
              hoveredProject={hoveredProject}
              compact={isCompact}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
