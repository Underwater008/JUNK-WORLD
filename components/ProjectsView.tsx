"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Globe from "@/components/Globe";
import LoginForm from "@/components/portal/LoginForm";
import LogoutButton from "@/components/portal/LogoutButton";
import ProjectCardDisplay from "@/components/ProjectCardDisplay";
import ProjectEditor from "@/components/portal/ProjectEditor";
import { createEmptyProjectDocument } from "@/lib/projects/defaults";
import { getPortalWriteDisabledMessage } from "@/lib/portal/mode";
import type { ProjectDocument, University } from "@/types";

const NEW_PROJECT_SLUG = "__new__";
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

interface ProjectsViewProps {
  universities: University[];
  baseUniversities: University[];
  mobile?: boolean;
  editorSessionAvailable: boolean;
  writesDisabled: boolean;
  showGlobe?: boolean;
  onPreviewProjectChange?: (slug: string | null) => void;
}

function formatIndex(index: number) {
  return String(index + 1).padStart(2, "0");
}

function getProjectPath(slug: string) {
  const params = new URLSearchParams({
    view: "projects",
    project: slug,
  });
  return `/?${params.toString()}`;
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

function ProjectImage({
  project,
  index,
  large = false,
}: {
  project: ProjectEntry;
  index: number;
  large?: boolean;
}) {
  const imageSrc =
    project.thumbnail || project.logo || "/images/JUNK logos/junk-logo-square.png";
  const hasThumbnail = Boolean(project.thumbnail);

  return (
    <div
      className={`relative overflow-hidden border-b-2 border-black bg-[#F3F2EE] ${
        large ? "h-[280px] sm:h-[360px] lg:h-[420px]" : "h-44 sm:h-48"
      }`}
    >
      {hasThumbnail ? (
        <img
          src={imageSrc}
          alt={project.title}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <>
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(145deg, ${project.color}36 0%, rgba(255,255,255,0.96) 48%, rgba(241,241,241,0.94) 100%)`,
            }}
          />
          <div
            className="absolute inset-0 opacity-70"
            style={{
              backgroundImage:
                "linear-gradient(rgba(0, 0, 0, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.08) 1px, transparent 1px)",
              backgroundSize: large ? "32px 32px" : "24px 24px",
            }}
          />
          <span className="absolute left-4 top-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#6A6A6A]">
            Archive Still / {formatIndex(index)}
          </span>
          <span
            className="absolute right-4 top-4 h-3 w-3 rounded-full border border-black/20"
            style={{ backgroundColor: project.color }}
          />
          <span
            className={`absolute -left-4 bottom-0 font-serif leading-none text-black/6 ${
              large ? "text-[8rem]" : "text-[6rem]"
            }`}
          >
            {formatIndex(index)}
          </span>
          <div className="absolute inset-x-5 bottom-5">
            <div className="flex items-end justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#6A6A6A]">
                  {project.shortName} / {project.year}
                </p>
                <p
                  className={`mt-2 max-w-[16ch] overflow-hidden font-serif leading-[0.92] text-black ${
                    large ? "text-[2.6rem]" : "text-[1.45rem]"
                  }`}
                  style={{
                    display: "-webkit-box",
                    WebkitLineClamp: large ? 3 : 2,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {project.title}
                </p>
              </div>
              {project.logo ? (
                <img
                  src={project.logo}
                  alt={project.university}
                  className={`w-auto max-w-[140px] object-contain grayscale ${
                    large ? "h-16" : "h-12"
                  }`}
                />
              ) : null}
            </div>
          </div>
        </>
      )}

      {hasThumbnail ? (
        <>
          <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-black/10 to-transparent" />
          <div className="absolute inset-x-5 bottom-5 text-white">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/70">
              {project.locationLabel || `${project.city}, ${project.country}`}
            </p>
            <p
              className={`mt-2 max-w-[16ch] overflow-hidden font-serif leading-[0.92] text-white ${
                large ? "text-[2.7rem]" : "text-[1.5rem]"
              }`}
              style={{
                display: "-webkit-box",
                WebkitLineClamp: large ? 3 : 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              {project.title}
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}

function FocusedHeroCard({
  project,
  index,
  showBadges,
}: {
  project: ProjectEntry;
  index: number;
  showBadges: boolean;
}) {
  return (
    <motion.div
      layoutId={`project-card-${project.slug}`}
      className="overflow-hidden border-2 border-black bg-white shadow-[10px_10px_0_#000]"
    >
      <ProjectImage project={project} index={index} large />
      <div className="border-t-2 border-black bg-white px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#6F6F6F]">
              {project.shortName} / {project.year}
            </p>
            <h2 className="mt-3 font-serif text-[clamp(2.2rem,5vw,4.3rem)] leading-[0.92] text-black">
              {project.title}
            </h2>
            <p className="mt-4 max-w-4xl text-sm leading-7 text-black/78 sm:text-base">
              {project.description}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {project.tags.map((tag) => (
              <StatusPill key={tag} label={tag} />
            ))}
            {showBadges ? <StatusPill label={project.status} /> : null}
            {showBadges && project.hasUnpublishedChanges ? (
              <StatusPill label="Draft Changes" filled />
            ) : null}
          </div>
        </div>
      </div>
    </motion.div>
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
        This project does not have a published document yet.
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
        <MetaBlock label="Location" value={project.locationLabel || `${project.city}, ${project.country}`} />
        <MetaBlock label="Participants" value={project.participants} />
        <MetaBlock label="University" value={project.university} />
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

      <div className={`grid gap-5 ${mobile ? "grid-cols-1" : "xl:grid-cols-[minmax(0,0.9fr)_minmax(260px,0.5fr)]"}`}>
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
                    <dd className="mt-2 text-sm leading-6 text-black">{credit.value}</dd>
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
            Unlock inline editing for cards, globe targets, cover media, and block content.
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
  const universitiesById = useMemo(
    () => new Map(universities.map((university) => [university.id, university])),
    [universities]
  );
  const baseUniversitiesById = useMemo(
    () => new Map(baseUniversities.map((university) => [university.id, university])),
    [baseUniversities]
  );
  const [previewSlug, setPreviewSlug] = useState<string | null>(null);
  const [localDraft, setLocalDraft] = useState<ProjectDocument | null>(null);

  const editRequested = searchParams.get("edit") === "1";
  const selectedSlug = searchParams.get("project");
  const editorUnlocked = editRequested && editorSessionAvailable;
  const routeDraft = useMemo(
    () =>
      selectedSlug === NEW_PROJECT_SLUG && editorUnlocked
        ? createEmptyProjectDocument()
        : null,
    [editorUnlocked, selectedSlug]
  );
  const pendingDraft = localDraft ?? routeDraft;

  const projects = useMemo<ProjectEntry[]>(() => {
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
          markerOffset: project.markerOffset,
          locationLabel: project.locationLabel || `${university.city}, ${university.country}`,
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
        markerOffset: pendingDraft.markerOffset,
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
  }, [baseUniversitiesById, editorUnlocked, pendingDraft, universities]);

  const selectedProject =
    projects.find((project) => project.slug === selectedSlug) ?? null;
  const previewProject =
    selectedProject ||
    projects.find((project) => project.slug === previewSlug) ||
    projects[0] ||
    null;
  const focusProject = selectedProject ?? previewProject;

  const focusedUniversity =
    (focusProject?.universityId
      ? universitiesById.get(focusProject.universityId)
      : null) ?? null;

  const currentPath = searchParams.toString()
    ? `${pathname}?${searchParams.toString()}`
    : pathname;
  const logoutPath = selectedProject
    ? selectedProject.slug === NEW_PROJECT_SLUG
      ? "/?view=projects"
      : getProjectPath(selectedProject.slug)
    : "/?view=projects";

  function replaceQuery(mutator: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutator(params);
    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    });
  }

  function handleSelectProject(slug: string) {
    replaceQuery((params) => {
      params.set("view", "projects");
      params.set("project", slug);
    });
  }

  function handlePreviewChange(slug: string | null) {
    setPreviewSlug(slug);
    onPreviewProjectChange?.(slug);
  }

  function handleCloseProject() {
    if (selectedSlug === NEW_PROJECT_SLUG) {
      setLocalDraft(null);
    }

    handlePreviewChange(null);

    replaceQuery((params) => {
      params.delete("project");
    });
  }

  function handleExitEditMode() {
    setLocalDraft(null);
    handlePreviewChange(null);
    replaceQuery((params) => {
      params.delete("edit");
      if (params.get("project") === NEW_PROJECT_SLUG) {
        params.delete("project");
      }
    });
  }

  function handleCreateProject() {
    setLocalDraft(createEmptyProjectDocument());
    replaceQuery((params) => {
      params.set("view", "projects");
      params.set("edit", "1");
      params.set("project", NEW_PROJECT_SLUG);
    });
  }

  const contentProject = selectedProject;
  const selectedIndex = contentProject
    ? Math.max(
        0,
        projects.findIndex((project) => project.slug === contentProject.slug)
      )
    : 0;
  const showBadges = editorUnlocked;
  const draftCount = projects.filter((project) => project.status === "draft").length;
  const changedCount = projects.filter((project) => project.hasUnpublishedChanges).length;

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
              <StatusPill label={`${projects.length} Projects`} />
              {editorUnlocked ? <StatusPill label={`${draftCount} Drafts`} /> : null}
              {editorUnlocked && changedCount ? (
                <StatusPill label={`${changedCount} Unpublished`} filled />
              ) : null}
            </div>
            {editorUnlocked ? (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleCreateProject}
                  className="border border-black bg-black px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-white hover:text-black"
                >
                  Add Project
                </button>
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
                  ? contentProject
                    ? "h-[280px]"
                    : "h-[240px]"
                  : contentProject
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
                      {focusProject ? focusProject.title : "Browse the map"}
                    </h2>
                    <p className="mt-3 max-w-xl text-sm leading-7 text-black/72 sm:text-base">
                      {focusProject
                        ? `${focusProject.locationLabel || `${focusProject.city}, ${focusProject.country}`}. The globe is tracking this project point.`
                        : "Hover or select a project card to rotate the globe toward that project's location."}
                    </p>
                  </div>
                  {focusProject ? (
                    <StatusPill label={focusProject.shortName} filled />
                  ) : (
                    <StatusPill label="All Nodes" />
                  )}
                </div>
              </div>

              <Globe
                universities={universities}
                selectedUniversity={focusedUniversity}
                onSelectUniversity={() => {}}
                hoveredProject={focusProject?.id ?? null}
                compact
                allowDragInCompact
                scale={
                  mobile
                    ? contentProject
                      ? 1.12
                      : 0.96
                    : contentProject
                      ? 1.28
                      : 1.02
                }
                hideLabels={false}
                soloLabelId={focusedUniversity?.id}
                maxLabels={focusedUniversity ? 1 : mobile ? 4 : 7}
              />

              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-wrap items-end justify-between gap-3 bg-gradient-to-t from-[#F4F0E8] via-[#F4F0E8]/80 to-transparent px-4 pb-4 pt-12 sm:px-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-black/55">
                  {focusProject?.locationLabel ||
                    (focusedUniversity
                      ? `${focusedUniversity.city}, ${focusedUniversity.country}`
                      : "No project selected")}
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
            {contentProject ? (
              <motion.div
                key={`focus-${contentProject.slug}`}
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
                    Back To All Projects
                  </button>
                  <div className="flex flex-wrap gap-2">
                    <StatusPill label={contentProject.university} />
                    {showBadges ? <StatusPill label={contentProject.status} /> : null}
                    {showBadges && contentProject.hasUnpublishedChanges ? (
                      <StatusPill label="Draft Changes" filled />
                    ) : null}
                  </div>
                </div>

                <FocusedHeroCard
                  project={contentProject}
                  index={selectedIndex}
                  showBadges={showBadges}
                />

                {editorUnlocked ? (
                  <ProjectEditor
                    key={contentProject.slug}
                    variant="inline"
                    mode={contentProject.slug === NEW_PROJECT_SLUG ? "create" : "edit"}
                    currentSlug={
                      contentProject.slug === NEW_PROJECT_SLUG
                        ? undefined
                        : contentProject.slug
                    }
                    initialProject={
                      contentProject.document ?? createEmptyProjectDocument()
                    }
                    universities={baseUniversities}
                    writesDisabled={writesDisabled}
                  />
                ) : (
                  <ProjectContent project={contentProject} mobile={mobile} />
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
                {projects.length ? (
                  <div
                    className={`grid gap-3 ${
                      mobile ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
                    }`}
                  >
                    {projects.map((project, index) => (
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
                        onPreview={() => handlePreviewChange(project.slug)}
                        onPreviewEnd={() =>
                          handlePreviewChange(
                            previewSlug === project.slug ? null : previewSlug
                          )
                        }
                        showBadges={showBadges}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-black/30 bg-white px-5 py-12 text-sm leading-7 text-black/65">
                    No published projects are available yet.
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
