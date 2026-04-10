import { z } from "zod";
import { backfillProjectDocument, DEFAULT_PROJECT_BODY } from "@/lib/projects/defaults";
import { slugify } from "@/lib/utils";
import type { ProjectDocument } from "@/types";

const nonEmptyTrimmedString = z.string().trim().min(1);
const optionalAssetString = z.string().trim().catch("").transform((value) => value || "");

const galleryItemSchema = z.object({
  url: nonEmptyTrimmedString,
  alt: z.string().trim().catch("").default(""),
});

const collaboratorSchema = z.object({
  name: nonEmptyTrimmedString,
  role: nonEmptyTrimmedString,
});

const creditSchema = z.object({
  label: nonEmptyTrimmedString,
  value: nonEmptyTrimmedString,
});

const externalLinkSchema = z.object({
  label: nonEmptyTrimmedString,
  url: nonEmptyTrimmedString,
});

const markerOffsetSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

export const projectDocumentSchema = z.object({
  slug: z.string().trim().default(""),
  universityId: nonEmptyTrimmedString,
  title: nonEmptyTrimmedString,
  summary: nonEmptyTrimmedString,
  year: z.coerce.number().int().min(1900).max(3000),
  tags: z.array(z.string().trim()).default([]),
  coverImageUrl: optionalAssetString.default(""),
  cardImageUrl: optionalAssetString.default(""),
  gallery: z.array(galleryItemSchema).default([]),
  participantsCount: z.coerce.number().int().min(0).default(0),
  markerOffset: markerOffsetSchema.optional(),
  locationLabel: z.string().trim().catch("").default(""),
  collaborators: z.array(collaboratorSchema).default([]),
  credits: z.array(creditSchema).default([]),
  externalLinks: z.array(externalLinkSchema).default([]),
  body: z
    .array(z.record(z.string(), z.any()))
    .default(DEFAULT_PROJECT_BODY)
    .transform((body) => (body.length ? body : DEFAULT_PROJECT_BODY)),
});

function dedupeStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function normalizeProjectDocument(
  input: unknown,
  fallbackSlug = ""
): ProjectDocument {
  const parsed = projectDocumentSchema.parse(input);
  const slug = slugify(parsed.slug || fallbackSlug || parsed.title);

  if (!slug) {
    throw new Error("Project slug could not be generated.");
  }

  return {
    ...backfillProjectDocument(parsed, parsed.universityId),
    slug,
    tags: dedupeStrings(parsed.tags),
    cardImageUrl: parsed.cardImageUrl || parsed.coverImageUrl,
    gallery: parsed.gallery.filter((item) => item.url.trim()),
    collaborators: parsed.collaborators.filter(
      (item) => item.name.trim() && item.role.trim()
    ),
    credits: parsed.credits.filter((item) => item.label.trim() && item.value.trim()),
    externalLinks: parsed.externalLinks.filter(
      (item) => item.label.trim() && item.url.trim()
    ),
  };
}
