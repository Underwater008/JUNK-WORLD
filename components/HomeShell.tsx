"use client";

import {
  Suspense,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ChangeEvent,
  type DragEvent,
  type MutableRefObject,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
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
const galleryHeroTransition = {
  duration: 0.62,
  ease: [0.22, 1, 0.36, 1] as const,
};

function getLogoLeft(panel: string) {
  const p = Number.parseFloat(panel);
  const center = p + (100 - p) / 2;
  return `${center}%`;
}

function getAboutGlobePose(panel: string) {
  const panelWidth = Number.parseFloat(panel);
  return { x: `${panelWidth / 2}%`, y: "-18%" };
}

function moveGalleryItem<T>(items: T[], fromIndex: number, toIndex: number) {
  if (fromIndex === toIndex) return items;

  const nextItems = [...items];
  const [movedItem] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, movedItem);
  return nextItems;
}

function ProjectStageGallery({
  project,
  editable = false,
  selectedProjectStageControllerRef,
  expanded = false,
  onExpandedChange,
}: {
  project: SelectedProjectStageSnapshot;
  editable?: boolean;
  selectedProjectStageControllerRef?: MutableRefObject<SelectedProjectStageController | null>;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const galleryLength = project.gallery.length;
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (galleryLength < 2 || expanded) return;

    const intervalId = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % galleryLength);
    }, 4200);

    return () => window.clearInterval(intervalId);
  }, [expanded, galleryLength]);

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

  function commitGalleryOrder(nextGallery: SelectedProjectStageSnapshot["gallery"]) {
    selectedProjectStageControllerRef?.current?.setGalleryItems(nextGallery);
  }

  function handleDeleteGalleryItem(index: number) {
    if (!editable) return;

    const nextGallery = project.gallery.filter((_, itemIndex) => itemIndex !== index);
    commitGalleryOrder(nextGallery);
    setActiveIndex((current) => {
      if (!nextGallery.length) return 0;
      if (current > index) return current - 1;
      if (current === index) return Math.min(index, nextGallery.length - 1);
      return current;
    });
  }

  function handleDragStart(event: DragEvent<HTMLDivElement>, index: number) {
    if (!editable) return;

    setDraggedIndex(index);
    setDragOverIndex(index);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(index));
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>, index: number) {
    if (!editable || draggedIndex === null) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  }

  function handleDragEnd() {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>, dropIndex: number) {
    if (!editable || draggedIndex === null) return;

    event.preventDefault();
    if (draggedIndex !== dropIndex) {
      const nextGallery = moveGalleryItem(project.gallery, draggedIndex, dropIndex);
      commitGalleryOrder(nextGallery);
      setActiveIndex((current) => {
        if (current === draggedIndex) return dropIndex;
        if (draggedIndex < dropIndex && current > draggedIndex && current <= dropIndex) {
          return current - 1;
        }
        if (draggedIndex > dropIndex && current >= dropIndex && current < draggedIndex) {
          return current + 1;
        }
        return current;
      });
    }

    setDraggedIndex(null);
    setDragOverIndex(null);
  }

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

  const frameTopClass = "top-28";

  if (!galleryLength) {
    if (expanded) {
      return (
        <motion.div
          className="relative z-20 h-full min-h-0 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease }}
        >
          <div className="absolute inset-x-8 top-8 z-30 flex items-start justify-between gap-6">
            <div className="flex max-w-[820px] flex-wrap items-end gap-x-5 gap-y-2">
              <h2 className="font-serif text-[clamp(1.8rem,3.3vw,3.8rem)] leading-[0.94] text-white">
                {project.title}
              </h2>
              <p className="pb-1 text-[10px] font-semibold uppercase tracking-[0.26em] text-white/55">
                0 media
              </p>
            </div>

            <div className="flex items-center gap-2 bg-black/45 px-2 py-2 backdrop-blur-sm">
              {editable ? (
                <>
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
                </>
              ) : null}

              <button
                type="button"
                onClick={() => onExpandedChange?.(false)}
                className="border border-white/18 bg-transparent px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-white hover:text-black"
              >
                Close gallery
              </button>
            </div>
          </div>

          <div className="absolute inset-x-8 top-32 bottom-10 z-20 flex items-center justify-center">
            <div className="border border-white/12 bg-black/38 px-8 py-7 text-center backdrop-blur-sm">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/48">
                Gallery empty
              </p>
              <p className="mt-3 max-w-[24rem] text-sm leading-7 text-white/70">
                {editable
                  ? "Add images to rebuild the gallery."
                  : "No images are available for this project yet."}
              </p>
            </div>
          </div>

          {uploadError ? (
            <div className="absolute left-8 top-8 z-40">
              <p className="bg-[#050505]/94 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-white/62 backdrop-blur-sm">
                {uploadError}
              </p>
            </div>
          ) : null}
        </motion.div>
      );
    }

    if (editable) {
      return (
        <div className="relative z-20 h-full min-h-0 overflow-visible">
          <button
            type="button"
            onClick={() => onExpandedChange?.(true)}
            className={`group absolute inset-x-8 z-20 flex h-[min(32vh,360px)] items-center justify-center overflow-hidden border border-white/14 bg-[linear-gradient(180deg,rgba(12,12,12,0.94),rgba(3,3,3,0.98))] text-left ${frameTopClass}`}
          >
            <div className="pointer-events-none absolute inset-[18px] border border-dashed border-white/12" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06),transparent_56%)] opacity-70 transition duration-300 group-hover:opacity-100" />
            <div className="relative z-10 flex flex-col items-center gap-3 px-6 text-center">
              <span className="border border-white/18 bg-black/58 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-white transition duration-300 group-hover:bg-white group-hover:text-black">
                Edit gallery
              </span>
              <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-white/42">
                0 media
              </p>
              <p className="max-w-[22rem] text-sm leading-7 text-white/62">
                Open the gallery editor to add images and build the sequence.
              </p>
            </div>
          </button>

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

    return (
      <div className="relative z-20 h-full min-h-0 overflow-visible">
        {uploadError ? (
          <div className="absolute inset-x-0 bottom-8 z-30 flex justify-center px-6">
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/70">
              {uploadError}
            </p>
          </div>
        ) : null}
      </div>
    );
  }

  const currentItem = project.gallery[activeIndex] ?? project.gallery[0];
  const galleryCtaLabel = galleryLength > 1 ? "See all" : "Open image";
  const heroLayoutId = `${project.slug}-gallery-hero`;

  if (expanded) {
    return (
      <motion.div
        className="relative z-20 h-full min-h-0 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35, ease }}
      >
        <div className="absolute inset-x-8 top-8 z-30 flex items-start justify-between gap-6">
          <div className="flex max-w-[820px] flex-wrap items-end gap-x-5 gap-y-2">
            <h2 className="font-serif text-[clamp(1.8rem,3.3vw,3.8rem)] leading-[0.94] text-white">
              {project.title}
            </h2>
            <p className="pb-1 text-[10px] font-semibold uppercase tracking-[0.26em] text-white/55">
              {galleryLength} media
            </p>
          </div>

          <div className="flex items-center gap-2 bg-black/45 px-2 py-2 backdrop-blur-sm">
            {editable ? (
              <>
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
              </>
            ) : null}

            <button
              type="button"
              onClick={() => onExpandedChange?.(false)}
              className="border border-white/18 bg-transparent px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-white hover:text-black"
            >
              Close gallery
            </button>
          </div>
        </div>

        <div className="absolute left-1/2 top-28 bottom-6 z-20 w-[min(88vw,1320px)] -translate-x-1/2 overflow-y-auto pr-3 pb-6">
          <div className="grid grid-cols-2 items-start gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {project.gallery.map((item, index) => {
              const hero = index === activeIndex;
              const showDropTarget =
                editable && draggedIndex !== null && dragOverIndex === index && draggedIndex !== index;

              return (
              <motion.div
                key={`${project.slug}-${item.url}-${index}-${hero ? "hero" : "tile"}`}
                onClick={() => setActiveIndex(index)}
                layout
                layoutId={hero ? heroLayoutId : undefined}
                draggable={editable}
                onDragStartCapture={(event) => handleDragStart(event, index)}
                onDragOverCapture={(event) => handleDragOver(event, index)}
                onDropCapture={(event) => handleDrop(event, index)}
                onDragEndCapture={handleDragEnd}
                initial={hero ? false : { opacity: 0, y: 24 }}
                animate={hero ? undefined : { opacity: 1, y: 0 }}
                exit={hero ? undefined : { opacity: 0, y: 18 }}
                transition={hero ? galleryHeroTransition : { duration: 0.38, ease, delay: index * 0.03 }}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setActiveIndex(index);
                  }
                }}
                className={`group relative overflow-hidden border bg-[#080808] text-left ${
                  hero
                    ? "col-span-2 self-start lg:col-span-2 xl:col-span-2"
                    : ""
                } ${
                  showDropTarget
                    ? "border-white/75"
                    : hero
                      ? "border-white/40"
                      : "border-white/10"
                } ${
                  editable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
                }`}
              >
                {editable ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDeleteGalleryItem(index);
                    }}
                    className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center border border-white/18 bg-black/72 text-white opacity-0 transition hover:bg-white hover:text-black group-hover:opacity-100 group-focus-within:opacity-100"
                    aria-label={`Delete image ${index + 1}`}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                      <path d="M3.25 4.25H10.75" stroke="currentColor" strokeWidth="1.2" />
                      <path d="M5.25 2.75H8.75" stroke="currentColor" strokeWidth="1.2" />
                      <path d="M4.25 4.25V10.25C4.25 10.6642 4.58579 11 5 11H9C9.41421 11 9.75 10.6642 9.75 10.25V4.25" stroke="currentColor" strokeWidth="1.2" />
                      <path d="M6 6V9.25" stroke="currentColor" strokeWidth="1.2" />
                      <path d="M8 6V9.25" stroke="currentColor" strokeWidth="1.2" />
                    </svg>
                  </button>
                ) : null}
                <motion.img
                  src={item.url}
                  alt={item.alt || `${project.title} image ${index + 1}`}
                  draggable={false}
                  className="block h-auto w-full transition duration-300 ease-out group-hover:opacity-95"
                  transition={hero ? galleryHeroTransition : undefined}
                />
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.18)_52%,rgba(0,0,0,0.78))] opacity-90" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 px-4 py-4">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.26em] text-white/48">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {item.alt ? (
                    <span className="max-w-[68%] text-right text-[11px] leading-5 text-white/86">
                      {item.alt}
                    </span>
                  ) : null}
                </div>
              </motion.div>
            );
            })}
          </div>
        </div>

        {uploadError ? (
          <div className="absolute left-8 top-8 z-40">
            <p className="bg-[#050505]/94 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-white/62 backdrop-blur-sm">
              {uploadError}
            </p>
          </div>
        ) : null}
      </motion.div>
    );
  }

  return (
    <div className="relative z-20 h-full min-h-0 overflow-visible">
      <motion.button
        type="button"
        onClick={() => onExpandedChange?.(true)}
        layoutId={heroLayoutId}
        transition={galleryHeroTransition}
        className={`group absolute inset-x-8 z-20 h-[min(32vh,360px)] overflow-hidden border border-white/10 bg-black text-left shadow-[0_34px_90px_rgba(0,0,0,0.42)] ${frameTopClass}`}
        aria-label={`${galleryCtaLabel} for ${project.title}`}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.img
            key={`${project.slug}-${activeIndex}`}
            src={currentItem.url}
            alt={currentItem.alt || project.title}
            draggable={false}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
            transition={{ duration: 0.42, ease }}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </AnimatePresence>

        <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.04),rgba(0,0,0,0.26)_44%,rgba(0,0,0,0.72))] opacity-0 transition duration-300 group-hover:opacity-100 group-focus-visible:opacity-100" />
        <span className="absolute left-8 bottom-8 flex translate-y-2 items-center gap-3 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
          <span className="border border-white/18 bg-black/72 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.26em] text-white backdrop-blur-sm">
            {galleryCtaLabel}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/64">
            {galleryLength} image{galleryLength === 1 ? "" : "s"}
          </span>
        </span>
      </motion.button>

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
  galleryExpanded = false,
  onGalleryExpandedChange,
}: {
  project: SelectedProjectStageSnapshot;
  editable?: boolean;
  selectedProjectStageControllerRef?: MutableRefObject<SelectedProjectStageController | null>;
  galleryExpanded?: boolean;
  onGalleryExpandedChange?: (expanded: boolean) => void;
}) {
  return (
    <LayoutGroup id={`project-gallery-${project.slug}`}>
      <div className="relative h-full min-h-0 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(232,181,74,0.12),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.08),transparent_18%)]" />
        <div className="absolute inset-0">
          <ProjectStageGallery
            project={project}
            editable={editable}
            selectedProjectStageControllerRef={selectedProjectStageControllerRef}
            expanded={galleryExpanded}
            onExpandedChange={onGalleryExpandedChange}
          />
        </div>
      </div>
    </LayoutGroup>
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
  const [galleryExpanded, setGalleryExpanded] = useState(false);
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
  const showSelectedProjectStage = isProjectsView && Boolean(selectedProject);
  const galleryExpandedActive = showSelectedProjectStage && galleryExpanded;
  const currentPanelWidth = panelWidth[view];
  const activePanelWidth = galleryExpandedActive ? "0%" : currentPanelWidth;
  const currentGlobePose =
    view === "about" ? getAboutGlobePose(activePanelWidth) : globePose[view];
  const currentLogoLeft = getLogoLeft(activePanelWidth);
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
  const globeViewport = galleryExpandedActive
    ? {
        left: `calc(${currentPanelWidth} / 2)`,
        top: "43%",
        width: `calc(100% - ${currentPanelWidth})`,
        height: "57%",
      }
    : showSelectedProjectStage
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
  const globeSceneTarget = galleryExpandedActive
    ? {
        left: "-12%",
        top: "0%",
        width: "124%",
        height: "156%",
        x: "0%",
        y: "0%",
      }
    : showSelectedProjectStage
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
  const handleGalleryExpandedChange = useCallback((expanded: boolean) => {
    setGalleryExpanded(expanded);
  }, []);

  useEffect(() => {
    setView(getViewFromParams(searchParams));
  }, [searchParams]);

  useEffect(() => {
    if (isProjectsView && selectedProjectSlug) return;

    setSelectedProjectStageSnapshot(null);
  }, [isProjectsView, selectedProjectSlug]);

  useEffect(() => {
    setGalleryExpanded(false);
  }, [selectedProjectSlug, view]);

  useEffect(() => {
    if (showSelectedProjectStage) return;

    setGalleryExpanded(false);
  }, [showSelectedProjectStage]);

  useEffect(() => {
    if (!galleryExpandedActive) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        handleGalleryExpandedChange(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [galleryExpandedActive, handleGalleryExpandedChange]);

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
              scale={
                galleryExpandedActive
                  ? 1.12
                  : showSelectedProjectStage
                    ? 1.24
                    : undefined
              }
              verticalOffset={galleryExpandedActive ? 72 : showSelectedProjectStage ? 72 : 0}
              cameraY={galleryExpandedActive ? 18 : showSelectedProjectStage ? 18 : 40}
              focusTargetYOffset={galleryExpandedActive ? 0.48 : showSelectedProjectStage ? 0.48 : 0}
              focusMarker={showSelectedProjectStage ? detailStageFocusMarker : null}
            />
          </motion.div>
        </motion.div>

        <AnimatePresence initial={false} mode="wait">
          {showSelectedProjectStage && selectedProject ? (
            <motion.div
              key={`selected-stage-${selectedProject.slug}`}
              className="absolute inset-y-0"
              initial={{ opacity: 0 }}
              animate={{
                opacity: 1,
                left: galleryExpandedActive ? "0%" : currentPanelWidth,
                width: galleryExpandedActive
                  ? "100%"
                  : `calc(100% - ${currentPanelWidth})`,
              }}
              exit={{
                opacity: 0,
                transition: { duration: 0.12, ease },
              }}
              transition={{
                opacity: { duration: 0.2, ease },
                left: globeTransition,
                width: globeTransition,
              }}
            >
              <SelectedProjectStage
                project={selectedProject}
                editable={editorUnlocked && !writesDisabled}
                selectedProjectStageControllerRef={selectedProjectStageControllerRef}
                galleryExpanded={galleryExpandedActive}
                onGalleryExpandedChange={handleGalleryExpandedChange}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>

        <motion.div
          className="relative z-20 shrink-0 overflow-hidden bg-[var(--ink-wash-200)]"
          initial={false}
          animate={{
            width: activePanelWidth,
            x: galleryExpandedActive ? "-6%" : "0%",
            opacity: galleryExpandedActive ? 0 : 1,
            borderRightWidth: galleryExpandedActive ? 0 : 2,
          }}
          transition={{ duration: 0.5, ease }}
          style={{
            borderRightStyle: "solid",
            borderRightColor: "#000",
            pointerEvents: galleryExpandedActive ? "none" : "auto",
          }}
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
