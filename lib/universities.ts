import "server-only";

import { universities as rawUniversities } from "@/data/mock";
import { getSql } from "@/lib/db";
import { isPortalWriteDisabled } from "@/lib/portal/mode";
import type { ExperienceProject, Project, University } from "@/types";

type UniversityRow = {
  id: string;
  name: string;
  short_name: string;
  city: string;
  lat: number;
  lng: number;
  color: string;
  country: string;
  disciplines: string[];
  logo: string | null;
  status: string;
};

function mapUniversityRow(row: UniversityRow): University {
  return {
    id: row.id,
    name: row.name,
    shortName: row.short_name,
    city: row.city,
    lat: row.lat,
    lng: row.lng,
    color: row.color,
    country: row.country,
    disciplines: row.disciplines ?? [],
    projects: [],
    logo: row.logo ?? undefined,
    status: (row.status as "active" | "inactive") ?? "active",
  };
}

function sortUniversities(a: University, b: University) {
  const aActive = a.status !== "inactive";
  const bActive = b.status !== "inactive";

  if (aActive !== bActive) return aActive ? -1 : 1;
  return a.name.localeCompare(b.name);
}

function getBaseUniversitiesFromMock(): University[] {
  return [...rawUniversities]
    .map((university) => ({
      ...university,
      projects: [],
    }))
    .sort(sortUniversities);
}

let universitySchemaEnsured = false;

async function ensureUniversityTable() {
  if (universitySchemaEnsured) return;
  if (isPortalWriteDisabled()) {
    universitySchemaEnsured = true;
    return;
  }

  const sql = getSql();
  await sql`
    create table if not exists universities (
      id text primary key,
      name text not null,
      short_name text not null,
      city text not null,
      lat double precision not null,
      lng double precision not null,
      color text not null default '#000000',
      country text not null,
      disciplines text[] not null default '{}',
      logo text,
      status text not null default 'active'
        check (status in ('active', 'inactive')),
      updated_at timestamptz not null default now(),
      created_at timestamptz not null default now()
    );
  `;

  universitySchemaEnsured = true;
}

export async function getBaseUniversities(): Promise<University[]> {
  try {
    await ensureUniversityTable();
    const sql = getSql();
    const rows = await sql<UniversityRow[]>`
      select id, name, short_name, city, lat, lng, color, country, disciplines, logo, status
      from universities
      order by
        case when status = 'active' then 0 else 1 end,
        name;
    `;

    if (rows.length > 0) {
      return rows.map(mapUniversityRow);
    }
  } catch {
    // fall through to mock data
  }

  return getBaseUniversitiesFromMock();
}

export async function getUniversityById(universityId: string): Promise<University | null> {
  const universities = await getBaseUniversities();
  return universities.find((university) => university.id === universityId) ?? null;
}

export async function isKnownUniversityId(universityId: string): Promise<boolean> {
  const universities = await getBaseUniversities();
  return universities.some((university) => university.id === universityId);
}

export async function mergeProjectsIntoUniversities(
  experienceProjects: ExperienceProject[]
): Promise<University[]> {
  const baseUniversities = await getBaseUniversities();
  const projectsByUniversity = new Map<string, Project[]>();

  for (const project of experienceProjects) {
    const university = baseUniversities.find((entry) => entry.id === project.universityId);
    if (!university) continue;

    const projectEntry: Project = {
      id: project.id,
      slug: project.slug,
      title: project.document.title,
      description: project.document.summary,
      year: project.document.year,
      thumbnail:
        project.document.cardImageUrl || project.document.coverImageUrl || "",
      participants: project.document.participantsCount,
      tags: project.document.tags,
      markerOffset: project.document.markerOffset,
      locationLabel: project.document.locationLabel,
      status: project.status,
      hasUnpublishedChanges: project.hasUnpublishedChanges,
      document: project.document,
    };

    const existing = projectsByUniversity.get(project.universityId) ?? [];
    existing.push(projectEntry);
    projectsByUniversity.set(project.universityId, existing);
  }

  return baseUniversities.map((university) => ({
    ...university,
    projects: (projectsByUniversity.get(university.id) ?? []).sort(
      (a, b) => b.year - a.year || a.title.localeCompare(b.title)
    ),
  }));
}
