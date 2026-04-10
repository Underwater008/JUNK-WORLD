"use client";

import { AnimatePresence, motion } from "framer-motion";
import Globe from "@/components/Globe";
import AboutContent from "@/components/AboutContent";
import MembersContent from "@/components/MembersContent";
import ProjectsView from "@/components/ProjectsView";
import Sidebar from "@/components/Sidebar";
import { University } from "@/types";

type View = "about" | "consortium" | "projects" | "members";

const views: { key: View; label: string }[] = [
  { key: "about", label: "About" },
  { key: "consortium", label: "Consortium" },
  { key: "projects", label: "Projects" },
  { key: "members", label: "Members" },
];

const globeHeight: Record<View, string> = {
  about: "25vh",
  consortium: "40vh",
  projects: "0px",
  members: "20vh",
};

const globeScale: Record<View, number> = {
  about: 0.7,
  consortium: 0.85,
  projects: 0.8,
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
  editorSessionAvailable: boolean;
  writesDisabled: boolean;
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
  editorSessionAvailable,
  writesDisabled,
}: MobileLayoutProps) {
  if (view === "projects") {
    return (
      <main className="w-screen h-screen overflow-hidden flex flex-col bg-[#F4F0E8]">
        <header className="h-12 border-b-2 border-black flex items-center justify-between px-4 shrink-0 bg-[#F4F0E8]">
          <img
            src="/images/JUNK logos/JUNK-logo.gif"
            alt="JUNK"
            className="h-5"
          />
          <nav className="flex items-center gap-3 overflow-x-auto">
            {views.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => onViewChange(key)}
                className={`text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors cursor-pointer ${
                  view === key ? "text-black" : "text-[#888]"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto safe-bottom">
          <ProjectsView
            universities={universities}
            mobile
            editorSessionAvailable={editorSessionAvailable}
            writesDisabled={writesDisabled}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="w-screen h-screen overflow-hidden flex flex-col bg-[#F4F0E8]">
      {/* Header */}
      <header className="h-12 border-b-2 border-black flex items-center justify-between px-4 shrink-0 bg-[#F4F0E8]">
        <img
          src="/images/JUNK logos/JUNK-logo.gif"
          alt="JUNK"
          className="h-5"
        />
        <nav className="flex items-center gap-3 overflow-x-auto">
          {views.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => onViewChange(key)}
              className={`text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors cursor-pointer ${
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
        style={{ backgroundColor: "#F4F0E8" }}
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
          maxLabels={view === "about" ? 4 : view === "consortium" ? 5 : undefined}
          soloLabelId={
            view === "members"
              ? (selectedUniversity?.id ?? "__none__")
              : view === "consortium" && selectedUniversity
                ? selectedUniversity.id
                : undefined
          }
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
