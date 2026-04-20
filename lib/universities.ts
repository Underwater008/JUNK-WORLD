import "server-only";

import { universities as rawUniversities } from "@/data/mock";
import { getSupabaseServerClient } from "@/lib/supabase";
import type { ExperienceProject, ExperienceWorld, Project, University, World } from "@/types";

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
    worlds: [],
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

function sortWorlds(a: World, b: World) {
  return b.year - a.year || a.title.localeCompare(b.title);
}

function sortProjects(a: Project, b: Project) {
  return b.year - a.year || a.title.localeCompare(b.title);
}

function getBaseUniversitiesFromMock(): University[] {
  return [...rawUniversities]
    .map((university) => ({
      ...university,
      worlds: [],
    }))
    .sort(sortUniversities);
}

export async function getBaseUniversities(): Promise<University[]> {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("universities")
      .select("id, name, short_name, city, lat, lng, color, country, disciplines, logo, status");

    if (error) {
      throw new Error(error.message);
    }

    const rows = (data ?? []) as UniversityRow[];

    if (rows.length > 0) {
      return rows.map(mapUniversityRow).sort(sortUniversities);
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

export async function mergeWorldsIntoUniversities(
  experienceWorlds: ExperienceWorld[],
  experienceProjects: ExperienceProject[]
): Promise<University[]> {
  const baseUniversities = await getBaseUniversities();
  const projectsByWorld = new Map<string, Project[]>();

  for (const project of experienceProjects) {
    const projectEntry: Project = {
      id: project.id,
      worldId: project.worldId,
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

    const existing = projectsByWorld.get(project.worldId) ?? [];
    existing.push(projectEntry);
    projectsByWorld.set(project.worldId, existing);
  }

  const worldsByUniversity = new Map<string, World[]>();

  for (const world of experienceWorlds) {
    const worldEntry: World = {
      id: world.id,
      universityId: world.universityId,
      slug: world.slug,
      title: world.document.title,
      description: world.document.summary,
      year: world.document.year,
      thumbnail:
        world.document.cardImageUrl || world.document.coverImageUrl || "",
      tags: world.document.tags,
      markerOffset: world.document.markerOffset,
      locationLabel: world.document.locationLabel,
      status: world.status,
      hasUnpublishedChanges: world.hasUnpublishedChanges,
      document: world.document,
      projects: (projectsByWorld.get(world.id) ?? []).sort(sortProjects),
    };

    const existing = worldsByUniversity.get(world.universityId) ?? [];
    existing.push(worldEntry);
    worldsByUniversity.set(world.universityId, existing);
  }

  return baseUniversities.map((university) => ({
    ...university,
    worlds: (worldsByUniversity.get(university.id) ?? []).sort(sortWorlds),
  }));
}
