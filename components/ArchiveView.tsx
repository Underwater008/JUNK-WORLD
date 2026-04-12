"use client";

import { useRef, useMemo, useState } from "react";
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
import type { ProjectDocument, University } from "@/types";

const NEW_UNIVERSITY_ID = "__new_university__";

const NEW_PROJECT_SLUG = "__new__";
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

interface ArchiveViewProps {
  universities: University[];
  baseUniversities: University[];
  selectedUniversity: University | null;
  onSelectUniversity: (uni: University | null) => void;
  onPreviewProjectChange: (slug: string | null) => void;
  editorSessionAvailable: boolean;
  writesDisabled: boolean;
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
            Unlock inline editing for cards, metadata, media, globe targets, and project body content.
          </p>
          <LoginForm nextPath={nextPath} submitLabel="Unlock Editor" />
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
      {/* Top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-black/8 bg-white/95 px-5 py-3 backdrop-blur-sm">
        <button
          type="button"
          onClick={onClose}
          className="text-[11px] font-medium text-black/40 transition hover:text-black/70"
        >
          ← Back
        </button>
      </div>

      {/* Cover image */}
      {project.thumbnail ? (
        <div className="h-52 overflow-hidden sm:h-64">
          <img
            src={project.thumbnail}
            alt={project.title}
            className="h-full w-full object-cover"
          />
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
        <h1 className="mt-4 font-serif text-[2.8rem] leading-[1.05] text-black">
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
  editorSessionAvailable,
  writesDisabled,
}: ArchiveViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedSlug = searchParams.get("project");
  const editRequested = searchParams.get("edit") === "1";
  const editorUnlocked = editRequested && editorSessionAvailable;
  const [localDraft, setLocalDraft] = useState<ProjectDocument | null>(null);
  const [editingUniversityId, setEditingUniversityId] = useState<string | null>(null);
  const [projectSavingMode, setProjectSavingMode] = useState<"draft" | "publish" | null>(null);
  const projectEditorRef = useRef<ProjectEditorHandle>(null);
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
  const pendingDraft = localDraft ?? routeDraft;

  const allProjects = useMemo<ArchiveProjectEntry[]>(
    () => {
      const entries = universities
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

      if (editorUnlocked && pendingDraft) {
        const draftUniversity = baseUniversitiesById.get(pendingDraft.universityId);

        entries.unshift({
          id: "local-draft",
          slug: NEW_PROJECT_SLUG,
          title: pendingDraft.title || "Untitled Draft",
          description:
            pendingDraft.summary ||
            "New draft project. Add a title, set the globe location, and build the page body.",
          year: pendingDraft.year,
          thumbnail: pendingDraft.cardImageUrl || pendingDraft.coverImageUrl,
          participants: pendingDraft.participantsCount,
          tags: pendingDraft.tags,
          locationLabel:
            pendingDraft.locationLabel ||
            (draftUniversity
              ? `${draftUniversity.city}, ${draftUniversity.country}`
              : "Location pending"),
          universityId: pendingDraft.universityId,
          university: draftUniversity?.name ?? "Unassigned",
          shortName: draftUniversity?.shortName ?? "NEW",
          city: draftUniversity?.city ?? "Unknown",
          country: draftUniversity?.country ?? "",
          color: draftUniversity?.color ?? "#000000",
          logo: draftUniversity?.logo,
          status: "draft",
          hasUnpublishedChanges: true,
          document: pendingDraft,
        });
      }

      return entries;
    },
    [baseUniversitiesById, editorUnlocked, pendingDraft, universities]
  );

  const filteredProjects = selectedUniversity
    ? allProjects.filter((project) => project.universityId === selectedUniversity.id)
    : allProjects;

  const selectedProject =
    filteredProjects.find((project) => project.slug === selectedSlug) ?? null;
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
  const currentPath = searchParams.toString()
    ? `${pathname}?${searchParams.toString()}`
    : pathname;
  const logoutPath = selectedProject
    ? selectedProject.slug === NEW_PROJECT_SLUG
      ? "/?view=projects"
      : `/?view=projects&project=${selectedProject.slug}`
    : "/?view=projects";

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
    setLocalDraft(createEmptyProjectDocument());
    onSelectUniversity(null);
    onPreviewProjectChange(null);

    replaceQuery((params) => {
      params.set("view", "projects");
      params.set("edit", "1");
      params.set("project", NEW_PROJECT_SLUG);
    });
  }

  function handleSelectProject(slug: string) {
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
    if (selectedSlug === NEW_PROJECT_SLUG) {
      setLocalDraft(null);
    }

    onPreviewProjectChange(null);
    replaceQuery((params) => {
      params.delete("project");
    });
  }

  function handleExitEditMode() {
    setLocalDraft(null);
    setEditingUniversityId(null);
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

  function handleUniversitySaved(savedId: string) {
    setEditingUniversityId(savedId);
    router.refresh();
  }

  function handleUniversityDeleted() {
    setEditingUniversityId(null);
    router.refresh();
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
                  All Projects
                </span>
                <span className="mt-0.5 block text-xs font-medium text-[var(--ink-wash-700)]">
                  {allProjects.length} project{allProjects.length === 1 ? "" : "s"}
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
                        {university.city}, {university.country}
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
                    </>
                  )}
                </div>
                {isEditingUniversity ? (
                  <span className="inline-flex items-center border border-black bg-black px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.18em] text-white">
                    {editingUniversityId === NEW_UNIVERSITY_ID ? "New Organization" : "Edit Organization"}
                  </span>
                ) : selectedProject && editorUnlocked ? (
                  <div className="flex items-center gap-2">
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
                      onPreview={() => onPreviewProjectChange(project.slug)}
                      onPreviewEnd={() => onPreviewProjectChange(null)}
                      showBadges={editorUnlocked}
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
      </AnimatePresence>
    </section>
  );
}
