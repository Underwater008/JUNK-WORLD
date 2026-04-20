"use client";

import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import LoginForm from "@/components/portal/LoginForm";
import LogoutButton from "@/components/portal/LogoutButton";
import ProjectCardDisplay from "@/components/ProjectCardDisplay";
import ProjectEditor, { type ProjectEditorHandle } from "@/components/portal/ProjectEditor";
import UniversityEditor from "@/components/portal/UniversityEditor";
import WorldEditor, { type WorldEditorHandle } from "@/components/portal/WorldEditor";
import WorldDetailSection from "@/components/consortium/WorldDetailSection";
import { createEmptyProjectDocument } from "@/lib/projects/defaults";
import { getPortalWriteDisabledMessage } from "@/lib/portal/mode";
import { uploadAsset } from "@/lib/uploads";
import { createEmptyWorldDocument } from "@/lib/worlds/defaults";
import type {
  ProjectDocument,
  ProjectGalleryItem,
  ProjectMarkerOffset,
  University,
  WorldDocument,
} from "@/types";

const NEW_UNIVERSITY_ID = "__new_university__";
const NEW_WORLD_SLUG = "__new_world__";
const NEW_PROJECT_SLUG = "__new_project__";

const BlockNoteDocument = dynamic(
  () => import("@/components/projects/BlockNoteDocument"),
  {
    ssr: false,
    loading: () => <div className="min-h-[220px] bg-black/[0.02]" />,
  }
);

type ArchiveProjectEntry = {
  id: string;
  worldId: string;
  worldSlug: string;
  worldTitle: string;
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

type ArchiveWorldEntry = {
  id: string;
  slug: string;
  title: string;
  description: string;
  year: number;
  thumbnail: string;
  tags: string[];
  markerOffset: ProjectMarkerOffset;
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
  document: WorldDocument | null;
  projects: ArchiveProjectEntry[];
};

type EditorWorldState = {
  routeSlug: string;
  savedSlug?: string;
  document: WorldDocument;
};

type EditorProjectState = {
  routeSlug: string;
  savedSlug?: string;
  document: ProjectDocument;
};

export type SelectedStageSnapshot = {
  entityType: "world" | "project";
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

export type SelectedStageController = {
  uploadGalleryFiles: (files: File[]) => Promise<void>;
  setGalleryItems: (items: ProjectGalleryItem[]) => void;
  setMarkerOffset: (markerOffset: ProjectMarkerOffset) => void;
};

interface ArchiveViewProps {
  universities: University[];
  baseUniversities: University[];
  selectedUniversity: University | null;
  onSelectUniversity: (uni: University | null) => void;
  onPreviewStageChange: (slug: string | null) => void;
  onStageOpenStart?: (slug: string) => void;
  previewStageSlug?: string | null;
  onSelectedStageChange?: (project: SelectedStageSnapshot | null) => void;
  selectedStageControllerRef?: MutableRefObject<SelectedStageController | null>;
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
            Unlock inline editing for worlds, child projects, media, and globe targets.
          </p>
          <LoginForm nextPath={nextPath} submitLabel="Unlock Editor" />
        </section>
      </motion.div>
    </motion.div>
  );
}

function DeleteWorldDialog({
  world,
  deleting,
  error,
  onCancel,
  onConfirm,
}: {
  world: ArchiveWorldEntry;
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
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-red-600">
            Delete World
          </p>
          <h3 className="mt-4 font-serif text-3xl leading-none text-black">
            Delete &ldquo;{world.title}&rdquo;?
          </h3>
          <p className="mt-4 max-w-md text-sm leading-7 text-black/60">
            This will permanently remove the world and all {world.projects.length} child
            project{world.projects.length === 1 ? "" : "s"} from the archive and portal.
          </p>
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-black/40">
            {world.shortName} / {world.year}
          </p>
          {error ? (
            <p className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}
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
}: {
  project: ArchiveProjectEntry;
}) {
  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="bg-white"
    >
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

      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="flex items-center gap-2 text-[12px] text-black/50">
          {project.logo ? (
            <img
              src={project.logo}
              alt={project.shortName}
              className="h-4 w-auto object-contain opacity-50"
            />
          ) : null}
          <span>{project.university}</span>
          <span className="text-black/25">·</span>
          <span>{project.worldTitle}</span>
          <span className="text-black/25">·</span>
          <span>{project.locationLabel}</span>
          <span className="text-black/25">·</span>
          <span>{project.year}</span>
          <span className="text-black/25">·</span>
          <span>{project.participants} participants</span>
        </div>

        <h1 className="mt-5 font-serif text-[clamp(2.75rem,5vw,4.4rem)] leading-[0.98] text-black">
          {project.title}
        </h1>

        {project.description ? (
          <p className="mt-3 text-base leading-7 text-black/65">
            {project.description}
          </p>
        ) : null}

        <div className="my-6 h-px bg-black/8" />

        {project.document?.body?.length ? (
          <BlockNoteDocument body={project.document.body} className="project-body" />
        ) : (
          <div className="border border-black/10 bg-black/[0.02] px-4 py-4 text-sm leading-7 text-black/60">
            This project does not have a published page yet.
          </div>
        )}

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

        {project.document?.collaborators?.length ? (
          <>
            <div className="my-6 h-px bg-black/8" />
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-black/35">
              Collaborators
            </p>
            <div className="mt-2 space-y-1">
              {project.document.collaborators.map((person, index) => (
                <p key={index} className="text-sm text-black/60">
                  {person.name}
                  {person.role ? (
                    <span className="text-black/30"> · {person.role}</span>
                  ) : null}
                </p>
              ))}
            </div>
          </>
        ) : null}

        {project.document?.credits?.length ? (
          <>
            <div className="my-6 h-px bg-black/8" />
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-black/35">
              Credits
            </p>
            <div className="mt-2 space-y-1">
              {project.document.credits.map((credit, index) => (
                <p key={index} className="whitespace-pre-line text-sm text-black/60">
                  <span className="text-black/35">{credit.label}:</span> {credit.value}
                </p>
              ))}
            </div>
          </>
        ) : null}

        {project.document?.externalLinks?.length ? (
          <>
            <div className="my-6 h-px bg-black/8" />
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-black/35">
              Links
            </p>
            <div className="mt-2 space-y-1">
              {project.document.externalLinks.map((link, index) => (
                <a
                  key={index}
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

function WorldProjectManagementSection({
  world,
  onSelectProject,
  onDeleteProject,
  deletingProjectSlug,
  activeProjectSlug,
}: {
  world: ArchiveWorldEntry;
  onSelectProject: (slug: string) => void;
  onDeleteProject: (slug: string) => void;
  deletingProjectSlug: string | null;
  activeProjectSlug: string | null;
}) {
  return (
    <section className="overflow-hidden">
      <div className="border-t border-black/10 bg-[var(--ink-wash-200)] px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-black">
              Projects Inside This World
            </p>
            <p className="mt-2 text-sm leading-7 text-black/65">
              Child projects keep the rich page body, credits, collaborators, and links.
            </p>
          </div>
          <StatusPill label={`${world.projects.length} Projects`} />
        </div>
      </div>

      <div className="border-t border-black/10 px-5 py-5">
        {world.projects.length ? (
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
            {world.projects.map((project, index) => (
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
                onSelect={() => onSelectProject(project.slug)}
                onDelete={() => onDeleteProject(project.slug)}
                deletePending={deletingProjectSlug === project.slug}
                showBadges
                isActive={activeProjectSlug === project.slug}
              />
            ))}
          </div>
        ) : (
          <div className="border-2 border-dashed border-black/20 bg-[var(--ink-wash-200)] px-5 py-12 text-sm leading-7 text-black/65">
            No child projects exist in this world yet.
          </div>
        )}
      </div>
    </section>
  );
}

export default function ArchiveView({
  universities,
  baseUniversities,
  selectedUniversity,
  onSelectUniversity,
  onPreviewStageChange,
  onStageOpenStart,
  previewStageSlug = null,
  onSelectedStageChange,
  selectedStageControllerRef,
  editorSessionAvailable,
  writesDisabled,
}: ArchiveViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedWorldSlug = searchParams.get("world");
  const selectedProjectSlug = searchParams.get("project");
  const editRequested = searchParams.get("edit") === "1";
  const editorUnlocked = editRequested && editorSessionAvailable;
  const [worldEditorState, setWorldEditorState] = useState<EditorWorldState | null>(null);
  const [projectEditorState, setProjectEditorState] = useState<EditorProjectState | null>(null);
  const [editingUniversityId, setEditingUniversityId] = useState<string | null>(null);
  const [worldSavingMode, setWorldSavingMode] = useState<"draft" | "publish" | null>(null);
  const [projectSavingMode, setProjectSavingMode] = useState<"draft" | "publish" | null>(null);
  const [worldIsDirty, setWorldIsDirty] = useState(false);
  const [projectIsDirty, setProjectIsDirty] = useState(false);
  const [worldDeleteTarget, setWorldDeleteTarget] = useState<ArchiveWorldEntry | null>(null);
  const [projectDeleteTarget, setProjectDeleteTarget] = useState<ArchiveProjectEntry | null>(null);
  const [worldDeleteError, setWorldDeleteError] = useState<string | null>(null);
  const [projectDeleteError, setProjectDeleteError] = useState<string | null>(null);
  const [deletingWorldSlug, setDeletingWorldSlug] = useState<string | null>(null);
  const [deletingProjectSlug, setDeletingProjectSlug] = useState<string | null>(null);
  const worldEditorRef = useRef<WorldEditorHandle>(null);
  const projectEditorRef = useRef<ProjectEditorHandle>(null);
  const baseUniversitiesById = useMemo(
    () => new Map(baseUniversities.map((university) => [university.id, university])),
    [baseUniversities]
  );

  const routeWorldDraft = useMemo(
    () =>
      selectedWorldSlug === NEW_WORLD_SLUG && editorUnlocked
        ? createEmptyWorldDocument()
        : null,
    [editorUnlocked, selectedWorldSlug]
  );

  const activeWorldEditorState = useMemo(() => {
    if (!worldEditorState) return null;

    if (!selectedWorldSlug) {
      return worldEditorState.routeSlug === NEW_WORLD_SLUG && !worldEditorState.savedSlug
        ? null
        : worldEditorState;
    }

    return selectedWorldSlug === worldEditorState.routeSlug ||
      selectedWorldSlug === worldEditorState.savedSlug
      ? worldEditorState
      : null;
  }, [selectedWorldSlug, worldEditorState]);

  const allWorlds = useMemo<ArchiveWorldEntry[]>(() => {
    const mappedWorlds: ArchiveWorldEntry[] = universities
      .flatMap((university) =>
        university.worlds.map<ArchiveWorldEntry>((world) => ({
          id: world.id,
          slug: world.slug ?? world.id,
          title: world.title,
          description: world.description,
          year: world.year,
          thumbnail: world.thumbnail,
          tags: [],
          markerOffset: world.document?.markerOffset ?? world.markerOffset,
          locationLabel:
            world.locationLabel || `${university.city}, ${university.country}`,
          universityId: university.id,
          university: university.name,
          shortName: university.shortName,
          city: university.city,
          country: university.country,
          color: university.color,
          logo: university.logo,
          status: world.status ?? "published",
          hasUnpublishedChanges: world.hasUnpublishedChanges ?? false,
          document: world.document ?? null,
          projects: world.projects
            .map<ArchiveProjectEntry>((project) => ({
              id: project.id,
              worldId: world.id,
              worldSlug: world.slug ?? world.id,
              worldTitle: world.title,
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
            .sort((a, b) => b.year - a.year || a.title.localeCompare(b.title)),
        }))
      )
      .sort((a, b) => b.year - a.year || a.title.localeCompare(b.title));

    const draftWorldDocument =
      activeWorldEditorState?.document ?? (editorUnlocked ? routeWorldDraft : null);

    if (!draftWorldDocument) {
      return mappedWorlds;
    }

    const optimisticSlug =
      activeWorldEditorState?.savedSlug ??
      activeWorldEditorState?.routeSlug ??
      NEW_WORLD_SLUG;
    const matchedIndex = mappedWorlds.findIndex(
      (world) =>
        world.slug === activeWorldEditorState?.routeSlug ||
        world.slug === activeWorldEditorState?.savedSlug
    );
    const matchedWorld = matchedIndex >= 0 ? mappedWorlds[matchedIndex] : null;
    const draftUniversity = baseUniversitiesById.get(draftWorldDocument.universityId);
    const optimisticWorld: ArchiveWorldEntry = {
      id: matchedWorld?.id ?? "local-world",
      slug: optimisticSlug,
      title: draftWorldDocument.title || matchedWorld?.title || "Untitled World",
      description:
        draftWorldDocument.summary ||
        matchedWorld?.description ||
        "New draft world. Add a title, set the globe location, and shape the overview.",
      year: draftWorldDocument.year,
      thumbnail:
        draftWorldDocument.cardImageUrl ||
        draftWorldDocument.coverImageUrl ||
        matchedWorld?.thumbnail ||
        "",
      tags: [],
      markerOffset: draftWorldDocument.markerOffset,
      locationLabel:
        draftWorldDocument.locationLabel ||
        (draftUniversity
          ? `${draftUniversity.city}, ${draftUniversity.country}`
          : matchedWorld?.locationLabel || "Location pending"),
      universityId: draftWorldDocument.universityId || matchedWorld?.universityId || "",
      university: draftUniversity?.name ?? matchedWorld?.university ?? "Unassigned",
      shortName: draftUniversity?.shortName ?? matchedWorld?.shortName ?? "NEW",
      city: draftUniversity?.city ?? matchedWorld?.city ?? "Unknown",
      country: draftUniversity?.country ?? matchedWorld?.country ?? "",
      color: draftUniversity?.color ?? matchedWorld?.color ?? "#000000",
      logo: draftUniversity?.logo ?? matchedWorld?.logo,
      status: matchedWorld?.status ?? "draft",
      hasUnpublishedChanges: true,
      document: draftWorldDocument,
      projects: matchedWorld?.projects ?? [],
    };

    if (matchedIndex >= 0) {
      mappedWorlds[matchedIndex] = optimisticWorld;
    } else if (editorUnlocked) {
      mappedWorlds.unshift(optimisticWorld);
    }

    return mappedWorlds;
  }, [activeWorldEditorState, baseUniversitiesById, editorUnlocked, routeWorldDraft, universities]);

  const filteredWorlds = selectedUniversity
    ? allWorlds.filter((world) => world.universityId === selectedUniversity.id)
    : allWorlds;

  const routeProjectDraft = useMemo(() => {
    if (selectedProjectSlug !== NEW_PROJECT_SLUG || !editorUnlocked) return null;
    if (!selectedWorldSlug || selectedWorldSlug === NEW_WORLD_SLUG) return null;

    const world = allWorlds.find((entry) => entry.slug === selectedWorldSlug);
    if (!world) return null;

    const draft = createEmptyProjectDocument();
    draft.universityId = world.universityId;
    draft.worldId = world.id;
    draft.year = world.year;
    draft.markerOffset = world.document?.markerOffset ?? world.markerOffset;
    draft.locationLabel = world.locationLabel;
    return draft;
  }, [allWorlds, editorUnlocked, selectedProjectSlug, selectedWorldSlug]);

  const activeProjectEditorState = useMemo(() => {
    if (!projectEditorState) return null;

    if (!selectedProjectSlug) {
      return projectEditorState.routeSlug === NEW_PROJECT_SLUG && !projectEditorState.savedSlug
        ? null
        : projectEditorState;
    }

    return selectedProjectSlug === projectEditorState.routeSlug ||
      selectedProjectSlug === projectEditorState.savedSlug
      ? projectEditorState
      : null;
  }, [projectEditorState, selectedProjectSlug]);

  const worldsWithProjects = useMemo(() => {
    const nextWorlds = allWorlds.map((world) => ({
      ...world,
      projects: [...world.projects],
    }));
    const draftProjectDocument =
      activeProjectEditorState?.document ?? (editorUnlocked ? routeProjectDraft : null);

    if (!draftProjectDocument) {
      return nextWorlds;
    }

    const worldIndex = nextWorlds.findIndex((world) => world.id === draftProjectDocument.worldId);
    if (worldIndex < 0) {
      return nextWorlds;
    }

    const world = nextWorlds[worldIndex];
    const optimisticSlug =
      activeProjectEditorState?.savedSlug ??
      activeProjectEditorState?.routeSlug ??
      NEW_PROJECT_SLUG;
    const matchedIndex = world.projects.findIndex(
      (project) =>
        project.slug === activeProjectEditorState?.routeSlug ||
        project.slug === activeProjectEditorState?.savedSlug
    );
    const matchedProject = matchedIndex >= 0 ? world.projects[matchedIndex] : null;
    const optimisticProject: ArchiveProjectEntry = {
      id: matchedProject?.id ?? "local-project",
      worldId: world.id,
      worldSlug: world.slug,
      worldTitle: world.title,
      slug: optimisticSlug,
      title: draftProjectDocument.title || matchedProject?.title || "Untitled Project",
      description:
        draftProjectDocument.summary ||
        matchedProject?.description ||
        "New draft project. Add a title, set the globe location, and build the page body.",
      year: draftProjectDocument.year,
      thumbnail:
        draftProjectDocument.cardImageUrl ||
        draftProjectDocument.coverImageUrl ||
        matchedProject?.thumbnail ||
        "",
      participants: draftProjectDocument.participantsCount,
      tags: draftProjectDocument.tags,
      locationLabel: draftProjectDocument.locationLabel || world.locationLabel,
      universityId: world.universityId,
      university: world.university,
      shortName: world.shortName,
      city: world.city,
      country: world.country,
      color: world.color,
      logo: world.logo,
      status: matchedProject?.status ?? "draft",
      hasUnpublishedChanges: true,
      document: draftProjectDocument,
    };

    if (matchedIndex >= 0) {
      world.projects[matchedIndex] = optimisticProject;
    } else if (editorUnlocked) {
      world.projects.unshift(optimisticProject);
    }

    return nextWorlds;
  }, [activeProjectEditorState, allWorlds, editorUnlocked, routeProjectDraft]);

  const allProjects = useMemo(
    () => worldsWithProjects.flatMap((world) => world.projects),
    [worldsWithProjects]
  );

  const legacyWorldSelection =
    !selectedWorldSlug && selectedProjectSlug
      ? filteredWorlds.find((world) => world.slug === selectedProjectSlug) ??
        allWorlds.find((world) => world.slug === selectedProjectSlug) ??
        null
      : null;

  const directlySelectedProject = selectedProjectSlug
    ? allProjects.find((project) => project.slug === selectedProjectSlug) ?? null
    : null;

  const selectedWorld =
    selectedWorldSlug
      ? worldsWithProjects.find((world) => world.slug === selectedWorldSlug) ?? null
      : directlySelectedProject
        ? worldsWithProjects.find((world) => world.id === directlySelectedProject.worldId) ??
          null
        : legacyWorldSelection;

  const selectedProject =
    selectedProjectSlug && selectedWorld
      ? selectedWorld.projects.find((project) => project.slug === selectedProjectSlug) ??
        (directlySelectedProject?.worldId === selectedWorld.id
          ? directlySelectedProject
          : null)
      : null;

  const editingUniversity = editingUniversityId
    ? editingUniversityId === NEW_UNIVERSITY_ID
      ? undefined
      : baseUniversities.find((university) => university.id === editingUniversityId)
    : null;
  const isEditingUniversity = editingUniversityId !== null;
  const shouldHideRail = Boolean(selectedProject) || isEditingUniversity;
  const focusTransition = {
    duration: 0.38,
    ease: [0.22, 1, 0.36, 1] as const,
  };
  const currentPath = searchParams.toString()
    ? `${pathname}?${searchParams.toString()}`
    : pathname;

  const logoutPath = selectedProject
    ? `/?view=projects&world=${encodeURIComponent(selectedProject.worldSlug)}&project=${encodeURIComponent(selectedProject.slug)}`
    : selectedWorld
      ? `/?view=projects&world=${encodeURIComponent(selectedWorld.slug)}`
      : "/?view=projects";

  const selectedStage = useMemo<SelectedStageSnapshot | null>(() => {
    if (selectedProject) {
      return {
        entityType: "project",
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
      };
    }

    if (selectedWorld) {
      return {
        entityType: "world",
        id: selectedWorld.id,
        slug: selectedWorld.slug,
        universityId: selectedWorld.universityId,
        title: selectedWorld.title,
        universityName: selectedWorld.university,
        shortName: selectedWorld.shortName,
        color: selectedWorld.color,
        locationLabel: selectedWorld.locationLabel,
        gallery: selectedWorld.document?.gallery ?? [],
        markerOffset:
          selectedWorld.document?.markerOffset ?? { lat: 0, lng: 0 },
      };
    }

    return null;
  }, [selectedProject, selectedWorld]);

  useEffect(() => {
    onSelectedStageChange?.(selectedStage);
  }, [onSelectedStageChange, selectedStage]);

  useEffect(() => {
    if (!selectedStageControllerRef) return;

    if (!editorUnlocked || writesDisabled || !selectedStage) {
      selectedStageControllerRef.current = null;
      return;
    }

    if (selectedStage.entityType === "project" && selectedProject) {
      selectedStageControllerRef.current = {
        uploadGalleryFiles: async (files: File[]) => {
          if (!files.length) return;

          const uploadedItems = await Promise.all(
            files.map(async (file) => ({
              url: await uploadAsset(file, "projects/gallery"),
              alt: createGalleryAlt(file.name),
            }))
          );

          const nextGallery = [...(selectedProject.document?.gallery ?? []), ...uploadedItems];
          projectEditorRef.current?.setGalleryItems(nextGallery);
        },
        setGalleryItems: (items) => {
          projectEditorRef.current?.setGalleryItems(items);
        },
        setMarkerOffset: (markerOffset) => {
          projectEditorRef.current?.setMarkerOffset(markerOffset);
        },
      };
      return;
    }

    if (selectedStage.entityType === "world" && selectedWorld) {
      selectedStageControllerRef.current = {
        uploadGalleryFiles: async (files: File[]) => {
          if (!files.length) return;

          const uploadedItems = await Promise.all(
            files.map(async (file) => ({
              url: await uploadAsset(file, "worlds/gallery"),
              alt: createGalleryAlt(file.name),
            }))
          );

          const nextGallery = [...(selectedWorld.document?.gallery ?? []), ...uploadedItems];
          worldEditorRef.current?.setGalleryItems(nextGallery);
        },
        setGalleryItems: (items) => {
          worldEditorRef.current?.setGalleryItems(items);
        },
        setMarkerOffset: (markerOffset) => {
          worldEditorRef.current?.setMarkerOffset(markerOffset);
        },
      };
      return;
    }

    selectedStageControllerRef.current = null;
  }, [
    editorUnlocked,
    selectedProject,
    selectedStage,
    selectedStageControllerRef,
    selectedWorld,
    writesDisabled,
  ]);

  useEffect(() => {
    if (selectedWorldSlug || !selectedProjectSlug) return;

    const params = new URLSearchParams(searchParams.toString());

    if (directlySelectedProject && selectedWorld) {
      params.set("world", selectedWorld.slug);
      params.set("project", directlySelectedProject.slug);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      return;
    }

    if (legacyWorldSelection) {
      params.set("world", legacyWorldSelection.slug);
      params.delete("project");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [
    directlySelectedProject,
    legacyWorldSelection,
    pathname,
    router,
    searchParams,
    selectedProjectSlug,
    selectedWorld,
    selectedWorldSlug,
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
    onPreviewStageChange(null);

    replaceQuery((params) => {
      params.set("view", "projects");
      params.delete("world");
      params.delete("project");
    });
  }

  function handleSelectWorld(slug: string) {
    onPreviewStageChange(null);
    onStageOpenStart?.(slug);
    replaceQuery((params) => {
      params.set("view", "projects");
      params.set("world", slug);
      params.delete("project");
    });
  }

  function handleSelectProject(slug: string) {
    if (!selectedWorld) return;
    onPreviewStageChange(null);
    onStageOpenStart?.(slug);
    replaceQuery((params) => {
      params.set("view", "projects");
      params.set("world", selectedWorld.slug);
      params.set("project", slug);
    });
  }

  function handleCloseProject() {
    if (selectedProjectSlug === NEW_PROJECT_SLUG) {
      setProjectEditorState(null);
      setProjectIsDirty(false);
    }

    onPreviewStageChange(null);

    replaceQuery((params) => {
      params.delete("project");
    });
  }

  function handleCloseWorld() {
    if (selectedWorldSlug === NEW_WORLD_SLUG) {
      setWorldEditorState(null);
      setWorldIsDirty(false);
    }

    onPreviewStageChange(null);

    replaceQuery((params) => {
      params.delete("world");
      params.delete("project");
    });
  }

  function handleExitEditMode() {
    setWorldEditorState(null);
    setProjectEditorState(null);
    setWorldIsDirty(false);
    setProjectIsDirty(false);
    onPreviewStageChange(null);

    replaceQuery((params) => {
      params.delete("edit");
      if (params.get("world") === NEW_WORLD_SLUG) {
        params.delete("world");
      }
      if (params.get("project") === NEW_PROJECT_SLUG) {
        params.delete("project");
      }
    });
  }

  function handleCreateWorld() {
    setWorldEditorState({
      routeSlug: NEW_WORLD_SLUG,
      document: createEmptyWorldDocument(),
    });
    setWorldIsDirty(false);
    replaceQuery((params) => {
      params.set("view", "projects");
      params.set("edit", "1");
      params.set("world", NEW_WORLD_SLUG);
      params.delete("project");
    });
  }

  function handleCreateProject() {
    if (!selectedWorld || selectedWorld.slug === NEW_WORLD_SLUG) return;

    const draft = createEmptyProjectDocument();
    draft.universityId = selectedWorld.universityId;
    draft.worldId = selectedWorld.id;
    draft.year = selectedWorld.year;
    draft.markerOffset = selectedWorld.document?.markerOffset ?? selectedWorld.markerOffset;
    draft.locationLabel = selectedWorld.locationLabel;

    setProjectEditorState({
      routeSlug: NEW_PROJECT_SLUG,
      document: draft,
    });
    setProjectIsDirty(false);

    replaceQuery((params) => {
      params.set("view", "projects");
      params.set("edit", "1");
      params.set("world", selectedWorld.slug);
      params.set("project", NEW_PROJECT_SLUG);
    });
  }

  function handleCreateUniversity() {
    setEditingUniversityId(NEW_UNIVERSITY_ID);
  }

  function handleEditUniversity(universityId: string) {
    setEditingUniversityId(universityId);
  }

  function handleCloseUniversityEditor() {
    setEditingUniversityId(null);
  }

  function handleUniversitySaved(savedId: string) {
    setEditingUniversityId(null);
    const savedUniversity =
      baseUniversities.find((university) => university.id === savedId) ?? null;
    onSelectUniversity(savedUniversity);
    router.refresh();
  }

  function handleUniversityDeleted() {
    setEditingUniversityId(null);
    onSelectUniversity(null);
    replaceQuery((params) => {
      params.delete("world");
      params.delete("project");
    });
    router.refresh();
  }

  async function handleConfirmWorldDelete() {
    if (!worldDeleteTarget) return;

    setDeletingWorldSlug(worldDeleteTarget.slug);
    setWorldDeleteError(null);

    try {
      const response = await fetch(
        `/api/portal/worlds/${encodeURIComponent(worldDeleteTarget.slug)}`,
        {
          method: "DELETE",
        }
      );
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Delete failed.");
      }

      if (selectedWorld?.slug === worldDeleteTarget.slug) {
        handleCloseWorld();
      }

      setWorldEditorState((current) => {
        if (!current) return null;
        return current.routeSlug === worldDeleteTarget.slug ||
          current.savedSlug === worldDeleteTarget.slug
          ? null
          : current;
      });
      setWorldIsDirty(false);
      setWorldDeleteTarget(null);
      router.refresh();
    } catch (error) {
      setWorldDeleteError(
        error instanceof Error ? error.message : "Delete failed."
      );
    } finally {
      setDeletingWorldSlug(null);
    }
  }

  async function handleConfirmProjectDelete() {
    if (!projectDeleteTarget) return;

    setDeletingProjectSlug(projectDeleteTarget.slug);
    setProjectDeleteError(null);

    try {
      const response = await fetch(
        `/api/portal/projects/${encodeURIComponent(projectDeleteTarget.slug)}`,
        {
          method: "DELETE",
        }
      );
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Delete failed.");
      }

      if (selectedProject?.slug === projectDeleteTarget.slug) {
        handleCloseProject();
      }

      setProjectEditorState((current) => {
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

  const headerDirty = selectedProject ? projectIsDirty : selectedWorld ? worldIsDirty : false;
  const headerSavingMode = selectedProject ? projectSavingMode : worldSavingMode;

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
          className="absolute inset-y-0 left-0 z-20 flex w-[320px] min-h-0 flex-col overflow-hidden border-r-2 border-black bg-[var(--ink-wash-200)]"
          aria-hidden={shouldHideRail}
          style={{ pointerEvents: shouldHideRail ? "none" : "auto" }}
        >
          {editorUnlocked && (
            <div className="flex items-center justify-between border-b-2 border-black bg-white px-4 py-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCreateUniversity}
                  className="border border-black bg-black px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-white hover:text-black"
                >
                  + Add
                </button>
                {selectedUniversity ? (
                  <button
                    type="button"
                    onClick={() => handleEditUniversity(selectedUniversity.id)}
                    className="border border-black bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-black hover:text-white"
                  >
                    Edit
                  </button>
                ) : null}
              </div>
              <LogoutButton redirectPath={logoutPath} />
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto">
            <button
              type="button"
              onClick={() => handleFilterChange(null)}
              className={`group flex w-full cursor-pointer items-center gap-4 border-b border-black/10 px-6 py-5 text-left transition-colors ${
                !selectedUniversity ? "bg-white" : "hover:bg-black/5"
              }`}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-bold uppercase text-[var(--ink-wash-700)]">
                All
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-sm font-semibold leading-tight text-black">
                  All Worlds
                </span>
                <span className="mt-0.5 block text-xs font-medium text-[var(--ink-wash-700)]">
                  {allWorlds.length} world{allWorlds.length === 1 ? "" : "s"}
                </span>
              </div>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke={!selectedUniversity ? "#000" : "#CCC"}
                strokeWidth="2.5"
                className="shrink-0 transition-colors group-hover:stroke-black"
              >
                <path d="M6 4L10 8L6 12" />
              </svg>
            </button>

            {universities.map((university) => {
              const active = selectedUniversity?.id === university.id;
              const worldCount = university.worlds.length;

              return (
                <button
                  key={university.id}
                  type="button"
                  onClick={() => handleFilterChange(university)}
                  className={`group flex w-full cursor-pointer items-center gap-4 border-b border-black/10 px-6 py-5 text-left transition-colors ${
                    active ? "bg-white" : "hover:bg-black/5"
                  }`}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    {university.logo ? (
                      <img
                        src={university.logo}
                        alt={university.shortName}
                        className="h-8 w-8 shrink-0 object-contain"
                      />
                    ) : (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-bold uppercase text-[var(--ink-wash-700)]">
                        {university.shortName}
                      </div>
                    )}

                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--ink-wash-700)]">
                        {university.shortName}
                      </p>
                      <p className="mt-1 text-sm font-semibold leading-5 text-black">
                        {university.name}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[var(--ink-wash-700)]">
                        {university.city}, {university.country} · {worldCount} world
                        {worldCount === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>

                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke={active ? "#000" : "#CCC"}
                    strokeWidth="2.5"
                    className="shrink-0 transition-colors group-hover:stroke-black"
                  >
                    <path d="M6 4L10 8L6 12" />
                  </svg>
                </button>
              );
            })}
          </div>
        </motion.aside>

        <motion.div
          initial={false}
          animate={{ paddingLeft: shouldHideRail ? 0 : 320 }}
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
                      ← Back
                    </button>
                  ) : selectedProject ? (
                    <button
                      type="button"
                      onClick={handleCloseProject}
                      className="border border-black bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-black hover:text-white"
                    >
                      ← Back To World
                    </button>
                  ) : selectedWorld ? (
                    <button
                      type="button"
                      onClick={handleCloseWorld}
                      className="border border-black bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-black hover:text-white"
                    >
                      ← Back
                    </button>
                  ) : (
                    <>
                      {selectedUniversity ? <StatusPill label={selectedUniversity.shortName} /> : null}
                      {headerDirty ? <StatusPill label="Unsaved" /> : null}
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
                      disabled={headerSavingMode !== null || writesDisabled}
                      onClick={() => projectEditorRef.current?.saveDraft()}
                      className="border border-black bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-black hover:text-white disabled:opacity-40"
                    >
                      {headerSavingMode === "draft" ? "Saving..." : "Save Draft"}
                    </button>
                    <button
                      type="button"
                      disabled={headerSavingMode !== null || writesDisabled}
                      onClick={() => projectEditorRef.current?.publish()}
                      className="border border-black bg-black px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-white hover:text-black disabled:opacity-40"
                    >
                      {headerSavingMode === "publish" ? "Publishing..." : "Publish"}
                    </button>
                  </div>
                ) : selectedWorld && editorUnlocked ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {worldIsDirty ? <StatusPill label="Unsaved" /> : null}
                    <button
                      type="button"
                      disabled={writesDisabled || selectedWorld.slug === NEW_WORLD_SLUG}
                      onClick={handleCreateProject}
                      className="border border-black bg-black px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-white hover:text-black disabled:opacity-40"
                    >
                      Add Project
                    </button>
                    <button
                      type="button"
                      disabled={writesDisabled}
                      onClick={() => worldEditorRef.current?.openSettings()}
                      className="border border-black bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-black hover:text-white disabled:opacity-40"
                    >
                      World Settings
                    </button>
                    <button
                      type="button"
                      disabled={headerSavingMode !== null || writesDisabled}
                      onClick={() => worldEditorRef.current?.saveDraft()}
                      className="border border-black bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-black hover:text-white disabled:opacity-40"
                    >
                      {headerSavingMode === "draft" ? "Saving..." : "Save Draft"}
                    </button>
                    <button
                      type="button"
                      disabled={headerSavingMode !== null || writesDisabled}
                      onClick={() => worldEditorRef.current?.publish()}
                      className="border border-black bg-black px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-white hover:text-black disabled:opacity-40"
                    >
                      {headerSavingMode === "publish" ? "Publishing..." : "Publish"}
                    </button>
                  </div>
                ) : editorUnlocked ? (
                  <button
                    type="button"
                    onClick={handleCreateWorld}
                    className="border border-black bg-black px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-white hover:text-black"
                  >
                    Add World
                  </button>
                ) : null}
              </div>
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto">
            {!editorUnlocked && (selectedWorld || selectedProject) ? (
              <div className="pointer-events-none sticky top-0 z-30 -mb-[44px] px-8 py-4">
                <button
                  type="button"
                  onClick={selectedProject ? handleCloseProject : handleCloseWorld}
                  className="pointer-events-auto border border-black bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-black shadow-sm transition hover:bg-black hover:text-white"
                >
                  ← Back
                </button>
              </div>
            ) : null}

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
                    key={`project-editor-${selectedProject.slug}`}
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
                      parentWorld={
                        selectedWorld
                          ? {
                              id: selectedWorld.id,
                              slug: selectedWorld.slug,
                              title: selectedWorld.title,
                            }
                          : null
                      }
                      writesDisabled={writesDisabled}
                      hideTopBar
                      onBack={handleCloseProject}
                      onSavingStateChange={setProjectSavingMode}
                      onDocumentChange={(document) =>
                        setProjectEditorState((current) => ({
                          routeSlug: current?.routeSlug ?? selectedProjectSlug ?? NEW_PROJECT_SLUG,
                          savedSlug: current?.savedSlug,
                          document,
                        }))
                      }
                      onDirtyStateChange={setProjectIsDirty}
                      onSaveSuccess={({ slug, document }) =>
                        setProjectEditorState((current) => ({
                          routeSlug: current?.routeSlug ?? selectedProjectSlug ?? slug,
                          savedSlug: slug,
                          document,
                        }))
                      }
                    />
                  </motion.div>
                ) : selectedProject ? (
                  <ArchiveProjectDetail key={selectedProject.slug} project={selectedProject} />
                ) : null}

                {selectedWorld && !selectedProject && editorUnlocked && !isEditingUniversity ? (
                  <motion.div
                    key={`world-editor-${selectedWorld.slug}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="space-y-5"
                  >
                    <WorldEditor
                      ref={worldEditorRef}
                      key={selectedWorld.slug}
                      mode={selectedWorld.slug === NEW_WORLD_SLUG ? "create" : "edit"}
                      currentSlug={
                        selectedWorld.slug === NEW_WORLD_SLUG
                          ? undefined
                          : selectedWorld.slug
                      }
                      initialWorld={selectedWorld.document ?? createEmptyWorldDocument()}
                      universities={baseUniversities}
                      writesDisabled={writesDisabled}
                      hideTopBar
                      onBack={handleCloseWorld}
                      onSavingStateChange={setWorldSavingMode}
                      onDocumentChange={(document) =>
                        setWorldEditorState((current) => ({
                          routeSlug: current?.routeSlug ?? selectedWorldSlug ?? NEW_WORLD_SLUG,
                          savedSlug: current?.savedSlug,
                          document,
                        }))
                      }
                      onDirtyStateChange={setWorldIsDirty}
                      onSaveSuccess={({ slug, document }) =>
                        setWorldEditorState((current) => ({
                          routeSlug: current?.routeSlug ?? selectedWorldSlug ?? slug,
                          savedSlug: slug,
                          document,
                        }))
                      }
                    />

                    <WorldProjectManagementSection
                      world={selectedWorld}
                      onSelectProject={handleSelectProject}
                      onDeleteProject={(slug) => {
                        const target =
                          selectedWorld.projects.find((project) => project.slug === slug) ?? null;
                        if (!target) return;
                        setProjectDeleteError(null);
                        setProjectDeleteTarget(target);
                      }}
                      deletingProjectSlug={deletingProjectSlug}
                      activeProjectSlug={previewStageSlug}
                    />
                  </motion.div>
                ) : null}

                {selectedWorld && !selectedProject && !editorUnlocked && !isEditingUniversity ? (
                  <WorldDetailSection
                    key={`world-detail-${selectedWorld.slug}`}
                    world={{
                      title: selectedWorld.title,
                      description: selectedWorld.description,
                      year: selectedWorld.year,
                      thumbnail: selectedWorld.thumbnail,
                      locationLabel: selectedWorld.locationLabel,
                      university: selectedWorld.university,
                      shortName: selectedWorld.shortName,
                      logo: selectedWorld.logo,
                      status: selectedWorld.status,
                      hasUnpublishedChanges: selectedWorld.hasUnpublishedChanges,
                      projects: selectedWorld.projects,
                    }}
                    emptyMessage="No child projects are published in this world yet."
                    onSelectProject={handleSelectProject}
                  />
                ) : null}
              </AnimatePresence>

              {!selectedWorld && !selectedProject && !isEditingUniversity && filteredWorlds.length ? (
                <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
                  {filteredWorlds.map((world, index) => (
                    <ProjectCardDisplay
                      key={world.slug}
                      project={{
                        slug: world.slug,
                        title: world.title,
                        thumbnail: world.thumbnail,
                        year: world.year,
                        tags: [],
                        locationLabel: world.locationLabel,
                        shortName: world.shortName,
                        color: world.color,
                        logo: world.logo,
                        status: world.status,
                        hasUnpublishedChanges: world.hasUnpublishedChanges,
                      }}
                      index={index}
                      onSelect={() => handleSelectWorld(world.slug)}
                      onPreview={() => onPreviewStageChange(world.slug)}
                      onPreviewEnd={() =>
                        onPreviewStageChange(
                          previewStageSlug === world.slug ? null : previewStageSlug
                        )
                      }
                      onDelete={
                        editorUnlocked && !writesDisabled
                          ? () => {
                              setWorldDeleteError(null);
                              setWorldDeleteTarget(world);
                            }
                          : undefined
                      }
                      deletePending={deletingWorldSlug === world.slug}
                      showBadges={editorUnlocked}
                      isActive={previewStageSlug === world.slug}
                    />
                  ))}
                </div>
              ) : !selectedWorld && !selectedProject && !isEditingUniversity ? (
                <div className="border-2 border-dashed border-black/30 bg-white px-5 py-12 text-sm leading-7 text-black/65">
                  {selectedUniversity
                    ? "No published worlds are available for this university yet."
                    : "No published worlds are available yet."}
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
        {worldDeleteTarget ? (
          <DeleteWorldDialog
            world={worldDeleteTarget}
            deleting={deletingWorldSlug === worldDeleteTarget.slug}
            error={worldDeleteError}
            onCancel={() => {
              if (deletingWorldSlug) return;
              setWorldDeleteError(null);
              setWorldDeleteTarget(null);
            }}
            onConfirm={() => void handleConfirmWorldDelete()}
          />
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
