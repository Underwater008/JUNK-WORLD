import { randomUUID } from "node:crypto";
import { z } from "zod";
import { backfillWorldDocument } from "@/lib/worlds/defaults.server";
import { slugify } from "@/lib/utils";
import type { WorldDocument } from "@/types";

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

const markerOffsetSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

const facultySubmitterSchema = z.object({
  name: z.string().trim().catch("").default(""),
  position: z.string().trim().catch("").default(""),
});

const studentSchema = z.object({
  name: z.string().trim().catch("").default(""),
  skills: z.string().trim().catch("").default(""),
});

const worldModeSchema = z
  .union([z.literal("single"), z.literal("collective")])
  .optional();

const baseWorldDocumentSchema = z.object({
  slug: z.string().trim().catch("").default(""),
  universityId: trimmedString,
  title: trimmedString,
  summary: trimmedString,
  year: z.coerce.number().int().min(1900).max(3000),
  tags: z.array(z.string().trim()).default([]),
  coverImageUrl: optionalAssetString.default(""),
  cardImageUrl: optionalAssetString.default(""),
  coverCrop: cropBoxSchema,
  cardCrop: cropBoxSchema,
  gallery: z.array(galleryItemSchema).default([]),
  markerOffset: markerOffsetSchema.optional(),
  locationLabel: z.string().trim().catch("").default(""),
  mode: worldModeSchema,
  // body / contributors are nullable so a row that stored `null` (e.g.
  // partial updates from older clients, or jsonb fields that round-trip
  // through PostgREST as null) still parses cleanly.
  body: z.array(z.record(z.string(), z.any())).nullable().optional(),
  facultySubmitters: z.array(facultySubmitterSchema).nullable().optional(),
  students: z.array(studentSchema).nullable().optional(),
});

export const worldDocumentSchema = baseWorldDocumentSchema.extend({
  universityId: nonEmptyTrimmedString,
  title: nonEmptyTrimmedString,
  summary: nonEmptyTrimmedString,
});

function dedupeStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

type NormalizeWorldDocumentOptions = {
  fallbackSlug?: string;
  mode?: "draft" | "publish";
};

export async function normalizeWorldDocument(
  input: unknown,
  {
    fallbackSlug = "",
    mode = "draft",
  }: NormalizeWorldDocumentOptions = {}
): Promise<WorldDocument> {
  const parser = mode === "publish" ? worldDocumentSchema : baseWorldDocumentSchema;
  const parsed = parser.parse(input);
  const slug =
    slugify(parsed.slug || fallbackSlug || parsed.title) ||
    `draft-${randomUUID().slice(0, 8)}`;

  if (!slug) {
    throw new Error("World slug could not be generated.");
  }

  // Coerce nullable inputs before assignment — the schema accepts null
  // for forward-compatibility but the document types are `T | undefined`.
  const normalizedParsed = {
    ...parsed,
    body: Array.isArray(parsed.body) ? parsed.body : undefined,
    facultySubmitters: parsed.facultySubmitters ?? undefined,
    students: parsed.students ?? undefined,
  };

  return {
    ...(await backfillWorldDocument(normalizedParsed, parsed.universityId)),
    slug,
    tags: dedupeStrings(parsed.tags),
    cardImageUrl: parsed.cardImageUrl || parsed.coverImageUrl,
    gallery: parsed.gallery.filter((item) => item.url.trim()),
    mode: parsed.mode ?? "collective",
    body: normalizedParsed.body,
    facultySubmitters: (normalizedParsed.facultySubmitters ?? []).filter(
      (item) => item.name.trim() || item.position.trim()
    ),
    students: (normalizedParsed.students ?? []).filter(
      (item) => item.name.trim() || item.skills.trim()
    ),
  };
}
