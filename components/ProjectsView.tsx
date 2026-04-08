"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Globe from "@/components/Globe";
import { University } from "@/types";

type ProjectEntry = {
  id: string;
  title: string;
  description: string;
  year: number;
  thumbnail: string;
  participants: number;
  tags: string[];
  markerOffset: { lat: number; lng: number };
  university: string;
  shortName: string;
  city: string;
  country: string;
  color: string;
  logo?: string;
};

interface ProjectsViewProps {
  universities: University[];
  mobile?: boolean;
}

function formatIndex(index: number) {
  return String(index + 1).padStart(2, "0");
}

function extractPremise(description: string) {
  const [sentence] = description.split(". ");
  return sentence.endsWith(".") ? sentence : `${sentence}.`;
}

function formatCoordinate(value: number, positive: string, negative: string) {
  const suffix = value >= 0 ? positive : negative;
  return `${Math.abs(value).toFixed(2)}° ${suffix}`;
}

function ProjectImage({
  project,
  index,
}: {
  project: ProjectEntry;
  index: number;
}) {
  const imageSrc =
    project.thumbnail || project.logo || "/images/JUNK logos/junk-logo-square.png";
  const hasThumbnail = Boolean(project.thumbnail);

  return (
    <div className="relative h-44 overflow-hidden border-b-2 border-black bg-[#F3F2EE] sm:h-48">
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
              background: `linear-gradient(145deg, ${project.color}3B 0%, rgba(255,255,255,0.96) 48%, rgba(241,241,241,0.96) 100%)`,
            }}
          />
          <div
            className="absolute inset-0 opacity-70"
            style={{
              backgroundImage:
                "linear-gradient(rgba(0, 0, 0, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.08) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />
          <span className="absolute left-3 top-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#6A6A6A]">
            Archive Still / {formatIndex(index)}
          </span>
          <span
            className="absolute right-3 top-3 h-3 w-3 rounded-full border border-black/20"
            style={{ backgroundColor: project.color }}
          />
          <span className="absolute -left-3 bottom-2 font-serif text-[6rem] leading-none text-black/6">
            {formatIndex(index)}
          </span>
          <div className="absolute inset-x-5 bottom-5">
            <div className="flex items-end justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#6A6A6A]">
                  {project.shortName} / {project.year}
                </p>
                <p
                  className="mt-2 max-w-[16ch] overflow-hidden font-serif text-[1.45rem] leading-[0.92] text-black"
                  style={{
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
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
                  className="h-12 w-auto max-w-[130px] object-contain grayscale"
                />
              ) : null}
            </div>
          </div>
        </>
      )}

      {hasThumbnail && (
        <>
          <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-black/8 to-transparent" />
          <div className="absolute inset-x-5 bottom-5 text-white">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/70">
              {project.city}, {project.country}
            </p>
            <p
              className="mt-2 max-w-[16ch] overflow-hidden font-serif text-[1.5rem] leading-[0.92] text-white"
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              {project.title}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function ProjectCard({
  project,
  index,
  active,
  onActivate,
}: {
  project: ProjectEntry;
  index: number;
  active: boolean;
  onActivate: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.05 }}
      whileHover={{ y: -4 }}
      onMouseEnter={onActivate}
      onFocus={onActivate}
      onClick={onActivate}
      className="h-full pb-[8px] pr-[8px]"
    >
      <article
        className={`group flex h-full flex-col overflow-hidden border-2 border-black bg-white transition-shadow ${
          active ? "shadow-[8px_8px_0_#000]" : "hover:shadow-[6px_6px_0_#000]"
        }`}
      >
        <ProjectImage project={project} index={index} />

        <div className="flex flex-1 flex-col px-3 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#6F6F6F]">
                {project.shortName} / {project.year}
              </p>
              <h2
                className="mt-1.5 min-h-[2.7rem] overflow-hidden font-serif text-[1.45rem] leading-[0.94] text-black"
                style={{
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {project.title}
              </h2>
            </div>
            <span className="font-serif text-3xl leading-none text-black/15">
              {formatIndex(index)}
            </span>
          </div>

          <p
            className="mt-2.5 overflow-hidden text-[13px] leading-5 text-black/85"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {extractPremise(project.description)}
          </p>

          <div className="mt-3 mb-3 flex flex-wrap gap-1.5">
            {project.tags.map((tag) => (
              <span
                key={tag}
                className="border border-black px-1.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-black"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-auto flex items-end justify-between gap-4 border-t border-black pt-2.5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#6F6F6F]">
                Origin
              </p>
              <p className="mt-1 text-[13px] leading-5 text-black">
                {project.university}
              </p>
            </div>
            <div
              className="h-[3px] w-12 shrink-0"
              style={{ backgroundColor: project.color }}
            />
          </div>
        </div>
      </article>
    </motion.div>
  );
}

export default function ProjectsView({
  universities,
  mobile = false,
}: ProjectsViewProps) {
  const projects = useMemo<ProjectEntry[]>(
    () =>
      universities
        .flatMap((university) =>
          university.projects.map((project) => ({
            ...project,
            university: university.name,
            shortName: university.shortName,
            city: university.city,
            country: university.country,
            color: university.color,
            logo: university.logo,
          }))
        )
        .sort((a, b) => b.year - a.year || a.title.localeCompare(b.title)),
    [universities]
  );

  const [activeProjectId, setActiveProjectId] = useState<string | null>(
    projects[0]?.id ?? null
  );

  useEffect(() => {
    if (!projects.length) {
      setActiveProjectId(null);
      return;
    }
    if (!projects.some((project) => project.id === activeProjectId)) {
      setActiveProjectId(projects[0].id);
    }
  }, [projects, activeProjectId]);

  if (!projects.length) {
    return (
      <div className="bg-white px-6 py-12 text-black md:px-8 md:py-16">
        <div className="mx-auto max-w-4xl border-2 border-black bg-white p-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#6F6F6F]">
            Project Archive
          </p>
          <h1 className="mt-4 font-serif text-5xl leading-none">No projects yet</h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-black/80">
            No project entries are available in the current archive.
          </p>
        </div>
      </div>
    );
  }

  const yearValues = projects.map((project) => project.year);
  const yearLabel = yearValues.length
    ? `${Math.min(...yearValues)}-${Math.max(...yearValues)}`
    : "Archive";
  const activeProject =
    projects.find((project) => project.id === activeProjectId) ?? projects[0];

  return (
    <div className="relative overflow-x-hidden bg-white text-black">
      <div
        className="pointer-events-none absolute inset-0 -z-20"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0, 0, 0, 0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.045) 1px, transparent 1px)",
          backgroundSize: "42px 42px",
        }}
      />

      <section className="relative bg-white">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-full opacity-25 blur-3xl transition-all duration-700"
          style={{
            background: `radial-gradient(circle at 50% 32%, ${activeProject.color}, transparent 42%)`,
          }}
        />
        <div className="mx-auto max-w-7xl px-6 py-6 md:px-8 md:py-8">
          <div
            className={`relative overflow-hidden ${
              mobile ? "h-[220px]" : "h-[300px] md:h-[360px]"
            }`}
          >
            <div
              className="absolute inset-0 opacity-60"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(0, 0, 0, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.08) 1px, transparent 1px)",
                backgroundSize: "32px 32px",
              }}
            />
            <div className="absolute inset-0">
              <Globe
                universities={universities}
                selectedUniversity={null}
                onSelectUniversity={() => {}}
                hoveredProject={null}
                compact
                allowDragInCompact={false}
                scale={mobile ? 0.8 : 1.05}
                maxLabels={mobile ? 4 : 6}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="px-6 pb-24 pt-4 md:px-8 md:pb-28 md:pt-6">
        <section className="mx-auto max-w-7xl">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {projects.map((project, index) => (
              <ProjectCard
                key={project.id}
                project={project}
                index={index}
                active={project.id === activeProject.id}
                onActivate={() => setActiveProjectId(project.id)}
              />
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
