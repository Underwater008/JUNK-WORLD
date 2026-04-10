import { getUniversityById } from "@/lib/universities";
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

function getFallbackLocation(universityId: string) {
  const university = getUniversityById(universityId);
  if (!university) {
    return {
      markerOffset: {
        lat: 0,
        lng: 0,
      },
      locationLabel: "",
    };
  }

  return {
    markerOffset: {
      lat: university.lat,
      lng: university.lng,
    },
    locationLabel: `${university.city}, ${university.country}`,
  };
}

export function backfillProjectDocument(
  document: Partial<ProjectDocument> | null | undefined,
  universityId: string
): ProjectDocument {
  const base = createEmptyProjectDocument();
  const fallback = getFallbackLocation(document?.universityId || universityId);
  const markerOffset = document?.markerOffset;
  const hasMarkerOffset =
    typeof markerOffset?.lat === "number" && typeof markerOffset?.lng === "number";

  return {
    ...base,
    ...document,
    universityId: document?.universityId || universityId,
    markerOffset: hasMarkerOffset ? markerOffset : fallback.markerOffset,
    locationLabel: document?.locationLabel?.trim() || fallback.locationLabel,
    body:
      Array.isArray(document?.body) && document.body.length
        ? document.body
        : DEFAULT_PROJECT_BODY,
  };
}
