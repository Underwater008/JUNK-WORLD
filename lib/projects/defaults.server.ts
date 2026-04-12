import "server-only";

import { getUniversityById } from "@/lib/universities";
import { createEmptyProjectDocument, DEFAULT_PROJECT_BODY } from "@/lib/projects/defaults";
import type { ProjectDocument } from "@/types";

async function getFallbackLocation(universityId: string) {
  const university = await getUniversityById(universityId);
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

export async function backfillProjectDocument(
  document: Partial<ProjectDocument> | null | undefined,
  universityId: string
): Promise<ProjectDocument> {
  const base = createEmptyProjectDocument();
  const fallback = await getFallbackLocation(document?.universityId || universityId);
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
