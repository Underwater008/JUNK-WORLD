import type { Project, University, World } from "@/types";

export function getUniversityProjects(university: University | null | undefined): Project[] {
  if (!university) return [];
  return university.worlds.flatMap((world) => world.projects);
}

export function getUniversityWorlds(university: University | null | undefined): World[] {
  if (!university) return [];
  return university.worlds;
}
