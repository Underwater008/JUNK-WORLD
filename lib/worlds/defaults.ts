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
  };
}
