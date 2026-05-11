import { DEFAULT_PROJECT_BODY } from "@/lib/projects/defaults";
import type { WorldDocument } from "@/types";

export function createEmptyWorldDocument(): WorldDocument {
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
    markerOffset: {
      lat: 0,
      lng: 0,
    },
    locationLabel: "",
    mode: "collective",
    body: DEFAULT_PROJECT_BODY,
    facultySubmitters: [],
    students: [],
  };
}
