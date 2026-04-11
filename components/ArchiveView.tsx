"use client";

import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import BlockNoteDocument from "@/components/projects/BlockNoteDocument";
import type { ProjectDocument, University } from "@/types";

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
  document: ProjectDocument | null;
};

interface ArchiveViewProps {
  universities: University[];
  selectedUniversity: University | null;
  onSelectUniversity: (uni: University | null) => void;
  onPreviewProjectChange: (slug: string | null) => void;
}

function formatIndex(index: number) {
  return String(index + 1).padStart(2, "0");
}

function extractPremise(description: string) {
  const [sentence] = description.split(". ");
  if (!sentence) return description;
  return sentence.endsWith(".") ? sentence : `${sentence}.`;
}

function ArchiveProjectImage({
  project,
  index,
  large = false,
}: {
  project: ArchiveProjectEntry;
  index: number;
  large?: boolean;
}) {
  const imageSrc = project.thumbnail || project.logo || "";
  const hasThumbnail = Boolean(project.thumbnail);

  return (
    <div
      className={`relative overflow-hidden border-b-2 border-black bg-[#F3F0E8] ${
        large ? "h-[280px] xl:h-[340px]" : "h-48"
      }`}
    >
      {hasThumbnail ? (
        <>
          <img
            src={imageSrc}
            alt={project.title}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-black/10 to-transparent" />
          <div className="absolute inset-x-5 bottom-5 text-white">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/70">
              {project.locationLabel}
            </p>
            <p
              className={`mt-2 max-w-[16ch] overflow-hidden font-serif leading-[0.92] ${
                large ? "text-[2.5rem]" : "text-[1.45rem]"
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
      ) : (
        <>
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(150deg, ${project.color}30 0%, rgba(255,255,255,0.96) 44%, rgba(244,240,232,1) 100%)`,
            }}
          />
          <div
            className="absolute inset-0 opacity-70"
            style={{
              backgroundImage:
                "linear-gradient(rgba(0, 0, 0, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.06) 1px, transparent 1px)",
              backgroundSize: large ? "34px 34px" : "24px 24px",
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
                    large ? "text-[2.5rem]" : "text-[1.45rem]"
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
                  className={`w-auto max-w-[120px] object-contain grayscale ${
                    large ? "h-14" : "h-10"
                  }`}
                />
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
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

function ArchiveProjectDetail({
  project,
  index,
  onClose,
}: {
  project: ArchiveProjectEntry;
  index: number;
  onClose: () => void;
}) {
  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <span className="border border-black bg-black px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-white">
            {project.university}
          </span>
          <span className="border border-black px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-black">
            {project.locationLabel}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="border border-black bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-black hover:text-white"
        >
          Close Project
        </button>
      </div>

      <div className="overflow-hidden border-2 border-black bg-white shadow-[8px_8px_0_#000]">
        <div className="grid xl:grid-cols-[minmax(280px,0.92fr)_minmax(0,1.08fr)]">
          <ArchiveProjectImage project={project} index={index} large />
          <div className="flex flex-col justify-between gap-5 border-t-2 border-black px-5 py-5 xl:border-l-2 xl:border-t-0 xl:px-6 xl:py-6">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#6F6F6F]">
                {project.shortName} / {project.year}
              </p>
              <h2 className="mt-3 font-serif text-[clamp(2rem,3vw,3.4rem)] leading-[0.92] text-black">
                {project.title}
              </h2>
              <p className="mt-4 text-sm leading-7 text-black/78 sm:text-base">
                {project.description}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {project.tags.map((tag) => (
                <span
                  key={tag}
                  className="border border-black px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-black"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <MetaBlock label="University" value={project.university} />
        <MetaBlock label="Location" value={project.locationLabel} />
        <MetaBlock label="Participants" value={project.participants} />
        <MetaBlock label="Year" value={project.year} />
      </div>

      {project.document?.body?.length ? (
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
      ) : null}

      {project.document?.gallery?.length ? (
        <section className="overflow-hidden border-2 border-black bg-white">
          <div className="border-b-2 border-black px-5 py-4">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-black">
              Gallery
            </p>
          </div>
          <div className="grid gap-px bg-black md:grid-cols-2">
            {project.document.gallery.map((item) => (
              <figure key={item.url} className="bg-white p-3">
                <img
                  src={item.url}
                  alt={item.alt || project.title}
                  className="aspect-[16/10] w-full object-cover"
                />
                {item.alt ? (
                  <figcaption className="mt-2 text-sm text-black/60">{item.alt}</figcaption>
                ) : null}
              </figure>
            ))}
          </div>
        </section>
      ) : null}
    </motion.section>
  );
}

function ArchiveProjectCard({
  project,
  index,
  isActive,
  onSelect,
  onPreview,
  onPreviewEnd,
}: {
  project: ArchiveProjectEntry;
  index: number;
  isActive: boolean;
  onSelect: () => void;
  onPreview: () => void;
  onPreviewEnd: () => void;
}) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.035 }}
      onClick={onSelect}
      onMouseEnter={onPreview}
      onMouseLeave={onPreviewEnd}
      onFocus={onPreview}
      onBlur={onPreviewEnd}
      className={`group flex h-full flex-col overflow-hidden border-2 border-black bg-white text-left transition shadow-[6px_6px_0_#000] ${
        isActive
          ? "translate-x-[3px] translate-y-[3px] shadow-[3px_3px_0_#000]"
          : "hover:-translate-y-1 hover:shadow-[9px_9px_0_#000]"
      }`}
    >
      <ArchiveProjectImage project={project} index={index} />
      <div className="flex flex-1 flex-col px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#6F6F6F]">
              {project.shortName} / {project.year}
            </p>
            <h3
              className="mt-2 min-h-[2.8rem] overflow-hidden font-serif text-[1.5rem] leading-[0.94] text-black"
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              {project.title}
            </h3>
          </div>
          <span className="font-serif text-3xl leading-none text-black/15">
            {formatIndex(index)}
          </span>
        </div>

        <p
          className="mt-3 overflow-hidden text-[13px] leading-5 text-black/85"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
          }}
        >
          {extractPremise(project.description)}
        </p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {project.tags.map((tag) => (
            <span
              key={tag}
              className="border border-black px-1.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-black"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-auto flex items-end justify-between gap-4 border-t border-black pt-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#6F6F6F]">
              Origin
            </p>
            <p className="mt-1 text-[13px] leading-5 text-black">{project.university}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/55">
              Open
            </span>
            <div className="h-[3px] w-12 shrink-0" style={{ backgroundColor: project.color }} />
          </div>
        </div>
      </div>
    </motion.button>
  );
}

export default function ArchiveView({
  universities,
  selectedUniversity,
  onSelectUniversity,
  onPreviewProjectChange,
}: ArchiveViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedSlug = searchParams.get("project");

  const allProjects = useMemo<ArchiveProjectEntry[]>(
    () =>
      universities
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
            document: project.document ?? null,
          }))
        )
        .sort((a, b) => b.year - a.year || a.title.localeCompare(b.title)),
    [universities]
  );

  const filteredProjects = selectedUniversity
    ? allProjects.filter((project) => project.universityId === selectedUniversity.id)
    : allProjects;

  const selectedProject =
    filteredProjects.find((project) => project.slug === selectedSlug) ?? null;
  const selectedProjectIndex = selectedProject
    ? filteredProjects.findIndex((project) => project.slug === selectedProject.slug)
    : -1;

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
    onPreviewProjectChange(null);
    replaceQuery((params) => {
      params.delete("project");
    });
  }

  return (
    <section className="h-full bg-[#F4F0E8]">
      <div className="grid h-full min-h-0 grid-cols-[320px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-r-2 border-black bg-[#EFE7D8]">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <button
              type="button"
              onClick={() => handleFilterChange(null)}
              className={`group flex w-full cursor-pointer items-center gap-4 border-b border-black/10 px-6 py-5 text-left transition-colors ${
                !selectedUniversity ? "bg-[#E9DFCC]" : "hover:bg-[#EFE8DA]"
              }`}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E7DDCA] text-[10px] font-bold uppercase text-[#888]">
                All
              </div>

              <div className="min-w-0 flex-1">
                <span className="block text-sm font-semibold leading-tight text-black">
                  All Projects
                </span>
                <span className="mt-0.5 block text-xs font-medium text-[#888]">
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
                    active ? "bg-[#E9DFCC]" : "hover:bg-[#EFE8DA]"
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
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E7DDCA] text-[10px] font-bold uppercase text-[#888]">
                        {university.shortName}
                      </div>
                    )}

                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/45">
                        {university.shortName}
                      </p>
                      <p className="mt-1 text-sm font-semibold leading-5 text-black">
                        {university.name}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-black/55">
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
        </aside>

        <div className="flex min-h-0 flex-col bg-[#F6F0E4]">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="space-y-5 px-5 py-5">
              <AnimatePresence initial={false}>
                {selectedProject ? (
                  <ArchiveProjectDetail
                    key={selectedProject.slug}
                    project={selectedProject}
                    index={Math.max(0, selectedProjectIndex)}
                    onClose={handleCloseProject}
                  />
                ) : null}
              </AnimatePresence>

              {filteredProjects.length ? (
                <div className="grid gap-4 xl:grid-cols-2">
                  {filteredProjects.map((project, index) => (
                    <ArchiveProjectCard
                      key={project.slug}
                      project={project}
                      index={index}
                      isActive={selectedProject?.slug === project.slug}
                      onSelect={() => handleSelectProject(project.slug)}
                      onPreview={() => onPreviewProjectChange(project.slug)}
                      onPreviewEnd={() => onPreviewProjectChange(null)}
                    />
                  ))}
                </div>
              ) : (
                <div className="border-2 border-dashed border-black/30 bg-white px-5 py-12 text-sm leading-7 text-black/65">
                  No published projects are available for this university yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
