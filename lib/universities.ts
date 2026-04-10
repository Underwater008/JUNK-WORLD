import { universities as rawUniversities } from "@/data/mock";
import type { ExperienceProject, Project, University } from "@/types";

function sortUniversities(a: University, b: University) {
  const aActive = a.status !== "inactive";
  const bActive = b.status !== "inactive";

  if (aActive !== bActive) return aActive ? -1 : 1;
  return a.name.localeCompare(b.name);
}

export function getBaseUniversities(): University[] {
  return [...rawUniversities]
    .map((university) => ({
      ...university,
      projects: [],
    }))
    .sort(sortUniversities);
}

export function getUniversityById(universityId: string) {
  return getBaseUniversities().find((university) => university.id === universityId) ?? null;
}

export function isKnownUniversityId(universityId: string) {
  return getBaseUniversities().some((university) => university.id === universityId);
}

export function mergeProjectsIntoUniversities(
  experienceProjects: ExperienceProject[]
) {
  const projectsByUniversity = new Map<string, Project[]>();

  for (const project of experienceProjects) {
    const university = rawUniversities.find((entry) => entry.id === project.universityId);
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

  return getBaseUniversities().map((university) => ({
    ...university,
    projects: (projectsByUniversity.get(university.id) ?? []).sort(
      (a, b) => b.year - a.year || a.title.localeCompare(b.title)
    ),
  }));
}
