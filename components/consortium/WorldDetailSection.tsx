"use client";

import ProjectCardDisplay from "@/components/ProjectCardDisplay";

type WorldDetailProject = {
  id: string;
  slug: string;
  title: string;
  thumbnail: string;
  year: number;
  tags: string[];
  locationLabel: string;
  shortName: string;
  color: string;
  logo?: string;
  status: "draft" | "published";
  hasUnpublishedChanges: boolean;
};

type WorldDetailWorld = {
  title: string;
  description: string;
  year: number;
  thumbnail: string;
  locationLabel: string;
  university: string;
  shortName: string;
  logo?: string;
  status: "draft" | "published";
  hasUnpublishedChanges: boolean;
  projects: WorldDetailProject[];
};

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

interface WorldDetailSectionProps {
  world: WorldDetailWorld;
  compact?: boolean;
  showCover?: boolean;
  showBadges?: boolean;
  emptyMessage: string;
  onSelectProject: (slug: string) => void;
  onPreviewProject?: (slug: string) => void;
  onPreviewProjectEnd?: (slug: string) => void;
  onDeleteProject?: (slug: string) => void;
  deletingProjectSlug?: string | null;
  activeProjectSlug?: string | null;
}

export default function WorldDetailSection({
  world,
  compact = false,
  showCover = false,
  showBadges = false,
  emptyMessage,
  onSelectProject,
  onPreviewProject,
  onPreviewProjectEnd,
  onDeleteProject,
  deletingProjectSlug = null,
  activeProjectSlug = null,
}: WorldDetailSectionProps) {
  return (
    <div className="space-y-5">
      {showCover ? (
        world.thumbnail ? (
          <div className="overflow-hidden border-2 border-black bg-white">
            <div className={compact ? "h-[220px]" : "h-[280px] sm:h-[360px]"}>
              <img
                src={world.thumbnail}
                alt={world.title}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        ) : (
          <div className="overflow-hidden border-2 border-black bg-[linear-gradient(135deg,#ede7dd_0%,#f7f4ed_52%,#efe6d8_100%)]">
            <div className={compact ? "h-[220px]" : "h-[280px] sm:h-[360px]"} />
          </div>
        )
      ) : null}

      <section className="overflow-hidden">
        <div className="px-5 py-5">
          <div className="flex flex-wrap items-center gap-2 text-[12px] text-black/50">
            {world.logo ? (
              <img
                src={world.logo}
                alt={world.shortName}
                className="h-4 w-auto object-contain opacity-50"
              />
            ) : null}
            <span>{world.university}</span>
            <span className="text-black/25">·</span>
            <span>{world.locationLabel}</span>
            <span className="text-black/25">·</span>
            <span>{world.year}</span>
          </div>

          <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="font-serif text-[clamp(2.3rem,5vw,4rem)] leading-[0.94] text-black">
                {world.title}
              </h2>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-black/72 sm:text-base">
                {world.description}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {showBadges ? <StatusPill label={world.status} /> : null}
              {showBadges && world.hasUnpublishedChanges ? (
                <StatusPill label="Draft Changes" filled />
              ) : null}
            </div>
          </div>
        </div>

        <div className="border-t border-black/10 bg-[var(--ink-wash-200)] px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/45">
                Projects Inside This World
              </p>
              <p className="mt-2 text-sm leading-7 text-black/65">
                {world.projects.length
                  ? "Select a child project to open its full page and editorial body."
                  : emptyMessage}
              </p>
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/45">
              {world.projects.length} project{world.projects.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        <div className="border-t border-black/10 px-5 py-5">
          {world.projects.length ? (
            <div
              className={`grid gap-3 ${
                compact ? "grid-cols-2" : "grid-cols-2 xl:grid-cols-3"
              }`}
            >
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
                  onPreview={
                    onPreviewProject ? () => onPreviewProject(project.slug) : undefined
                  }
                  onPreviewEnd={
                    onPreviewProjectEnd
                      ? () => onPreviewProjectEnd(project.slug)
                      : undefined
                  }
                  onDelete={
                    onDeleteProject
                      ? () => onDeleteProject(project.slug)
                      : undefined
                  }
                  deletePending={deletingProjectSlug === project.slug}
                  showBadges={showBadges}
                  isActive={activeProjectSlug === project.slug}
                />
              ))}
            </div>
          ) : (
            <div className="border-2 border-dashed border-black/20 bg-white px-5 py-12 text-sm leading-7 text-black/65">
              {emptyMessage}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
