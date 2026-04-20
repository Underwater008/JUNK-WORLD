"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Globe from "@/components/Globe";
import LoginForm from "@/components/portal/LoginForm";
import LogoutButton from "@/components/portal/LogoutButton";
import ProjectCardDisplay from "@/components/ProjectCardDisplay";
import ProjectEditor from "@/components/portal/ProjectEditor";
import WorldEditor from "@/components/portal/WorldEditor";
import WorldDetailSection from "@/components/consortium/WorldDetailSection";
import { createEmptyProjectDocument } from "@/lib/projects/defaults";
import { getPortalWriteDisabledMessage } from "@/lib/portal/mode";
import { createEmptyWorldDocument } from "@/lib/worlds/defaults";
import type { ProjectDocument, University, WorldDocument } from "@/types";

const NEW_WORLD_SLUG = "__new_world__";
const NEW_PROJECT_SLUG = "__new_project__";
const panelEase = [0.4, 0, 0.2, 1] as const;

const BlockNoteDocument = dynamic(
  () => import("@/components/projects/BlockNoteDocument"),
  {
    ssr: false,
    loading: () => <div className="min-h-[220px] bg-black/[0.02]" />,
  }
);

type ProjectEntry = {
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
  markerOffset: { lat: number; lng: number };
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

type WorldEntry = {
  id: string;
  slug: string;
  title: string;
  description: string;
  year: number;
  thumbnail: string;
  tags: string[];
  markerOffset: { lat: number; lng: number };
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
  projects: ProjectEntry[];
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

interface ProjectsViewProps {
  universities: University[];
  baseUniversities: University[];
  mobile?: boolean;
  editorSessionAvailable: boolean;
  writesDisabled: boolean;
  showGlobe?: boolean;
  onPreviewProjectChange?: (slug: string | null) => void;
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

function MetaBlock({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="border border-black bg-white px-4 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#6F6F6F]">
        {label}
      </p>
      <p className="mt-2 text-sm leading-6 text-black">{value}</p>
    </div>
  );
}

function ProjectContent({
  project,
  mobile = false,
}: {
  project: ProjectEntry;
  mobile?: boolean;
}) {
  if (!project.document) {
    return (
      <div className="border-2 border-dashed border-black/35 bg-[#FBF8F1] px-5 py-10 text-sm leading-7 text-black/60">
        This project does not have a published page yet.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div
        className={`grid gap-4 ${
          mobile ? "grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-4"
        }`}
      >
        <MetaBlock label="Location" value={project.locationLabel} />
        <MetaBlock label="Participants" value={project.participants} />
        <MetaBlock label="World" value={project.worldTitle} />
        <MetaBlock label="Year" value={project.year} />
      </div>

      <section className="overflow-hidden border-2 border-black bg-white">
        <div className="border-b-2 border-black px-5 py-4">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-black">
            Project Page
          </p>
        </div>
        <div className="p-4 sm:p-5">
          <BlockNoteDocument body={project.document.body} className="project-body" />
        </div>
      </section>

      <div
        className={`grid gap-5 ${
          mobile ? "grid-cols-1" : "xl:grid-cols-[minmax(0,0.9fr)_minmax(260px,0.5fr)]"
        }`}
      >
        <section className="space-y-5">
          {project.document.collaborators.length ? (
            <div className="overflow-hidden border-2 border-black bg-white">
              <div className="border-b-2 border-black px-5 py-4">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-black">
                  Collaborators
                </p>
              </div>
              <div className="grid gap-px bg-black sm:grid-cols-2">
                {project.document.collaborators.map((person) => (
                  <div
                    key={`${person.name}-${person.role}`}
                    className="bg-white px-4 py-4 text-sm leading-6 text-black"
                  >
                    <p className="font-semibold">{person.name}</p>
                    <p className="text-black/65">{person.role}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {project.document.externalLinks.length ? (
            <div className="overflow-hidden border-2 border-black bg-white">
              <div className="border-b-2 border-black px-5 py-4">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-black">
                  External Links
                </p>
              </div>
              <div className="space-y-3 px-4 py-4">
                {project.document.externalLinks.map((linkItem) => (
                  <a
                    key={`${linkItem.label}-${linkItem.url}`}
                    href={linkItem.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block border border-black px-3 py-3 text-sm text-black transition hover:bg-black hover:text-white"
                  >
                    {linkItem.label}
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <section className="space-y-5">
          {project.document.credits.length ? (
            <div className="overflow-hidden border-2 border-black bg-white">
              <div className="border-b-2 border-black px-5 py-4">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-black">
                  Credits
                </p>
              </div>
              <dl className="space-y-4 px-4 py-4">
                {project.document.credits.map((credit) => (
                  <div key={`${credit.label}-${credit.value}`}>
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6F6F6F]">
                      {credit.label}
                    </dt>
                    <dd className="mt-2 whitespace-pre-line text-sm leading-6 text-black">
                      {credit.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}
        </section>
      </div>
    </div>
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
        <section className="relative bg-white px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#6F6F6F]">
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
            Unlock inline editing for worlds, child projects, cover media, and globe targets.
          </p>
          <LoginForm nextPath={nextPath} submitLabel="Unlock Editor" />
        </section>
      </motion.div>
    </motion.div>
  );
}

export default function ProjectsView({
  universities,
  baseUniversities,
  mobile = false,
  editorSessionAvailable,
  writesDisabled,
  showGlobe = true,
  onPreviewProjectChange,
}: ProjectsViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [previewSlug, setPreviewSlug] = useState<string | null>(null);
  const [worldEditorState, setWorldEditorState] = useState<EditorWorldState | null>(null);
  const [projectEditorState, setProjectEditorState] = useState<EditorProjectState | null>(null);
  const editRequested = searchParams.get("edit") === "1";
  const selectedWorldSlug = searchParams.get("world");
  const selectedProjectSlug = searchParams.get("project");
  const editorUnlocked = editRequested && editorSessionAvailable;

  const routeWorldDraft = useMemo(
    () =>
      selectedWorldSlug === NEW_WORLD_SLUG && editorUnlocked
        ? createEmptyWorldDocument()
        : null,
    [editorUnlocked, selectedWorldSlug]
  );

  const activeWorldEditorState = useMemo(() => {
    if (!worldEditorState) return null;
    if (!selectedWorldSlug) return null;
    return selectedWorldSlug === worldEditorState.routeSlug ||
      selectedWorldSlug === worldEditorState.savedSlug
      ? worldEditorState
      : null;
  }, [selectedWorldSlug, worldEditorState]);

  const allWorlds = useMemo<WorldEntry[]>(() => {
    const mappedWorlds: WorldEntry[] = universities
      .flatMap((university) =>
        university.worlds.map<WorldEntry>((world) => ({
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
            .map<ProjectEntry>((project) => ({
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
              markerOffset: project.document?.markerOffset ?? project.markerOffset,
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

    const baseUniversity =
      baseUniversities.find((university) => university.id === draftWorldDocument.universityId) ??
      null;
    const optimisticWorld: WorldEntry = {
      id: "local-world",
      slug: activeWorldEditorState?.savedSlug ?? activeWorldEditorState?.routeSlug ?? NEW_WORLD_SLUG,
      title: draftWorldDocument.title || "Untitled World",
      description:
        draftWorldDocument.summary ||
        "New draft world. Add a title, set the globe location, and shape the overview.",
      year: draftWorldDocument.year,
      thumbnail: draftWorldDocument.cardImageUrl || draftWorldDocument.coverImageUrl,
      tags: [],
      markerOffset: draftWorldDocument.markerOffset,
      locationLabel:
        draftWorldDocument.locationLabel ||
        (baseUniversity ? `${baseUniversity.city}, ${baseUniversity.country}` : "Location pending"),
      universityId: draftWorldDocument.universityId,
      university: baseUniversity?.name ?? "Unassigned",
      shortName: baseUniversity?.shortName ?? "NEW",
      city: baseUniversity?.city ?? "Unknown",
      country: baseUniversity?.country ?? "",
      color: baseUniversity?.color ?? "#000000",
      logo: baseUniversity?.logo,
      status: "draft",
      hasUnpublishedChanges: true,
      document: draftWorldDocument,
      projects: [],
    };

    const existingIndex = mappedWorlds.findIndex(
      (world) => world.slug === optimisticWorld.slug
    );
    if (existingIndex >= 0) {
      mappedWorlds[existingIndex] = optimisticWorld;
    } else {
      mappedWorlds.unshift(optimisticWorld);
    }

    return mappedWorlds;
  }, [activeWorldEditorState, baseUniversities, editorUnlocked, routeWorldDraft, universities]);

  const routeProjectDraft = useMemo(() => {
    if (selectedProjectSlug !== NEW_PROJECT_SLUG || !editorUnlocked || !selectedWorldSlug) {
      return null;
    }

    const world = allWorlds.find((entry) => entry.slug === selectedWorldSlug);
    if (!world || selectedWorldSlug === NEW_WORLD_SLUG) return null;

    const draft = createEmptyProjectDocument();
    draft.universityId = world.universityId;
    draft.worldId = world.id;
    draft.year = world.year;
    draft.markerOffset = world.markerOffset;
    draft.locationLabel = world.locationLabel;
    return draft;
  }, [allWorlds, editorUnlocked, selectedProjectSlug, selectedWorldSlug]);

  const activeProjectEditorState = useMemo(() => {
    if (!projectEditorState) return null;
    if (!selectedProjectSlug) return null;
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
    const optimisticProject: ProjectEntry = {
      id: "local-project",
      worldId: world.id,
      worldSlug: world.slug,
      worldTitle: world.title,
      slug:
        activeProjectEditorState?.savedSlug ??
        activeProjectEditorState?.routeSlug ??
        NEW_PROJECT_SLUG,
      title: draftProjectDocument.title || "Untitled Project",
      description:
        draftProjectDocument.summary ||
        "New draft project. Add a title, set the globe location, and build the page body.",
      year: draftProjectDocument.year,
      thumbnail:
        draftProjectDocument.cardImageUrl || draftProjectDocument.coverImageUrl,
      participants: draftProjectDocument.participantsCount,
      tags: draftProjectDocument.tags,
      markerOffset: draftProjectDocument.markerOffset,
      locationLabel: draftProjectDocument.locationLabel,
      universityId: world.universityId,
      university: world.university,
      shortName: world.shortName,
      city: world.city,
      country: world.country,
      color: world.color,
      logo: world.logo,
      status: "draft",
      hasUnpublishedChanges: true,
      document: draftProjectDocument,
    };

    const existingIndex = world.projects.findIndex(
      (project) => project.slug === optimisticProject.slug
    );
    if (existingIndex >= 0) {
      world.projects[existingIndex] = optimisticProject;
    } else {
      world.projects.unshift(optimisticProject);
    }

    return nextWorlds;
  }, [activeProjectEditorState, allWorlds, editorUnlocked, routeProjectDraft]);

  const allProjects = useMemo(
    () => worldsWithProjects.flatMap((world) => world.projects),
    [worldsWithProjects]
  );

  const directlySelectedProject = selectedProjectSlug
    ? allProjects.find((project) => project.slug === selectedProjectSlug) ?? null
    : null;

  const legacyWorldSelection =
    !selectedWorldSlug && selectedProjectSlug
      ? worldsWithProjects.find((world) => world.slug === selectedProjectSlug) ?? null
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

  const currentPath = searchParams.toString()
    ? `${pathname}?${searchParams.toString()}`
    : pathname;
  const logoutPath = selectedProject
    ? `/?view=projects&world=${encodeURIComponent(selectedProject.worldSlug)}&project=${encodeURIComponent(selectedProject.slug)}`
    : selectedWorld
      ? `/?view=projects&world=${encodeURIComponent(selectedWorld.slug)}`
      : "/?view=projects";

  function replaceQuery(mutator: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutator(params);
    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    });
  }

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

  function handlePreviewChange(slug: string | null) {
    setPreviewSlug(slug);
    onPreviewProjectChange?.(slug);
  }

  function handleSelectWorld(slug: string) {
    handlePreviewChange(null);
    replaceQuery((params) => {
      params.set("view", "projects");
      params.set("world", slug);
      params.delete("project");
    });
  }

  function handleSelectProject(slug: string) {
    if (!selectedWorld) return;
    handlePreviewChange(null);
    replaceQuery((params) => {
      params.set("view", "projects");
      params.set("world", selectedWorld.slug);
      params.set("project", slug);
    });
  }

  function handleCloseProject() {
    if (selectedProjectSlug === NEW_PROJECT_SLUG) {
      setProjectEditorState(null);
    }

    handlePreviewChange(null);

    replaceQuery((params) => {
      params.delete("project");
    });
  }

  function handleCloseWorld() {
    if (selectedWorldSlug === NEW_WORLD_SLUG) {
      setWorldEditorState(null);
    }

    handlePreviewChange(null);

    replaceQuery((params) => {
      params.delete("world");
      params.delete("project");
    });
  }

  function handleExitEditMode() {
    setWorldEditorState(null);
    setProjectEditorState(null);
    handlePreviewChange(null);
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
    draft.markerOffset = selectedWorld.markerOffset;
    draft.locationLabel = selectedWorld.locationLabel;
    setProjectEditorState({
      routeSlug: NEW_PROJECT_SLUG,
      document: draft,
    });
    replaceQuery((params) => {
      params.set("view", "projects");
      params.set("edit", "1");
      params.set("world", selectedWorld.slug);
      params.set("project", NEW_PROJECT_SLUG);
    });
  }

  const previewWorld =
    worldsWithProjects.find((world) => world.slug === previewSlug) ??
    worldsWithProjects[0] ??
    null;
  const focusEntity = selectedProject ?? selectedWorld ?? previewWorld;
  const focusedUniversity =
    focusEntity
      ? universities.find((university) => university.id === focusEntity.universityId) ?? null
      : null;
  const focusMarker = focusEntity
    ? {
        id: focusEntity.id,
        title: focusEntity.title,
        markerOffset: focusEntity.markerOffset,
        color: focusEntity.color,
        label: focusEntity.title,
      }
    : null;
  const draftCount = worldsWithProjects.filter((world) => world.status === "draft").length;
  const changedCount = worldsWithProjects.filter((world) => world.hasUnpublishedChanges).length;

  return (
    <section
      className={`relative bg-[#F4F0E8] ${
        mobile ? "min-h-full" : showGlobe ? "min-h-[calc(100vh-56px)]" : "min-h-full"
      }`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-45"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0, 0, 0, 0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.045) 1px, transparent 1px)",
          backgroundSize: mobile ? "28px 28px" : "36px 36px",
        }}
      />

      <div className={`relative ${mobile ? "px-3 py-3" : "px-5 py-5 md:px-6 md:py-6"}`}>
        {editorUnlocked || editRequested ? (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <StatusPill label={`${worldsWithProjects.length} Worlds`} />
              {editorUnlocked ? <StatusPill label={`${draftCount} Drafts`} /> : null}
              {editorUnlocked && changedCount ? (
                <StatusPill label={`${changedCount} Unpublished`} filled />
              ) : null}
            </div>
            {editorUnlocked ? (
              <div className="flex flex-wrap items-center gap-2">
                {selectedWorld && !selectedProject ? (
                  <button
                    type="button"
                    onClick={handleCreateProject}
                    disabled={selectedWorld.slug === NEW_WORLD_SLUG}
                    className="border border-black bg-black px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-white hover:text-black disabled:opacity-40"
                  >
                    Add Project
                  </button>
                ) : !selectedProject ? (
                  <button
                    type="button"
                    onClick={handleCreateWorld}
                    className="border border-black bg-black px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-white hover:text-black"
                  >
                    Add World
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={handleExitEditMode}
                  className="border border-black bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-black hover:text-white"
                >
                  Public Mode
                </button>
                <LogoutButton redirectPath={logoutPath} />
              </div>
            ) : (
              <button
                type="button"
                onClick={handleExitEditMode}
                className="border border-black bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-black hover:text-white"
              >
                Exit Locked Edit
              </button>
            )}
          </div>
        ) : null}

        {editorUnlocked && writesDisabled ? (
          <div className="mb-4 border-2 border-[#D97706] bg-[#FFF4E8] px-4 py-4 text-sm leading-7 text-[#8A3B12]">
            {getPortalWriteDisabledMessage()}
          </div>
        ) : null}

        {showGlobe ? (
          <motion.section
            layout
            transition={{ duration: 0.45, ease: panelEase }}
            className="relative mb-6 overflow-hidden border-b-2 border-black"
          >
            <div
              className={`relative overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(255,252,246,0.92),_rgba(236,228,214,0.96)_58%,_rgba(244,240,232,1)_100%)] ${
                mobile
                  ? selectedProject
                    ? "h-[280px]"
                    : "h-[240px]"
                  : selectedProject
                    ? "h-[460px]"
                    : "h-[390px]"
              }`}
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-[#F4F0E8] via-[#F4F0E8]/80 to-transparent px-4 pb-10 pt-4 sm:px-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-2xl">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-black/55">
                      Globe Focus
                    </p>
                    <h2 className="mt-3 font-serif text-[clamp(2rem,4vw,3.8rem)] leading-[0.92] text-black">
                      {focusEntity ? focusEntity.title : "Browse the map"}
                    </h2>
                    <p className="mt-3 max-w-xl text-sm leading-7 text-black/72 sm:text-base">
                      {focusEntity
                        ? `${focusEntity.locationLabel || `${focusEntity.city}, ${focusEntity.country}`}. The globe is tracking this ${selectedProject ? "project" : "world"}.`
                        : "Hover or select a world card to rotate the globe toward that world."}
                    </p>
                  </div>
                  {focusEntity ? (
                    <StatusPill label={focusEntity.shortName} filled />
                  ) : (
                    <StatusPill label="All Nodes" />
                  )}
                </div>
              </div>

              <Globe
                universities={universities}
                selectedUniversity={focusedUniversity}
                onSelectUniversity={() => {}}
                hoveredProject={null}
                compact
                allowDragInCompact
                scale={
                  mobile
                    ? selectedProject
                      ? 1.12
                      : 0.96
                    : selectedProject
                      ? 1.28
                      : 1.02
                }
                hideLabels={false}
                soloLabelId={focusedUniversity?.id}
                maxLabels={focusedUniversity ? 1 : mobile ? 4 : 7}
                focusMarker={focusMarker}
              />

              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-wrap items-end justify-between gap-3 bg-gradient-to-t from-[#F4F0E8] via-[#F4F0E8]/80 to-transparent px-4 pb-4 pt-12 sm:px-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-black/55">
                  {focusEntity?.locationLabel ||
                    (focusedUniversity
                      ? `${focusedUniversity.city}, ${focusedUniversity.country}`
                      : "No world selected")}
                </p>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-black/55">
                  {editorUnlocked
                    ? writesDisabled
                      ? "Editor Preview"
                      : "Inline Editor"
                    : "Public Browse"}
                </p>
              </div>
            </div>
          </motion.section>
        ) : null}

        <div className="min-w-0">
          <AnimatePresence mode="wait">
            {selectedProject ? (
              <motion.div
                key={`project-${selectedProject.slug}`}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -18 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleCloseProject}
                    className="border border-black bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-black hover:text-white"
                  >
                    Back To World
                  </button>
                  <div className="flex flex-wrap gap-2">
                    <StatusPill label={selectedProject.worldTitle} />
                    {editorUnlocked ? <StatusPill label={selectedProject.status} /> : null}
                    {editorUnlocked && selectedProject.hasUnpublishedChanges ? (
                      <StatusPill label="Draft Changes" filled />
                    ) : null}
                  </div>
                </div>

                {editorUnlocked ? (
                  <ProjectEditor
                    key={selectedProject.slug}
                    variant="inline"
                    mode={selectedProject.slug === NEW_PROJECT_SLUG ? "create" : "edit"}
                    currentSlug={
                      selectedProject.slug === NEW_PROJECT_SLUG
                        ? undefined
                        : selectedProject.slug
                    }
                    initialProject={
                      selectedProject.document ?? createEmptyProjectDocument()
                    }
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
                    onDocumentChange={(document) =>
                      setProjectEditorState((current) => ({
                        routeSlug: current?.routeSlug ?? selectedProjectSlug ?? NEW_PROJECT_SLUG,
                        savedSlug: current?.savedSlug,
                        document,
                      }))
                    }
                    onSaveSuccess={({ slug, document }) =>
                      setProjectEditorState((current) => ({
                        routeSlug: current?.routeSlug ?? selectedProjectSlug ?? slug,
                        savedSlug: slug,
                        document,
                      }))
                    }
                  />
                ) : (
                  <ProjectContent project={selectedProject} mobile={mobile} />
                )}
              </motion.div>
            ) : selectedWorld ? (
              <motion.div
                key={`world-${selectedWorld.slug}`}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -18 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleCloseWorld}
                    className="border border-black bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-black hover:text-white"
                  >
                    Back To All Worlds
                  </button>
                  <div className="flex flex-wrap gap-2">
                    <StatusPill label={selectedWorld.university} />
                    {editorUnlocked ? <StatusPill label={selectedWorld.status} /> : null}
                    {editorUnlocked && selectedWorld.hasUnpublishedChanges ? (
                      <StatusPill label="Draft Changes" filled />
                    ) : null}
                  </div>
                </div>

                {editorUnlocked ? (
                  <div className="space-y-5">
                    <WorldEditor
                      key={selectedWorld.slug}
                      mode={selectedWorld.slug === NEW_WORLD_SLUG ? "create" : "edit"}
                      currentSlug={
                        selectedWorld.slug === NEW_WORLD_SLUG
                          ? undefined
                          : selectedWorld.slug
                      }
                      initialWorld={
                        selectedWorld.document ?? createEmptyWorldDocument()
                      }
                      universities={baseUniversities}
                      writesDisabled={writesDisabled}
                      onDocumentChange={(document) =>
                        setWorldEditorState((current) => ({
                          routeSlug: current?.routeSlug ?? selectedWorldSlug ?? NEW_WORLD_SLUG,
                          savedSlug: current?.savedSlug,
                          document,
                        }))
                      }
                      onSaveSuccess={({ slug, document }) =>
                        setWorldEditorState((current) => ({
                          routeSlug: current?.routeSlug ?? selectedWorldSlug ?? slug,
                          savedSlug: slug,
                          document,
                        }))
                      }
                    />

                    <section className="overflow-hidden">
                      <div className="border-t border-black/10 bg-[var(--ink-wash-200)] px-5 py-4">
                        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-black">
                          Projects Inside This World
                        </p>
                      </div>
                      <div className="border-t border-black/10 px-5 py-5">
                        {selectedWorld.projects.length ? (
                          <div className={`grid gap-3 ${mobile ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3"}`}>
                            {selectedWorld.projects.map((project, index) => (
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
                                showBadges
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
                  </div>
                ) : (
                  <WorldDetailSection
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
                    compact={mobile}
                    showCover
                    showBadges={editorUnlocked}
                    emptyMessage="No child projects are published in this world yet."
                    onSelectProject={handleSelectProject}
                  />
                )}
              </motion.div>
            ) : (
              <motion.div
                key="grid"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -18 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
              >
                {worldsWithProjects.length ? (
                  <div
                    className={`grid gap-3 ${
                      mobile ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
                    }`}
                  >
                    {worldsWithProjects.map((world, index) => (
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
                        onPreview={() => handlePreviewChange(world.slug)}
                        onPreviewEnd={() =>
                          handlePreviewChange(
                            previewSlug === world.slug ? null : previewSlug
                          )
                        }
                        showBadges={editorUnlocked}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-black/30 bg-white px-5 py-12 text-sm leading-7 text-black/65">
                    No published worlds are available yet.
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {editRequested && !editorSessionAvailable ? (
          <AccessGate nextPath={currentPath} onExit={handleExitEditMode} />
        ) : null}
      </AnimatePresence>
    </section>
  );
}
