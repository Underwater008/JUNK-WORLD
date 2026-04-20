import "server-only";

import { getUniversityById } from "@/lib/universities";
import { createEmptyWorldDocument } from "@/lib/worlds/defaults";
import type { WorldDocument } from "@/types";

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

export async function backfillWorldDocument(
  document: Partial<WorldDocument> | null | undefined,
  universityId: string
): Promise<WorldDocument> {
  const base = createEmptyWorldDocument();
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
    cardImageUrl: document?.cardImageUrl || document?.coverImageUrl || "",
  };
}
