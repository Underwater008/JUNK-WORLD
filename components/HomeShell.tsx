"use client";

import {
  Suspense,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ChangeEvent,
  type MutableRefObject,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import ArchiveView, {
  type SelectedProjectStageController,
  type SelectedProjectStageSnapshot,
} from "@/components/ArchiveView";
import Globe from "@/components/Globe";
import Header from "@/components/Header";
import AboutContent from "@/components/AboutContent";
import MembersContent from "@/components/MembersContent";
import MobileLayout from "@/components/MobileLayout";
import { useIsMobile } from "@/hooks/useIsMobile";
import type { University } from "@/types";

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

function getLogoLeft(panel: string) {
  const p = Number.parseFloat(panel);
  const center = p + (100 - p) / 2;
  return `${center}%`;
}

function getAboutGlobePose(panel: string) {
  const panelWidth = Number.parseFloat(panel);
  return { x: `${panelWidth / 2}%`, y: "0%" };
}

function ProjectStageGallery({
  project,
  editable = false,
  selectedProjectStageControllerRef,
}: {
  project: SelectedProjectStageSnapshot;
  editable?: boolean;
  selectedProjectStageControllerRef?: MutableRefObject<SelectedProjectStageController | null>;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const galleryLength = project.gallery.length;
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (galleryLength < 2) return;

    const intervalId = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % galleryLength);
    }, 4200);

    return () => window.clearInterval(intervalId);
  }, [galleryLength]);

  useEffect(() => {
    if (!galleryLength) {
      setActiveIndex(0);
      return;
    }

    setActiveIndex((current) => Math.min(current, galleryLength - 1));
  }, [galleryLength, project.slug]);

  useEffect(() => {
    if (!uploadError) return;

    const timeoutId = window.setTimeout(() => setUploadError(""), 3200);
    return () => window.clearTimeout(timeoutId);
  }, [uploadError]);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (!files.length || !editable || !selectedProjectStageControllerRef?.current) {
      return;
    }

    setUploading(true);
    setUploadError("");

    try {
      await selectedProjectStageControllerRef.current.uploadGalleryFiles(files);
    } catch {
      setUploadError("Gallery upload failed.");
    } finally {
      setUploading(false);
    }
  }

  if (!galleryLength) {
    return (
      <div className="relative z-20 h-full min-h-0 overflow-visible bg-[#050505]">
        {editable ? (
          <div className="absolute inset-x-0 bottom-8 z-30 flex justify-center px-6">
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="border border-white/18 bg-[#050505] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-white transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
              >
                {uploading ? "Uploading..." : "Add gallery images"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(event) => void handleFileChange(event)}
              />
              {uploadError ? (
                <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/70">
                  {uploadError}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  const currentItem = project.gallery[activeIndex] ?? project.gallery[0];
  const controlsTopClass = editable ? "top-14" : "top-10";
  const frameTopClass = editable ? "top-36" : "top-28";

  return (
    <div className="relative z-20 h-full min-h-0 overflow-visible bg-[#050505]">
      {editable ? (
        <div className={`absolute right-8 z-30 ${controlsTopClass}`}>
          <div className="flex items-center gap-2 bg-[#050505]/94 px-1.5 py-1 shadow-[0_10px_30px_rgba(0,0,0,0.22)] backdrop-blur-sm">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="border border-white/18 bg-[#050505] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
            >
              {uploading ? "Uploading..." : "Add images"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(event) => void handleFileChange(event)}
            />
          </div>
        </div>
      ) : null}

      <div
        className={`absolute inset-x-8 bottom-[-12%] z-20 border border-white/10 bg-black shadow-[0_34px_90px_rgba(0,0,0,0.42)] ${frameTopClass}`}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.figure
            key={`${project.slug}-${activeIndex}`}
            initial={{ opacity: 0, scale: 1.03, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.02, y: -18 }}
            transition={{ duration: 0.5, ease }}
            className="absolute inset-0"
          >
            <img
              src={currentItem.url}
              alt={currentItem.alt || project.title}
              className="h-full w-full object-cover"
            />
          </motion.figure>
        </AnimatePresence>
      </div>

      {uploadError ? (
        <div className="absolute left-8 top-8 z-30">
          <p className="bg-[#050505]/94 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-white/62 shadow-[0_10px_30px_rgba(0,0,0,0.18)] backdrop-blur-sm">
            {uploadError}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function SelectedProjectStage({
  project,
  editable = false,
  selectedProjectStageControllerRef,
}: {
  project: SelectedProjectStageSnapshot;
  editable?: boolean;
  selectedProjectStageControllerRef?: MutableRefObject<SelectedProjectStageController | null>;
}) {
  return (
    <div className="relative h-full min-h-0 overflow-hidden border-l-2 border-black">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(232,181,74,0.12),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.08),transparent_18%)]" />
      <motion.div
        className="absolute inset-x-0 top-0 h-[43%] min-h-0"
        initial={false}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease }}
      >
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.45, ease }}
          className="relative z-20 h-full min-h-0"
        >
          <ProjectStageGallery
            project={project}
            editable={editable}
            selectedProjectStageControllerRef={selectedProjectStageControllerRef}
          />
        </motion.div>
      </motion.div>
    </div>
  );
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
  const [selectedProjectStageSnapshot, setSelectedProjectStageSnapshot] =
    useState<SelectedProjectStageSnapshot | null>(null);
  const selectedProjectStageControllerRef =
    useRef<SelectedProjectStageController | null>(null);
  const isProjectsView = view === "projects";
  const isMobile = useIsMobile();
  const selectedProjectSlug = searchParams.get("project");
  const editRequested = searchParams.get("edit") === "1";
  const editorUnlocked = editRequested && editorSessionAvailable;

  const projectEntries = useMemo(
    (): SelectedProjectStageSnapshot[] =>
      universities.flatMap((university) =>
        university.projects.map((project) => ({
          id: project.id,
          slug: project.slug ?? project.id,
          universityId: university.id,
          title: project.title,
          universityName: university.name,
          shortName: university.shortName,
          color: university.color,
          locationLabel:
            project.locationLabel || `${university.city}, ${university.country}`,
          gallery: project.document?.gallery ?? [],
          markerOffset: project.markerOffset,
        }))
      ),
    [universities]
  );

  const selectedProject =
    isProjectsView && selectedProjectSlug
      ? selectedProjectStageSnapshot?.slug === selectedProjectSlug
        ? selectedProjectStageSnapshot
        : projectEntries.find((project) => project.slug === selectedProjectSlug) ?? null
      : null;

  const previewProject =
    isProjectsView
      ? projectEntries.find(
          (project) =>
            !selectedProjectSlug && project.slug === projectPreviewSlug
        ) ?? null
      : null;

  const focusedProject = selectedProject ?? previewProject;

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
  const currentLogoLeft = getLogoLeft(currentPanelWidth);
  const showSelectedProjectStage = isProjectsView && Boolean(selectedProject);
  const detailStageUniversity = useMemo(
    () =>
      selectedProject && projectFocusedUniversity
        ? {
            ...projectFocusedUniversity,
            projects: projectFocusedUniversity.projects.filter(
              (candidate) => candidate.id === selectedProject.id
            ),
          }
        : null,
    [projectFocusedUniversity, selectedProject]
  );
  const detailStageFocusMarker = useMemo(
    () =>
      selectedProject
        ? {
            id: selectedProject.id,
            title: selectedProject.title,
            markerOffset: selectedProject.markerOffset,
            color: selectedProject.color,
            label: `Lat ${selectedProject.markerOffset.lat.toFixed(4)} / Lng ${selectedProject.markerOffset.lng.toFixed(4)}`,
          }
        : null,
    [selectedProject]
  );
  const globeTransition = {
    duration: 0.68,
    ease: [0.22, 1, 0.36, 1] as const,
  };
  const globeViewport = showSelectedProjectStage
    ? {
        left: currentPanelWidth,
        top: "43%",
        width: `calc(100% - ${currentPanelWidth})`,
        height: "57%",
      }
    : {
        left: "0%",
        top: "0%",
        width: "100%",
        height: "100%",
      };
  const globeSceneTarget = showSelectedProjectStage
    ? {
        left: "-12%",
        top: "0%",
        width: "124%",
        height: "156%",
        x: "0%",
        y: "0%",
      }
    : {
        left: "0%",
        top: "0%",
        width: "100%",
        height: "100%",
        ...currentGlobePose,
      };
  const globeUniversities = showSelectedProjectStage
    ? detailStageUniversity
      ? [detailStageUniversity]
      : []
    : universities;
  const globeSelected = showSelectedProjectStage
    ? detailStageUniversity
    : globeSelectedUniversity;
  const globeHoveredProject = showSelectedProjectStage
    ? null
    : isProjectsView
      ? focusedProject?.id ?? null
      : hoveredProject;

  useEffect(() => {
    setView(getViewFromParams(searchParams));
  }, [searchParams]);

  useEffect(() => {
    if (isProjectsView && selectedProjectSlug) return;

    setSelectedProjectStageSnapshot(null);
  }, [isProjectsView, selectedProjectSlug]);

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
        <div className="absolute inset-0 bg-black" />
        <motion.div
          className="absolute overflow-hidden"
          initial={false}
          animate={globeViewport}
          transition={globeTransition}
        >
          <motion.div
            className="absolute"
            initial={false}
            animate={globeSceneTarget}
            transition={globeTransition}
          >
            <Globe
              universities={globeUniversities}
              selectedUniversity={globeSelected}
              onSelectUniversity={setSelectedUniversity}
              hoveredProject={globeHoveredProject}
              compact={showSelectedProjectStage ? false : isCompact}
              allowDragInCompact={false}
              hideLabels={showSelectedProjectStage}
              soloLabelId={
                showSelectedProjectStage
                  ? undefined
                  : isProjectsView
                    ? (projectFocusedUniversity ?? selectedUniversity)?.id
                    : undefined
              }
              maxLabels={
                showSelectedProjectStage
                  ? undefined
                  : isProjectsView
                    ? projectFocusedUniversity || selectedUniversity
                      ? 1
                      : 7
                    : undefined
              }
              disableAutoRotate={showSelectedProjectStage}
              disableDrag={showSelectedProjectStage}
              hideSelectedUniversityMarker={showSelectedProjectStage}
              scale={showSelectedProjectStage ? 1.24 : undefined}
              verticalOffset={showSelectedProjectStage ? 72 : 0}
              cameraY={showSelectedProjectStage ? 18 : 40}
              focusTargetYOffset={showSelectedProjectStage ? 0.48 : 0}
              focusMarker={showSelectedProjectStage ? detailStageFocusMarker : null}
            />
          </motion.div>
        </motion.div>

        <AnimatePresence initial={false} mode="wait">
          {showSelectedProjectStage && selectedProject ? (
            <motion.div
              key={`selected-stage-${selectedProject.slug}`}
              className="absolute inset-y-0 right-0"
              style={{ width: `calc(100% - ${currentPanelWidth})` }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 0.18,
                ease,
                delay: 0.42,
              }}
            >
              <SelectedProjectStage
                project={selectedProject}
                editable={editorUnlocked && !writesDisabled}
                selectedProjectStageControllerRef={selectedProjectStageControllerRef}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>

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
                  onSelectedProjectStageChange={setSelectedProjectStageSnapshot}
                  selectedProjectStageControllerRef={selectedProjectStageControllerRef}
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
