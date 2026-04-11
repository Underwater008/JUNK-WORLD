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
import ProjectsView from "@/components/ProjectsView";
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
  about: { x: "18%", y: "0%" },
  projects: { x: "26%", y: "0%" },
  members: { x: "32%", y: "0%" },
};

const ease = [0.4, 0, 0.2, 1] as const;
const projectsGlobeBandHeight = "38vh";
const projectsEditorPose = { x: "14%", y: "-24%" };

function getLogoLeft(poseX: string) {
  return `calc(50% + ${poseX})`;
}

function HomeContent({
  universities,
  editorSessionAvailable,
  writesDisabled,
}: {
  universities: University[];
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
  const editRequested = searchParams.get("edit") === "1";
  const isProjectsEditView = isProjectsView && editRequested;
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
  const currentPanelWidth = isProjectsEditView ? "0px" : panelWidth[view];
  const currentGlobePose = isProjectsEditView ? projectsEditorPose : globePose[view];
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
      className="relative flex h-screen w-screen flex-col overflow-hidden bg-[#F4F0E8]"
    >
      <Header view={view} onViewChange={handleViewChange} />

      <motion.div
        className="pointer-events-none absolute top-0 z-20 flex h-14 items-center"
        initial={false}
        animate={{ left: currentLogoLeft }}
        style={{ x: "-50%" }}
        transition={{ duration: 0.5, ease }}
      >
        <img
          src="/images/JUNK logos/JUNK-logo.gif"
          alt="JUNK"
          className="h-8"
        />
      </motion.div>

      <div className="relative flex flex-1 overflow-hidden">
        <motion.div
          className="absolute inset-0"
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
            compact={isProjectsEditView ? true : isCompact}
            allowDragInCompact={isProjectsEditView}
            scale={
              isProjectsEditView
                ? focusedProject
                  ? 1.08
                  : 1.0
                : undefined
            }
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
          className="relative z-20 shrink-0 overflow-hidden bg-[#F4F0E8]"
          initial={false}
          animate={{ width: currentPanelWidth }}
          transition={{ duration: 0.5, ease }}
          style={{ borderRight: isProjectsEditView ? "0px solid transparent" : "2px solid black" }}
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
            {view === "projects" && !isProjectsEditView && (
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
                  selectedUniversity={selectedUniversity}
                  onSelectUniversity={setSelectedUniversity}
                  onPreviewProjectChange={setProjectPreviewSlug}
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

        {isProjectsEditView ? (
          <div className="relative z-10 flex-1 overflow-hidden">
            <motion.div
              className="absolute inset-x-0 bottom-0 overflow-y-auto border-t-2 border-black bg-[#F4F0E8]"
              initial={false}
              animate={{
                opacity: 1,
              }}
              transition={{
                duration: 0.24,
                ease: "easeOut",
              }}
              style={{
                top: projectsGlobeBandHeight,
              }}
            >
              <ProjectsView
                universities={universities}
                editorSessionAvailable={editorSessionAvailable}
                writesDisabled={writesDisabled}
                showGlobe={false}
                onPreviewProjectChange={setProjectPreviewSlug}
              />
            </motion.div>
          </div>
        ) : null}
      </div>
    </main>
  );
}

export default function HomeShell({
  universities,
  editorSessionAvailable,
  writesDisabled,
}: {
  universities: University[];
  editorSessionAvailable: boolean;
  writesDisabled: boolean;
}) {
  return (
    <Suspense>
      <HomeContent
        universities={universities}
        editorSessionAvailable={editorSessionAvailable}
        writesDisabled={writesDisabled}
      />
    </Suspense>
  );
}
