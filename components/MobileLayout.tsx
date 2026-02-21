"use client";

import { AnimatePresence, motion } from "framer-motion";
import Globe from "@/components/Globe";
import AboutContent from "@/components/AboutContent";
import MembersContent from "@/components/MembersContent";
import Sidebar from "@/components/Sidebar";
import { University } from "@/types";

type View = "about" | "consortium" | "members";

const views: { key: View; label: string }[] = [
  { key: "about", label: "About" },
  { key: "consortium", label: "Consortium" },
  { key: "members", label: "Members" },
];

const globeHeight: Record<View, string> = {
  about: "25vh",
  consortium: "40vh",
  members: "20vh",
};

const globeScale: Record<View, number> = {
  about: 0.7,
  consortium: 0.85,
  members: 0.6,
};

const ease = [0.4, 0, 0.2, 1] as const;

interface MobileLayoutProps {
  view: View;
  onViewChange: (view: View) => void;
  universities: University[];
  selectedUniversity: University | null;
  onSelectUniversity: (uni: University | null) => void;
  hoveredProject: string | null;
  onHoverProject: (id: string | null) => void;
  onSelectMember: (universityId: string | undefined) => void;
}

export default function MobileLayout({
  view,
  onViewChange,
  universities,
  selectedUniversity,
  onSelectUniversity,
  hoveredProject,
  onHoverProject,
  onSelectMember,
}: MobileLayoutProps) {
  return (
    <main className="w-screen h-screen overflow-hidden flex flex-col">
      {/* Header */}
      <header className="h-12 border-b-2 border-black flex items-center justify-between px-5 shrink-0 bg-white">
        <img
          src="/images/JUNK logos/JUNK-logo.gif"
          alt="JUNK"
          className="h-5"
        />
        <nav className="flex items-center gap-4">
          {views.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => onViewChange(key)}
              className={`text-xs font-semibold uppercase tracking-[0.12em] transition-colors cursor-pointer ${
                view === key ? "text-black" : "text-[#888]"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      {/* Globe section — animated height per view */}
      <motion.div
        className="shrink-0 overflow-hidden bg-white border-b-2 border-black"
        initial={false}
        animate={{ height: globeHeight[view] }}
        transition={{ duration: 0.5, ease }}
      >
        <Globe
          universities={universities}
          selectedUniversity={selectedUniversity}
          onSelectUniversity={onSelectUniversity}
          hoveredProject={hoveredProject}
          compact={true}
          allowDragInCompact={view === "consortium"}
          scale={globeScale[view]}
          hideLabels={false}
          maxLabels={view === "about" ? 4 : undefined}
          soloLabelId={view !== "about" && selectedUniversity ? selectedUniversity.id : undefined}
        />
      </motion.div>

      {/* Content area — scrollable, fills remaining space */}
      <div className="flex-1 min-h-0 safe-bottom">
        <AnimatePresence mode="wait">
          {view === "about" && (
            <motion.div
              key="about"
              className="h-full"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <AboutContent />
            </motion.div>
          )}
          {view === "consortium" && (
            <motion.div
              key="sidebar"
              className="h-full"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Sidebar
                universities={universities}
                selectedUniversity={selectedUniversity}
                onSelect={onSelectUniversity}
                onHoverProject={onHoverProject}
              />
            </motion.div>
          )}
          {view === "members" && (
            <motion.div
              key="members"
              className="h-full"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <MembersContent onSelectMember={onSelectMember} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
