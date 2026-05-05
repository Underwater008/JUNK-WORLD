import { randomUUID } from "node:crypto";
import { z } from "zod";
import { DEFAULT_PROJECT_BODY } from "@/lib/projects/defaults";
import { backfillProjectDocument } from "@/lib/projects/defaults.server";
import { slugify } from "@/lib/utils";
import type { ProjectDocument } from "@/types";

const trimmedString = z.string().trim().catch("").default("");
const nonEmptyTrimmedString = z.string().trim().min(1);
const optionalAssetString = z.string().trim().catch("").transform((value) => value || "");

const galleryItemSchema = z.object({
  url: nonEmptyTrimmedString,
  alt: z.string().trim().catch("").default(""),
});

const cropBoxSchema = z
  .object({
    x: z.coerce.number().finite(),
    y: z.coerce.number().finite(),
    w: z.coerce.number().finite().positive(),
    h: z.coerce.number().finite().positive(),
    natW: z.coerce.number().finite().positive(),
    natH: z.coerce.number().finite().positive(),
  })
  .nullable()
  .optional();

// Sub-record arrays are validated permissively here — empty rows can
// linger from earlier editor versions (e.g. retired Credits UI). The
// normalize step strips empties before the document is saved, so users
// don't get blocked by a stale row they can't see in the UI anymore.
const collaboratorSchema = z.object({
  name: z.string().trim().catch("").default(""),
  role: z.string().trim().catch("").default(""),
});

const creditSchema = z.object({
  label: z.string().trim().catch("").default(""),
  value: z.string().trim().catch("").default(""),
});

const externalLinkSchema = z.object({
  label: z.string().trim().catch("").default(""),
  url: z.string().trim().catch("").default(""),
});

const facultySubmitterSchema = z.object({
  name: z.string().trim().catch("").default(""),
  position: z.string().trim().catch("").default(""),
});

const studentSchema = z.object({
  name: z.string().trim().catch("").default(""),
  skills: z.string().trim().catch("").default(""),
});

const markerOffsetSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

const baseProjectDocumentSchema = z.object({
  slug: z.string().trim().catch("").default(""),
  universityId: trimmedString,
  worldId: trimmedString,
  title: trimmedString,
  summary: trimmedString,
  year: z.coerce.number().int().min(1900).max(3000),
  tags: z.array(z.string().trim()).default([]),
  coverImageUrl: optionalAssetString.default(""),
  cardImageUrl: optionalAssetString.default(""),
  coverCrop: cropBoxSchema,
  cardCrop: cropBoxSchema,
  gallery: z.array(galleryItemSchema).default([]),
  participantsCount: z.coerce.number().int().min(0).default(0),
  markerOffset: markerOffsetSchema.optional(),
  locationLabel: z.string().trim().catch("").default(""),
  collaborators: z.array(collaboratorSchema).default([]),
  credits: z.array(creditSchema).default([]),
  externalLinks: z.array(externalLinkSchema).default([]),
  facultySubmitters: z.array(facultySubmitterSchema).default([]),
  students: z.array(studentSchema).default([]),
  body: z
    .array(z.record(z.string(), z.any()))
    .default(DEFAULT_PROJECT_BODY)
    .transform((body) => (body.length ? body : DEFAULT_PROJECT_BODY)),
});

export const projectDocumentSchema = baseProjectDocumentSchema.extend({
  universityId: nonEmptyTrimmedString,
  worldId: nonEmptyTrimmedString,
  title: nonEmptyTrimmedString,
  summary: nonEmptyTrimmedString,
});

function dedupeStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

type NormalizeProjectDocumentOptions = {
  fallbackSlug?: string;
  mode?: "draft" | "publish";
};

export async function normalizeProjectDocument(
  input: unknown,
  {
    fallbackSlug = "",
    mode = "draft",
  }: NormalizeProjectDocumentOptions = {}
): Promise<ProjectDocument> {
  const parser =
    mode === "publish" ? projectDocumentSchema : baseProjectDocumentSchema;
  const parsed = parser.parse(input);
  const slug =
    slugify(parsed.slug || fallbackSlug || parsed.title) ||
    `draft-${randomUUID().slice(0, 8)}`;

  if (!slug) {
    throw new Error("Project slug could not be generated.");
  }

  return {
    ...(await backfillProjectDocument(parsed, parsed.universityId)),
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
    facultySubmitters: parsed.facultySubmitters.filter(
      (item) => item.name.trim() || item.position.trim()
    ),
    students: parsed.students.filter(
      (item) => item.name.trim() || item.skills.trim()
    ),
  };
}
