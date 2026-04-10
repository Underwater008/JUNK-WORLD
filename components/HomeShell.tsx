"use client";

import { Suspense, useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Globe from "@/components/Globe";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import AboutContent from "@/components/AboutContent";
import MembersContent from "@/components/MembersContent";
import MobileLayout from "@/components/MobileLayout";
import ProjectsView from "@/components/ProjectsView";
import { useIsMobile } from "@/hooks/useIsMobile";
import { University } from "@/types";

type View = "about" | "consortium" | "projects" | "members";

function getViewFromParams(params: URLSearchParams): View {
  const v = params.get("view");
  if (v === "consortium" || v === "projects" || v === "members") return v;
  return "about";
}

const panelWidth: Record<View, string> = {
  about: "58%",
  consortium: "320px",
  projects: "0px",
  members: "70%",
};

const logoLeft: Record<View, string> = {
  about: "calc(79% + 176px)",
  consortium: "calc(50% + 161px)",
  projects: "50%",
  members: "calc(85% + 0px)",
};

const globeContainerWidth: Record<View, string> = {
  about: "calc(100% + 350px)",
  consortium: "100%",
  projects: "100%",
  members: "100%",
};

const ease = [0.4, 0, 0.2, 1] as const;
const projectsGlobeBandHeight = "38vh";

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
  const [projectsEntering, setProjectsEntering] = useState(false);
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

  useEffect(() => {
    setView(getViewFromParams(searchParams));
  }, [searchParams]);

  useEffect(() => {
    if (!isProjectsView) {
      setProjectsEntering(false);
      return;
    }

    setProjectsEntering(true);
    const timeoutId = window.setTimeout(() => {
      setProjectsEntering(false);
    }, 420);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isProjectsView]);

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

  const isCompact = view !== "consortium";

  if (isMobile) {
    return (
      <MobileLayout
        view={view}
        onViewChange={handleViewChange}
        universities={universities}
        selectedUniversity={selectedUniversity}
        onSelectUniversity={setSelectedUniversity}
        hoveredProject={hoveredProject}
        onHoverProject={setHoveredProject}
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

      <div className="flex flex-1 overflow-hidden">
        <motion.div
          className="shrink-0 overflow-hidden bg-[#F4F0E8]"
          initial={false}
          animate={{ width: panelWidth[view] }}
          transition={{ duration: 0.5, ease }}
          style={{ borderRight: isProjectsView ? "0px solid transparent" : "2px solid black" }}
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

        <div className="relative flex-1 overflow-hidden bg-[#F4F0E8]">
          <motion.div
            className={`absolute right-0 top-0 overflow-hidden ${
              isProjectsView ? "border-b-2 border-black" : ""
            }`}
            initial={false}
            animate={{
              width: isProjectsView ? "100%" : globeContainerWidth[view],
              height: isProjectsView ? projectsGlobeBandHeight : "100%",
            }}
            transition={{
              width: { duration: 0.5, ease },
              height: {
                duration: 0.52,
                ease,
                delay: isProjectsView && projectsEntering ? 0.08 : 0,
              },
            }}
            style={{ left: "auto" }}
          >
            <Globe
              universities={universities}
              selectedUniversity={
                isProjectsView ? projectFocusedUniversity : selectedUniversity
              }
              onSelectUniversity={setSelectedUniversity}
              hoveredProject={
                isProjectsView ? focusedProject?.id ?? null : hoveredProject
              }
              compact={isProjectsView ? true : isCompact}
              allowDragInCompact={isProjectsView}
              scale={isProjectsView ? (focusedProject ? 1.22 : 1.02) : undefined}
              hideLabels={false}
              soloLabelId={isProjectsView ? projectFocusedUniversity?.id : undefined}
              maxLabels={isProjectsView ? (projectFocusedUniversity ? 1 : 7) : undefined}
            />
          </motion.div>

          {isProjectsView ? (
            <motion.div
              className="absolute inset-x-0 bottom-0 overflow-y-auto"
              initial={false}
              animate={{
                opacity: projectsEntering ? 0 : 1,
              }}
              transition={{
                duration: 0.22,
                ease: "easeOut",
                delay: projectsEntering ? 0 : 0.08,
              }}
              style={{
                top: projectsGlobeBandHeight,
                pointerEvents: projectsEntering ? "none" : "auto",
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
          ) : null}
        </div>
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
