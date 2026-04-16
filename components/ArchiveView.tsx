"use client";

import { useEffect, useRef, useMemo, useState, type MutableRefObject } from "react";
import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import LoginForm from "@/components/portal/LoginForm";
import LogoutButton from "@/components/portal/LogoutButton";
import ProjectCardDisplay from "@/components/ProjectCardDisplay";
import ProjectEditor, { type ProjectEditorHandle } from "@/components/portal/ProjectEditor";
import UniversityEditor from "@/components/portal/UniversityEditor";
import { createEmptyProjectDocument } from "@/lib/projects/defaults";
import { getPortalWriteDisabledMessage } from "@/lib/portal/mode";
import { uploadAsset } from "@/lib/uploads";
import type {
  ProjectDocument,
  ProjectGalleryItem,
  ProjectMarkerOffset,
  University,
} from "@/types";

const NEW_UNIVERSITY_ID = "__new_university__";

const NEW_PROJECT_SLUG = "__new__";
const ARCHIVE_RAIL_COLLAPSED_WIDTH = 92;
const ARCHIVE_RAIL_PANEL_WIDTH = 320;
const BlockNoteDocument = dynamic(
  () => import("@/components/projects/BlockNoteDocument"),
  {
    ssr: false,
    loading: () => <div className="min-h-[220px] bg-black/[0.02]" />,
  }
);

type ArchiveProjectEntry = {
  id: string;
  slug: string;
  title: string;
  description: string;
  year: number;
  thumbnail: string;
  participants: number;
  tags: string[];
  locationLabel: string;
  universityId: string;
  university: string;
  shortName: string;
  city: string;
  country: string;
  color: string;
  logo?: string;
  status: "draft" | "published";
  hasUnpublishedChanges: boolean;
  document: ProjectDocument | null;
};

type EditorProjectState = {
  routeSlug: string;
  savedSlug?: string;
  document: ProjectDocument;
};

export type SelectedProjectStageSnapshot = {
  id: string;
  slug: string;
  universityId: string;
  title: string;
  universityName: string;
  shortName: string;
  color: string;
  locationLabel: string;
  gallery: ProjectGalleryItem[];
  markerOffset: ProjectMarkerOffset;
};

export type SelectedProjectStageController = {
  uploadGalleryFiles: (files: File[]) => Promise<void>;
  setGalleryItems: (items: ProjectGalleryItem[]) => void;
  setMarkerOffset: (markerOffset: ProjectMarkerOffset) => void;
};

interface ArchiveViewProps {
  universities: University[];
  baseUniversities: University[];
  selectedUniversity: University | null;
  onSelectUniversity: (uni: University | null) => void;
  onPreviewProjectChange: (slug: string | null) => void;
  onProjectOpenStart?: (slug: string) => void;
  previewProjectSlug?: string | null;
  onSelectedProjectStageChange?: (project: SelectedProjectStageSnapshot | null) => void;
  selectedProjectStageControllerRef?: MutableRefObject<SelectedProjectStageController | null>;
  editorSessionAvailable: boolean;
  writesDisabled: boolean;
}

function createGalleryAlt(fileName: string) {
  return fileName
    .replace(/\.[^/.]+$/, "")
    .replace(/[-_]+/g, " ")
    .trim();
}

function StatusPill({
  label,
  filled = false,
}: {
  label: string;
  filled?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] ${
        filled ? "border-black bg-black text-white" : "border-black text-black"
      }`}
    >
      {label}
    </span>
  );
}

function ArchiveRailButton({
  title,
  subtitle,
  badgeLabel,
  accentColor,
  active = false,
  logo,
  onClick,
}: {
  title: string;
  subtitle: string;
  badgeLabel: string;
  accentColor: string;
  active?: boolean;
  logo?: string;
  onClick: () => void;
}) {
  const showBadgeLabel = badgeLabel !== "All";

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className="pointer-events-auto group relative z-0 flex h-[72px] w-[92px] items-center justify-start overflow-visible text-left focus-visible:outline-none hover:z-40 focus-visible:z-40"
    >
      <div
        className={`relative z-10 flex h-[72px] w-[92px] shrink-0 items-center justify-center overflow-hidden border-b border-black/10 transition-colors duration-200 ease-out ${
          active
            ? "bg-white"
            : "bg-[var(--ink-wash-200)] group-hover:bg-black/5 group-focus-visible:bg-black/5"
        }`}
      >
        {logo ? (
          <img src={logo} alt={badgeLabel} className="h-8 w-8 object-contain" />
        ) : (
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-black">
            {badgeLabel}
          </span>
        )}
        <span
          className="absolute inset-y-0 left-0 w-[3px]"
          style={{ backgroundColor: accentColor }}
        />
        <span className="absolute inset-y-0 right-0 w-[2px] bg-black" />
      </div>

      <div
        className="pointer-events-none absolute left-[92px] top-0 z-30 w-[228px] -translate-x-2 opacity-0 transition-[opacity,transform] duration-200 ease-out group-hover:pointer-events-auto group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:pointer-events-auto group-focus-visible:translate-x-0 group-focus-visible:opacity-100"
      >
        <div
          className="flex min-h-[72px] items-center justify-between border-b border-r border-black/10 bg-[var(--ink-wash-200)] px-6 py-4 transition-colors duration-200 group-hover:bg-white group-focus-visible:bg-white"
        >
          <div className="min-w-0">
            {showBadgeLabel ? (
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--ink-wash-700)]">
                {badgeLabel}
              </p>
            ) : null}
            <p className="mt-1 text-sm font-semibold leading-5 text-black">
              {title}
            </p>
            <p className="mt-1 text-xs leading-5 text-[var(--ink-wash-700)]">
              {subtitle}
            </p>
          </div>

          <div className="ml-3 shrink-0 text-right">
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="#000"
              strokeWidth="2.25"
              className="ml-auto"
            >
              <path d="M5 4L10 8L5 12" />
            </svg>
          </div>
        </div>
      </div>
    </button>
  );
}

function AccessGate({
  nextPath,
  onExit,
}: {
  nextPath: string;
  onExit: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end bg-black/55 p-3 sm:items-center sm:justify-center sm:p-6"
    >
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="relative w-full max-w-[560px] overflow-hidden border-2 border-black bg-white shadow-[12px_12px_0_#000]"
      >
        <section className="bg-white px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--ink-wash-700)]">
                Shared Password
              </p>
              <h3 className="mt-4 font-serif text-3xl leading-none text-black">
                Enter editor access.
              </h3>
            </div>
            <button
              type="button"
              onClick={onExit}
              className="shrink-0 border border-black px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-black hover:text-white"
            >
              Public View
            </button>
          </div>
          <p className="mt-4 max-w-md text-sm leading-7 text-black/60">
            Unlock inline editing for cards, metadata, media, globe targets, and project body content.
          </p>
          <LoginForm nextPath={nextPath} submitLabel="Unlock Editor" />
        </section>
      </motion.div>
    </motion.div>
  );
}

function DeleteProjectDialog({
  project,
  deleting,
  error,
  onCancel,
  onConfirm,
}: {
  project: ArchiveProjectEntry;
  deleting: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end bg-black/55 p-3 sm:items-center sm:justify-center sm:p-6"
    >
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="relative w-full max-w-[560px] overflow-hidden border-2 border-black bg-white shadow-[12px_12px_0_#000]"
      >
        <section className="bg-white px-5 py-5 sm:px-6 sm:py-6">
          <div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-red-600">
                Delete Project
              </p>
              <h3 className="mt-4 font-serif text-3xl leading-none text-black">
                Delete &ldquo;{project.title}&rdquo;?
              </h3>
              <p className="mt-4 max-w-md text-sm leading-7 text-black/60">
                This will permanently remove the project from the archive and portal.
              </p>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-black/40">
                {project.shortName} / {project.year}
              </p>
              {error ? (
                <p className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              ) : null}
            </div>
          </div>
          <div className="mt-6 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={deleting}
              className="border border-black/20 bg-white px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/60 transition hover:border-black hover:text-black disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={deleting}
              className="border border-red-600 bg-red-600 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-white hover:text-red-600 disabled:opacity-40"
            >
              {deleting ? "Deleting..." : "Yes, Delete"}
            </button>
          </div>
        </section>
      </motion.div>
    </motion.div>
  );
}

function ArchiveProjectDetail({
  project,
  onClose,
}: {
  project: ArchiveProjectEntry;
  index: number;
  onClose: () => void;
  showBadges: boolean;
}) {
  const university = project.university;

  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="bg-white"
    >
      {/* Cover image */}
      {project.thumbnail ? (
        <div className="mx-auto w-full max-w-3xl px-6 pt-6">
          <div className="aspect-[16/9] overflow-hidden">
            <img
              src={project.thumbnail}
              alt={project.title}
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      ) : null}

      {/* Content */}
      <div className="mx-auto max-w-3xl px-6 py-8">
        {/* Meta row */}
        <div className="flex items-center gap-2 text-[12px] text-black/50">
          {project.logo ? (
            <img
              src={project.logo}
              alt={project.shortName}
              className="h-4 w-auto object-contain opacity-50"
            />
          ) : null}
          <span>{university}</span>
          <span className="text-black/25">·</span>
          <span>{project.locationLabel}</span>
          <span className="text-black/25">·</span>
          <span>{project.year}</span>
          <span className="text-black/25">·</span>
          <span>{project.participants} participants</span>
        </div>

        {/* Title */}
        <h1 className="mt-5 font-serif text-[clamp(2.75rem,5vw,4.4rem)] leading-[0.98] text-black">
          {project.title}
        </h1>

        {/* Summary */}
        {project.description ? (
          <p className="mt-3 text-base leading-7 text-black/65">
            {project.description}
          </p>
        ) : null}

        {/* Divider */}
        <div className="my-6 h-px bg-black/8" />

        {/* Body */}
        {project.document?.body?.length ? (
          <BlockNoteDocument body={project.document.body} className="project-body" />
        ) : null}

        {/* Tags */}
        {project.tags.length > 0 && (
          <>
            <div className="my-6 h-px bg-black/8" />
            <div className="flex flex-wrap items-center gap-1.5">
              {project.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center bg-black/5 px-3 py-1 text-[11px] font-medium text-black/60"
                >
                  {tag}
                </span>
              ))}
            </div>
          </>
        )}

        {/* Collaborators */}
        {project.document?.collaborators?.length ? (
          <>
            <div className="my-6 h-px bg-black/8" />
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-black/35">Collaborators</p>
            <div className="mt-2 space-y-1">
              {project.document.collaborators.map((c, i) => (
                <p key={i} className="text-sm text-black/60">
                  {c.name}{c.role ? <span className="text-black/30"> — {c.role}</span> : null}
                </p>
              ))}
            </div>
          </>
        ) : null}

        {/* Credits */}
        {project.document?.credits?.length ? (
          <>
            <div className="my-6 h-px bg-black/8" />
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-black/35">Credits</p>
            <div className="mt-2 space-y-1">
              {project.document.credits.map((c, i) => (
                <p key={i} className="text-sm text-black/60">
                  <span className="text-black/35">{c.label}:</span> {c.value}
                </p>
              ))}
            </div>
          </>
        ) : null}

        {/* External links */}
        {project.document?.externalLinks?.length ? (
          <>
            <div className="my-6 h-px bg-black/8" />
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-black/35">Links</p>
            <div className="mt-2 space-y-1">
              {project.document.externalLinks.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm text-black/60 underline underline-offset-4 hover:text-black"
                >
                  {link.label || link.url}
                </a>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </motion.section>
  );
}

export default function ArchiveView({
  universities,
  baseUniversities,
  selectedUniversity,
  onSelectUniversity,
  onPreviewProjectChange,
  onProjectOpenStart,
  previewProjectSlug = null,
  onSelectedProjectStageChange,
  selectedProjectStageControllerRef,
  editorSessionAvailable,
  writesDisabled,
}: ArchiveViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedSlug = searchParams.get("project");
  const editRequested = searchParams.get("edit") === "1";
  const editorUnlocked = editRequested && editorSessionAvailable;
  const [editorProjectState, setEditorProjectState] = useState<EditorProjectState | null>(null);
  const [editingUniversityId, setEditingUniversityId] = useState<string | null>(null);
  const [projectSavingMode, setProjectSavingMode] = useState<"draft" | "publish" | null>(null);
  const [projectIsDirty, setProjectIsDirty] = useState(false);
  const [projectDeleteTarget, setProjectDeleteTarget] = useState<ArchiveProjectEntry | null>(null);
  const [projectDeleteError, setProjectDeleteError] = useState<string | null>(null);
  const [deletingProjectSlug, setDeletingProjectSlug] = useState<string | null>(null);
  const projectEditorRef = useRef<ProjectEditorHandle>(null);
  const previewClearTimeoutRef = useRef<number | null>(null);
  const previewProjectSlugRef = useRef<string | null>(previewProjectSlug);
  const railScrollRef = useRef<HTMLDivElement>(null);
  const baseUniversitiesById = useMemo(
    () => new Map(baseUniversities.map((university) => [university.id, university])),
    [baseUniversities]
  );
  const routeDraft = useMemo(
    () =>
      selectedSlug === NEW_PROJECT_SLUG && editorUnlocked
        ? createEmptyProjectDocument()
        : null,
    [editorUnlocked, selectedSlug]
  );
  const activeEditorProjectState = useMemo(() => {
    if (!editorProjectState) return null;

    if (!selectedSlug) {
      return editorProjectState.routeSlug === NEW_PROJECT_SLUG &&
        !editorProjectState.savedSlug
        ? null
        : editorProjectState;
    }

    return selectedSlug === editorProjectState.routeSlug ||
      selectedSlug === editorProjectState.savedSlug
      ? editorProjectState
      : null;
  }, [editorProjectState, selectedSlug]);

  const allProjects = useMemo<ArchiveProjectEntry[]>(
    () => {
      const entries: ArchiveProjectEntry[] = universities
        .flatMap((university) =>
          university.projects.map((project) => ({
            id: project.id,
            slug: project.slug ?? project.id,
            title: project.title,
            description: project.description,
            year: project.year,
            thumbnail: project.thumbnail,
            participants: project.participants,
            tags: project.tags,
            locationLabel:
              project.locationLabel || `${university.city}, ${university.country}`,
            universityId: university.id,
            university: university.name,
            shortName: university.shortName,
            city: university.city,
            country: university.country,
            color: university.color,
            logo: university.logo,
            status: project.status ?? "published",
            hasUnpublishedChanges: project.hasUnpublishedChanges ?? false,
            document: project.document ?? null,
          }))
        )
        .sort((a, b) => b.year - a.year || a.title.localeCompare(b.title));

      const draftDocument =
        activeEditorProjectState?.document ??
        (editorUnlocked && routeDraft ? routeDraft : null);

      if (draftDocument) {
        const optimisticSlug =
          activeEditorProjectState?.savedSlug ??
          activeEditorProjectState?.routeSlug ??
          NEW_PROJECT_SLUG;
        const matchedIndex = entries.findIndex((entry) =>
          entry.slug === activeEditorProjectState?.routeSlug ||
          entry.slug === activeEditorProjectState?.savedSlug
        );
        const matchedEntry = matchedIndex >= 0 ? entries[matchedIndex] : null;
        const draftUniversity = baseUniversitiesById.get(draftDocument.universityId);
        const optimisticEntry: ArchiveProjectEntry = {
          id: matchedEntry?.id ?? "local-draft",
          slug: optimisticSlug,
          title: draftDocument.title || matchedEntry?.title || "Untitled Draft",
          description:
            draftDocument.summary ||
            matchedEntry?.description ||
            "New draft project. Add a title, set the globe location, and build the page body.",
          year: draftDocument.year,
          thumbnail:
            draftDocument.cardImageUrl ||
            draftDocument.coverImageUrl ||
            matchedEntry?.thumbnail ||
            "",
          participants: draftDocument.participantsCount,
          tags: draftDocument.tags,
          locationLabel:
            draftDocument.locationLabel ||
            (draftUniversity
              ? `${draftUniversity.city}, ${draftUniversity.country}`
              : matchedEntry?.locationLabel || "Location pending"),
          universityId: draftDocument.universityId || matchedEntry?.universityId || "",
          university: draftUniversity?.name ?? matchedEntry?.university ?? "Unassigned",
          shortName: draftUniversity?.shortName ?? matchedEntry?.shortName ?? "NEW",
          city: draftUniversity?.city ?? matchedEntry?.city ?? "Unknown",
          country: draftUniversity?.country ?? matchedEntry?.country ?? "",
          color: draftUniversity?.color ?? matchedEntry?.color ?? "#000000",
          logo: draftUniversity?.logo ?? matchedEntry?.logo,
          status: matchedEntry?.status ?? "draft",
          hasUnpublishedChanges: true,
          document: draftDocument,
        };

        if (matchedIndex >= 0) {
          entries[matchedIndex] = optimisticEntry;
        } else if (editorUnlocked) {
          entries.unshift(optimisticEntry);
        }
      }

      return entries;
    },
    [activeEditorProjectState, baseUniversitiesById, editorUnlocked, routeDraft, universities]
  );

  const filteredProjects = selectedUniversity
    ? allProjects.filter((project) => project.universityId === selectedUniversity.id)
    : allProjects;

  const selectedProject =
    filteredProjects.find((project) => project.slug === selectedSlug) ??
    (activeEditorProjectState &&
    selectedSlug &&
    (selectedSlug === activeEditorProjectState.routeSlug ||
      selectedSlug === activeEditorProjectState.savedSlug)
      ? allProjects.find(
          (project) =>
            project.slug === activeEditorProjectState.savedSlug ||
            project.slug === activeEditorProjectState.routeSlug
        ) ?? null
      : null);
  const selectedProjectIndex = selectedProject
    ? filteredProjects.findIndex((project) => project.slug === selectedProject.slug)
    : -1;
  const editingUniversity = editingUniversityId
    ? editingUniversityId === NEW_UNIVERSITY_ID
      ? undefined
      : baseUniversities.find((u) => u.id === editingUniversityId)
    : null;
  const isEditingUniversity = editingUniversityId !== null;
  const shouldHideRail = Boolean(selectedProject) || isEditingUniversity;
  const focusTransition = {
    duration: 0.38,
    ease: [0.22, 1, 0.36, 1] as const,
  };
  const [railScrollMetrics, setRailScrollMetrics] = useState({
    visible: false,
    thumbHeight: 0,
    thumbOffset: 0,
  });
  const railHeaderOffset = editorUnlocked
    ? selectedUniversity
      ? 156
      : 110
    : 0;
  const currentPath = searchParams.toString()
    ? `${pathname}?${searchParams.toString()}`
    : pathname;
  const logoutPath = selectedProject
    ? selectedProject.slug === NEW_PROJECT_SLUG
      ? "/?view=projects"
      : `/?view=projects&project=${selectedProject.slug}`
    : "/?view=projects";

  useEffect(() => {
    onSelectedProjectStageChange?.(
      selectedProject
        ? {
            id: selectedProject.id,
            slug: selectedProject.slug,
            universityId: selectedProject.universityId,
            title: selectedProject.title,
            universityName: selectedProject.university,
            shortName: selectedProject.shortName,
            color: selectedProject.color,
            locationLabel: selectedProject.locationLabel,
            gallery: selectedProject.document?.gallery ?? [],
            markerOffset:
              selectedProject.document?.markerOffset ?? { lat: 0, lng: 0 },
          }
        : null
    );
  }, [onSelectedProjectStageChange, selectedProject]);

  useEffect(() => {
    previewProjectSlugRef.current = previewProjectSlug;
  }, [previewProjectSlug]);

  useEffect(() => {
    return () => {
      if (previewClearTimeoutRef.current !== null) {
        window.clearTimeout(previewClearTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const node = railScrollRef.current;
    if (!node) return;

    function updateRailScrollMetrics() {
      const { scrollTop, scrollHeight, clientHeight } = node;
      const hasOverflow = scrollHeight > clientHeight + 1;

      if (!hasOverflow) {
        setRailScrollMetrics({
          visible: false,
          thumbHeight: 0,
          thumbOffset: 0,
        });
        return;
      }

      const thumbHeight = Math.max(28, (clientHeight * clientHeight) / scrollHeight);
      const maxThumbOffset = clientHeight - thumbHeight;
      const maxScrollTop = scrollHeight - clientHeight;
      const thumbOffset =
        maxScrollTop > 0 ? (scrollTop / maxScrollTop) * maxThumbOffset : 0;

      setRailScrollMetrics({
        visible: true,
        thumbHeight,
        thumbOffset,
      });
    }

    updateRailScrollMetrics();
    const frameId = window.requestAnimationFrame(updateRailScrollMetrics);

    node.addEventListener("scroll", updateRailScrollMetrics, { passive: true });
    window.addEventListener("resize", updateRailScrollMetrics);

    return () => {
      window.cancelAnimationFrame(frameId);
      node.removeEventListener("scroll", updateRailScrollMetrics);
      window.removeEventListener("resize", updateRailScrollMetrics);
    };
  }, [editorUnlocked, railHeaderOffset, universities.length]);

  useEffect(() => {
    if (!selectedProjectStageControllerRef) return;

    if (!editorUnlocked || writesDisabled || !selectedProject) {
      selectedProjectStageControllerRef.current = null;
      return;
    }

    selectedProjectStageControllerRef.current = {
      uploadGalleryFiles: async (files: File[]) => {
        if (!files.length) return;

        const uploadedItems = await Promise.all(
          files.map(async (file) => ({
            url: await uploadAsset(file, "projects/gallery"),
            alt: createGalleryAlt(file.name),
          }))
        );

        projectEditorRef.current?.appendGalleryItems(uploadedItems);
      },
      setGalleryItems: (items) => {
        projectEditorRef.current?.setGalleryItems(items);
      },
      setMarkerOffset: (markerOffset) => {
        projectEditorRef.current?.setMarkerOffset(markerOffset);
      },
    };

    return () => {
      selectedProjectStageControllerRef.current = null;
    };
  }, [
    editorUnlocked,
    selectedProject,
    selectedProjectStageControllerRef,
    writesDisabled,
  ]);

  function replaceQuery(mutator: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutator(params);
    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    });
  }

  function handleFilterChange(university: University | null) {
    onSelectUniversity(university);
    onPreviewProjectChange(null);

    replaceQuery((params) => {
      params.set("view", "projects");
      if (!university) return;

      const projectSlug = params.get("project");
      if (!projectSlug) return;

      const belongsToUniversity = allProjects.some(
        (project) =>
          project.slug === projectSlug && project.universityId === university.id
      );

      if (!belongsToUniversity) {
        params.delete("project");
      }
    });
  }

  function handleCreateProject() {
    setEditorProjectState({
      routeSlug: NEW_PROJECT_SLUG,
      document: createEmptyProjectDocument(),
    });
    setProjectIsDirty(false);
    onSelectUniversity(null);
    onPreviewProjectChange(null);

    replaceQuery((params) => {
      params.set("view", "projects");
      params.set("edit", "1");
      params.set("project", NEW_PROJECT_SLUG);
    });
  }

  function handleSelectProject(slug: string) {
    handleProjectPreviewStart(slug);
    onProjectOpenStart?.(slug);
    replaceQuery((params) => {
      params.set("view", "projects");
      if (params.get("project") === slug) {
        params.delete("project");
        return;
      }
      params.set("project", slug);
    });
  }

  function handleCloseProject() {
    if (selectedSlug === NEW_PROJECT_SLUG && !editorProjectState?.savedSlug) {
      setEditorProjectState(null);
      setProjectIsDirty(false);
    }

    if (selectedProject?.slug) {
      handleProjectPreviewStart(selectedProject.slug);
      schedulePreviewClear(520);
    } else {
      onPreviewProjectChange(null);
    }

    replaceQuery((params) => {
      params.delete("project");
    });
  }

  function handleExitEditMode() {
    setEditorProjectState(null);
    setEditingUniversityId(null);
    setProjectIsDirty(false);
    onPreviewProjectChange(null);
    replaceQuery((params) => {
      params.delete("edit");
      if (params.get("project") === NEW_PROJECT_SLUG) {
        params.delete("project");
      }
    });
  }

  function handleEditUniversity(universityId: string) {
    setEditingUniversityId(universityId);
    onPreviewProjectChange(null);
    replaceQuery((params) => {
      params.delete("project");
    });
  }

  function handleCreateUniversity() {
    setEditingUniversityId(NEW_UNIVERSITY_ID);
    onSelectUniversity(null);
    onPreviewProjectChange(null);
    replaceQuery((params) => {
      params.delete("project");
    });
  }

  function handleCloseUniversityEditor() {
    setEditingUniversityId(null);
  }

  function handleProjectPreviewStart(slug: string) {
    if (previewClearTimeoutRef.current !== null) {
      window.clearTimeout(previewClearTimeoutRef.current);
      previewClearTimeoutRef.current = null;
    }
    onPreviewProjectChange(slug);
  }

  function handleProjectPreviewEnd(slug: string) {
    if (previewClearTimeoutRef.current !== null) {
      window.clearTimeout(previewClearTimeoutRef.current);
    }

    previewClearTimeoutRef.current = window.setTimeout(() => {
      if (previewProjectSlugRef.current === slug) {
        onPreviewProjectChange(null);
      }
      previewClearTimeoutRef.current = null;
    }, 120);
  }

  function schedulePreviewClear(delay = 120) {
    if (previewClearTimeoutRef.current !== null) {
      window.clearTimeout(previewClearTimeoutRef.current);
    }

    previewClearTimeoutRef.current = window.setTimeout(() => {
      onPreviewProjectChange(null);
      previewClearTimeoutRef.current = null;
    }, delay);
  }

  function handleUniversitySaved(savedId: string) {
    setEditingUniversityId(savedId);
    router.refresh();
  }

  function handleUniversityDeleted() {
    setEditingUniversityId(null);
    router.refresh();
  }

  async function handleConfirmProjectDelete() {
    if (!projectDeleteTarget || writesDisabled) return;

    setDeletingProjectSlug(projectDeleteTarget.slug);
    setProjectDeleteError(null);

    try {
      const response = await fetch(
        `/api/portal/projects/${encodeURIComponent(projectDeleteTarget.slug)}`,
        {
          method: "DELETE",
        }
      );

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Delete failed.");
      }

      if (previewProjectSlugRef.current === projectDeleteTarget.slug) {
        onPreviewProjectChange(null);
      }

      setEditorProjectState((current) => {
        if (!current) return null;

        return current.routeSlug === projectDeleteTarget.slug ||
          current.savedSlug === projectDeleteTarget.slug
          ? null
          : current;
      });
      setProjectIsDirty(false);
      setProjectDeleteTarget(null);
      router.refresh();
    } catch (error) {
      setProjectDeleteError(
        error instanceof Error ? error.message : "Delete failed."
      );
    } finally {
      setDeletingProjectSlug(null);
    }
  }

  return (
    <section className="relative h-full bg-[var(--ink-wash-200)]">
      <div className="relative h-full min-h-0">
        <motion.aside
          initial={false}
          animate={{
            x: shouldHideRail ? "-100%" : "0%",
            opacity: shouldHideRail ? 0 : 1,
          }}
          transition={focusTransition}
          className="absolute inset-y-0 left-0 z-20 min-h-0 overflow-visible"
          aria-hidden={shouldHideRail}
          style={{
            width: ARCHIVE_RAIL_COLLAPSED_WIDTH,
            pointerEvents: shouldHideRail ? "none" : "auto",
          }}
        >
          <div
            className="absolute inset-y-0 left-0 border-r-2 border-black bg-[var(--ink-wash-200)]"
            style={{ width: ARCHIVE_RAIL_COLLAPSED_WIDTH }}
          />

          {editorUnlocked ? (
            <div
              className="absolute left-0 top-0 z-20 border-r-2 border-b-2 border-black bg-white px-2 py-2"
              style={{ width: ARCHIVE_RAIL_COLLAPSED_WIDTH, pointerEvents: "auto" }}
            >
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleCreateUniversity}
                  title="Add organization"
                  className="flex h-10 w-full items-center justify-center border border-black bg-black px-0 text-[10px] font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-white hover:text-black"
                >
                  Add
                </button>
                {selectedUniversity ? (
                  <button
                    type="button"
                    onClick={() => handleEditUniversity(selectedUniversity.id)}
                    title={`Edit ${selectedUniversity.name}`}
                    className="flex h-10 w-full items-center justify-center border border-black bg-white px-0 text-[10px] font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-black hover:text-white"
                  >
                    Edit
                  </button>
                ) : null}
                <LogoutButton
                  redirectPath={logoutPath}
                  label="Out"
                  className="h-10 w-full px-0 tracking-[0.18em]"
                />
              </div>
            </div>
          ) : null}

          <div
            className="pointer-events-none absolute bottom-0 left-0"
            style={{ top: railHeaderOffset, width: ARCHIVE_RAIL_PANEL_WIDTH }}
          >
            <div
              ref={railScrollRef}
              className="uni-rail-scroll pointer-events-none h-full overflow-y-auto"
            >
              <div className="flex flex-col">
                <ArchiveRailButton
                  title="All Projects"
                  subtitle="Across the full consortium"
                  badgeLabel="All"
                  accentColor="#000000"
                  active={!selectedUniversity}
                  onClick={() => handleFilterChange(null)}
                />

                {universities.map((university) => {
                  const active = selectedUniversity?.id === university.id;

                  return (
                    <ArchiveRailButton
                      key={university.id}
                      title={university.name}
                      subtitle={`${university.city}, ${university.country}`}
                      badgeLabel={university.shortName}
                      accentColor={university.color}
                      active={active}
                      logo={university.logo}
                      onClick={() => handleFilterChange(university)}
                    />
                  );
                })}
              </div>
            </div>

            {railScrollMetrics.visible ? (
              <div
                className="pointer-events-none absolute inset-y-0 z-20"
                style={{
                  left: ARCHIVE_RAIL_COLLAPSED_WIDTH - 2,
                  width: 2,
                }}
              >
                <div className="absolute inset-y-0 left-0 w-[2px] bg-black/10" />
                <div
                  className="absolute left-0 w-[2px] rounded-full bg-black"
                  style={{
                    height: railScrollMetrics.thumbHeight,
                    transform: `translateY(${railScrollMetrics.thumbOffset}px)`,
                  }}
                />
              </div>
            ) : null}
          </div>
        </motion.aside>

        <motion.div
          initial={false}
          animate={{
            paddingLeft: shouldHideRail ? 0 : ARCHIVE_RAIL_COLLAPSED_WIDTH,
          }}
          transition={focusTransition}
          className="flex h-full min-h-0 w-full flex-col bg-[var(--ink-wash-200)]"
        >
          {(editorUnlocked || editRequested) && (
            <div className="border-b-2 border-black bg-white px-5 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {isEditingUniversity ? (
                    <button
                      type="button"
                      onClick={handleCloseUniversityEditor}
                      className="border border-black bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-black hover:text-white"
                    >
                      &larr; Back
                    </button>
                  ) : selectedProject && editorUnlocked ? (
                    <button
                      type="button"
                      onClick={handleCloseProject}
                      className="border border-black bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-black hover:text-white"
                    >
                      &larr; Back
                    </button>
                  ) : (
                    <>
                      {selectedUniversity ? <StatusPill label={selectedUniversity.shortName} /> : null}
                      {projectIsDirty ? <StatusPill label="Unsaved" /> : null}
                    </>
                  )}
                </div>
                {isEditingUniversity ? (
                  <span className="inline-flex items-center border border-black bg-black px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.18em] text-white">
                    {editingUniversityId === NEW_UNIVERSITY_ID ? "New Organization" : "Edit Organization"}
                  </span>
                ) : selectedProject && editorUnlocked ? (
                  <div className="flex items-center gap-2">
                    {projectIsDirty ? <StatusPill label="Unsaved" /> : null}
                    <button
                      type="button"
                      disabled={writesDisabled}
                      onClick={() => projectEditorRef.current?.openSettings()}
                      className="border border-black bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-black hover:text-white disabled:opacity-40"
                    >
                      Project Settings
                    </button>
                    <button
                      type="button"
                      disabled={projectSavingMode !== null || writesDisabled}
                      onClick={() => projectEditorRef.current?.saveDraft()}
                      className="border border-black bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-black hover:text-white disabled:opacity-40"
                    >
                      {projectSavingMode === "draft" ? "Saving..." : "Save Draft"}
                    </button>
                    <button
                      type="button"
                      disabled={projectSavingMode !== null || writesDisabled}
                      onClick={() => projectEditorRef.current?.publish()}
                      className="border border-black bg-black px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-white hover:text-black disabled:opacity-40"
                    >
                      {projectSavingMode === "publish" ? "Publishing..." : "Publish"}
                    </button>
                  </div>
                ) : editorUnlocked ? (
                  <button
                    type="button"
                    onClick={handleCreateProject}
                    className="border border-black bg-black px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-white hover:text-black"
                  >
                    Add Project
                  </button>
                ) : null}
              </div>
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto">
            {selectedProject && !editorUnlocked && (
              <div className="pointer-events-none sticky top-0 z-30 -mb-[44px] px-8 py-4">
                <button
                  type="button"
                  onClick={handleCloseProject}
                  className="pointer-events-auto border border-black bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-black shadow-sm transition hover:bg-black hover:text-white"
                >
                  &larr; Back
                </button>
              </div>
            )}
            <div className="space-y-5 px-5 py-5">
              {editorUnlocked && writesDisabled ? (
                <div className="border-2 border-[#D97706] bg-[#FFF4E8] px-4 py-4 text-sm leading-7 text-[#8A3B12]">
                  {getPortalWriteDisabledMessage()}
                </div>
              ) : null}

              {isEditingUniversity && editorUnlocked ? (
                <motion.div
                  key={`uni-editor-${editingUniversityId}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                >
                  <UniversityEditor
                    key={editingUniversityId}
                    mode={editingUniversityId === NEW_UNIVERSITY_ID ? "create" : "edit"}
                    university={editingUniversity ?? undefined}
                    writesDisabled={writesDisabled}
                    onBack={handleCloseUniversityEditor}
                    onSaved={handleUniversitySaved}
                    onDeleted={handleUniversityDeleted}
                  />
                </motion.div>
              ) : null}

              <AnimatePresence initial={false}>
                {selectedProject && editorUnlocked && !isEditingUniversity ? (
                  <motion.div
                    key={`editor-${selectedProject.slug}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                  >
                    <ProjectEditor
                      ref={projectEditorRef}
                      key={selectedProject.slug}
                      mode={selectedProject.slug === NEW_PROJECT_SLUG ? "create" : "edit"}
                      currentSlug={
                        selectedProject.slug === NEW_PROJECT_SLUG
                          ? undefined
                          : selectedProject.slug
                      }
                      initialProject={selectedProject.document ?? createEmptyProjectDocument()}
                      universities={baseUniversities}
                      writesDisabled={writesDisabled}
                      hideTopBar
                      onBack={handleCloseProject}
                      onSavingStateChange={setProjectSavingMode}
                      onDocumentChange={(document) =>
                        setEditorProjectState((current) => ({
                          routeSlug: current?.routeSlug ?? selectedSlug ?? NEW_PROJECT_SLUG,
                          savedSlug: current?.savedSlug,
                          document,
                        }))
                      }
                      onDirtyStateChange={setProjectIsDirty}
                      onSaveSuccess={({ slug, document }) =>
                        setEditorProjectState((current) => ({
                          routeSlug: current?.routeSlug ?? selectedSlug ?? slug,
                          savedSlug: slug,
                          document,
                        }))
                      }
                    />
                  </motion.div>
                ) : selectedProject ? (
                  <ArchiveProjectDetail
                    key={selectedProject.slug}
                    project={selectedProject}
                    index={Math.max(0, selectedProjectIndex)}
                    onClose={handleCloseProject}
                    showBadges={editorUnlocked}
                  />
                ) : null}
              </AnimatePresence>

              {!selectedProject && !isEditingUniversity && filteredProjects.length ? (
                <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
                  {filteredProjects.map((project, index) => (
                    <ProjectCardDisplay
                      key={project.slug}
                      project={{
                        slug: project.slug,
                        title: project.title,
                        thumbnail: project.thumbnail,
                        year: project.year,
                        tags: project.tags,
                        locationLabel: project.locationLabel,
                        shortName: project.shortName,
                        color: project.color,
                        logo: project.logo,
                        status: project.status,
                        hasUnpublishedChanges: project.hasUnpublishedChanges,
                      }}
                      index={index}
                      onSelect={() => handleSelectProject(project.slug)}
                      onPreview={() => handleProjectPreviewStart(project.slug)}
                      onPreviewEnd={() => handleProjectPreviewEnd(project.slug)}
                      onDelete={
                        editorUnlocked && !writesDisabled
                          ? () => {
                              setProjectDeleteError(null);
                              setProjectDeleteTarget(project);
                            }
                          : undefined
                      }
                      deletePending={deletingProjectSlug === project.slug}
                      showBadges={editorUnlocked}
                      isActive={previewProjectSlug === project.slug}
                    />
                  ))}
                </div>
              ) : !selectedProject && !isEditingUniversity ? (
                <div className="border-2 border-dashed border-black/30 bg-white px-5 py-12 text-sm leading-7 text-black/65">
                  No published projects are available for this university yet.
                </div>
              ) : null}
            </div>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {editRequested && !editorSessionAvailable ? (
          <AccessGate nextPath={currentPath} onExit={handleExitEditMode} />
        ) : null}
        {projectDeleteTarget ? (
          <DeleteProjectDialog
            project={projectDeleteTarget}
            deleting={deletingProjectSlug === projectDeleteTarget.slug}
            error={projectDeleteError}
            onCancel={() => {
              if (deletingProjectSlug) return;
              setProjectDeleteError(null);
              setProjectDeleteTarget(null);
            }}
            onConfirm={() => void handleConfirmProjectDelete()}
          />
        ) : null}
      </AnimatePresence>
    </section>
  );
}
