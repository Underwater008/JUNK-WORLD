import type { ProjectBody, ProjectDocument } from "@/types";

export const DEFAULT_PROJECT_BODY: ProjectBody = [
  {
    type: "paragraph",
    content: [],
  },
];

export function createEmptyProjectDocument(): ProjectDocument {
  return {
    slug: "",
    universityId: "",
    title: "",
    summary: "",
    year: new Date().getFullYear(),
    tags: [],
    coverImageUrl: "",
    cardImageUrl: "",
    gallery: [],
    participantsCount: 0,
    markerOffset: {
      lat: 0,
      lng: 0,
    },
    locationLabel: "",
    collaborators: [],
    credits: [],
    externalLinks: [],
    body: DEFAULT_PROJECT_BODY,
  };
}
