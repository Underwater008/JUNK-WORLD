"use client";

import { Suspense, useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import ArchiveView from "@/components/ArchiveView";
import Globe from "@/components/Globe";
import Header from "@/components/Header";
import AboutContent from "@/components/AboutContent";
import MembersContent from "@/components/MembersContent";
import MobileLayout from "@/components/MobileLayout";
import { useIsMobile } from "@/hooks/useIsMobile";
import { University } from "@/types";

type View = "about" | "projects" | "members";

function getViewFromParams(params: URLSearchParams): View {
  const v = params.get("view");
  if (v === "consortium" || v === "projects") return "projects";
  if (v === "members") return "members";
  return "about";
}

const panelWidth: Record<View, string> = {
  about: "58%",
  projects: "67%",
  members: "70%",
};

const globePose: Record<View, { x: string; y: string }> = {
  about: { x: "0%", y: "0%" },
  projects: { x: "26%", y: "0%" },
  members: { x: "32%", y: "0%" },
};

const ease = [0.4, 0, 0.2, 1] as const;

function getLogoLeft(poseX: string) {
  return `calc(50% + ${poseX})`;
}

function getAboutGlobePose(panel: string) {
  const panelWidth = Number.parseFloat(panel);
  return { x: `${panelWidth / 2}%`, y: "0%" };
}

function HomeContent({
  universities,
  baseUniversities,
  editorSessionAvailable,
  writesDisabled,
}: {
  universities: University[];
  baseUniversities: University[];
  editorSessionAvailable: boolean;
  writesDisabled: boolean;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [view, setView] = useState<View>(() => getViewFromParams(searchParams));
  const [selectedUniversity, setSelectedUniversity] =
    useState<University | null>(null);
  const [hoveredProject, setHoveredProject] = useState<string | null>(null);
  const [projectPreviewSlug, setProjectPreviewSlug] = useState<string | null>(null);
  const isProjectsView = view === "projects";
  const isMobile = useIsMobile();
  const selectedProjectSlug = searchParams.get("project");

  const projectEntries = useMemo(
    () =>
      universities.flatMap((university) =>
        university.projects.map((project) => ({
          id: project.id,
          slug: project.slug ?? project.id,
          universityId: university.id,
        }))
      ),
    [universities]
  );

  const focusedProject =
    isProjectsView
      ? projectEntries.find(
          (project) =>
            project.slug === selectedProjectSlug ||
            (!selectedProjectSlug && project.slug === projectPreviewSlug)
        ) ?? null
      : null;

  const projectFocusedUniversity =
    focusedProject
      ? universities.find((university) => university.id === focusedProject.universityId) ?? null
      : null;

  const globeSelectedUniversity = isProjectsView
    ? projectFocusedUniversity ?? selectedUniversity
    : selectedUniversity;
  const currentPanelWidth = panelWidth[view];
  const currentGlobePose =
    view === "about" ? getAboutGlobePose(currentPanelWidth) : globePose[view];
  const currentLogoLeft = getLogoLeft(currentGlobePose.x);

  useEffect(() => {
    setView(getViewFromParams(searchParams));
  }, [searchParams]);

  useEffect(() => {
    if (isMobile) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobile]);

  const handleViewChange = useCallback(
    (newView: View) => {
      if (newView === view) return;
      setSelectedUniversity(null);
      setHoveredProject(null);
      setProjectPreviewSlug(null);
      if (view === "projects" || newView === "projects") {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      }
      setView(newView);
      const params = new URLSearchParams(searchParams.toString());

      if (newView === "about") {
        params.delete("view");
        params.delete("project");
        params.delete("edit");
      } else {
        params.set("view", newView);
        if (newView !== "projects") {
          params.delete("project");
          params.delete("edit");
        }
      }

      const nextQuery = params.toString();
      router.replace(nextQuery ? `/?${nextQuery}` : "/", { scroll: false });
    },
    [view, router, searchParams]
  );

  const handleSelectMember = useCallback(
    (universityId: string | undefined) => {
      if (!universityId) {
        setSelectedUniversity(null);
        return;
      }
      const university = universities.find((u) => u.id === universityId) || null;
      setSelectedUniversity(university);
    },
    [universities]
  );

  const isCompact = view !== "projects";

  if (isMobile) {
    return (
      <MobileLayout
        view={view}
        onViewChange={handleViewChange}
        universities={universities}
        baseUniversities={baseUniversities}
        selectedUniversity={selectedUniversity}
        onSelectUniversity={setSelectedUniversity}
        hoveredProject={hoveredProject}
        onSelectMember={handleSelectMember}
        editorSessionAvailable={editorSessionAvailable}
        writesDisabled={writesDisabled}
      />
    );
  }

  return (
    <main
      className="relative flex h-screen w-screen flex-col overflow-hidden bg-[var(--ink-wash-200)]"
    >
      <Header view={view} onViewChange={handleViewChange} />

      <motion.div
        className="pointer-events-none absolute top-0 z-20 flex h-14 items-center"
        initial={false}
        animate={{ left: currentLogoLeft }}
        style={{ x: "-50%" }}
        transition={{ duration: 0.5, ease }}
        aria-hidden={view === "about"}
      >
        <button
          type="button"
          onClick={() => handleViewChange("about")}
          disabled={view === "about"}
          className={`pointer-events-auto cursor-pointer transition-opacity duration-300 ${
            view === "about" ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
          aria-label="Go to About"
        >
          <img
            src="/images/JUNK logos/JUNK-logo.gif"
            alt="JUNK"
            className="h-8"
          />
        </button>
      </motion.div>

      <div className="relative flex flex-1 overflow-hidden">
        <motion.div
          className="absolute inset-0 bg-black"
          initial={false}
          animate={currentGlobePose}
          transition={{ duration: 0.5, ease }}
        >
          <Globe
            universities={universities}
            selectedUniversity={globeSelectedUniversity}
            onSelectUniversity={setSelectedUniversity}
            hoveredProject={
              isProjectsView ? focusedProject?.id ?? null : hoveredProject
            }
            compact={isCompact}
            allowDragInCompact={false}
            hideLabels={false}
            soloLabelId={
              isProjectsView
                ? (projectFocusedUniversity ?? selectedUniversity)?.id
                : undefined
            }
            maxLabels={
              isProjectsView
                ? projectFocusedUniversity || selectedUniversity
                  ? 1
                  : 7
                : undefined
            }
          />
        </motion.div>

        <motion.div
          className="relative z-20 shrink-0 overflow-hidden bg-[var(--ink-wash-200)]"
          initial={false}
          animate={{ width: currentPanelWidth }}
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
            {view === "projects" && (
              <motion.div
                key="archive"
                className="h-full"
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <ArchiveView
                  universities={universities}
                  baseUniversities={baseUniversities}
                  selectedUniversity={selectedUniversity}
                  onSelectUniversity={setSelectedUniversity}
                  onPreviewProjectChange={setProjectPreviewSlug}
                  editorSessionAvailable={editorSessionAvailable}
                  writesDisabled={writesDisabled}
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

      </div>
    </main>
  );
}

export default function HomeShell({
  universities,
  baseUniversities,
  editorSessionAvailable,
  writesDisabled,
}: {
  universities: University[];
  baseUniversities: University[];
  editorSessionAvailable: boolean;
  writesDisabled: boolean;
}) {
  return (
    <Suspense>
      <HomeContent
        universities={universities}
        baseUniversities={baseUniversities}
        editorSessionAvailable={editorSessionAvailable}
        writesDisabled={writesDisabled}
      />
    </Suspense>
  );
}
