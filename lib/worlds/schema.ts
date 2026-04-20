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

const markerOffsetSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

const baseWorldDocumentSchema = z.object({
  slug: z.string().trim().catch("").default(""),
  universityId: trimmedString,
  title: trimmedString,
  summary: trimmedString,
  year: z.coerce.number().int().min(1900).max(3000),
  tags: z.array(z.string().trim()).default([]),
  coverImageUrl: optionalAssetString.default(""),
  cardImageUrl: optionalAssetString.default(""),
  gallery: z.array(galleryItemSchema).default([]),
  markerOffset: markerOffsetSchema.optional(),
  locationLabel: z.string().trim().catch("").default(""),
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

  return {
    ...(await backfillWorldDocument(parsed, parsed.universityId)),
    slug,
    tags: dedupeStrings(parsed.tags),
    cardImageUrl: parsed.cardImageUrl || parsed.coverImageUrl,
    gallery: parsed.gallery.filter((item) => item.url.trim()),
  };
}
