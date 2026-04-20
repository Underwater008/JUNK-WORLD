import "server-only";

import { randomUUID } from "node:crypto";
import { getExperienceProjects, getExperienceProjectBySlug } from "@/lib/projects/server";
import { mergeWorldsIntoUniversities, isKnownUniversityId } from "@/lib/universities";
import { getSupabaseServerClient } from "@/lib/supabase";
import { backfillWorldDocument } from "@/lib/worlds/defaults.server";
import { normalizeWorldDocument } from "@/lib/worlds/schema";
import {
  createLegacyWorldId,
  projectDocumentToWorldDocument,
  promoteLegacyExperienceProject,
} from "@/lib/worlds/legacy";
import type {
  ExperienceWorld,
  PortalWorldSummary,
  ProjectRecord,
  University,
  WorldDocument,
  WorldRecord,
} from "@/types";

type WorldRow = {
  id: string;
  slug: string;
  university_id: string;
  draft_content: WorldDocument | null;
  published_content: WorldDocument | null;
  published_at: string | null;
  updated_at: string;
  created_at: string;
};

const WORLD_SELECT =
  "id, slug, university_id, draft_content, published_content, published_at, updated_at, created_at";

function isMissingWorldsTableError(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes("public.worlds") ||
    normalized.includes("relation \"worlds\" does not exist") ||
    normalized.includes("schema cache");
}

function normalizeWorldWriteError(error: unknown) {
  if (error instanceof Error) {
    if (isMissingWorldsTableError(error.message)) {
      return new Error(
        "Worlds table is not set up yet. Apply `supabase/worlds.sql` before using world editing."
      );
    }
    return error;
  }

  return new Error("World operation failed.");
}

function sortWorldRows(rows: WorldRow[]) {
  return [...rows].sort((a, b) => {
    const publishedAtA = a.published_at ? Date.parse(a.published_at) : -Infinity;
    const publishedAtB = b.published_at ? Date.parse(b.published_at) : -Infinity;

    if (publishedAtA !== publishedAtB) {
      return publishedAtB - publishedAtA;
    }

    return Date.parse(b.updated_at) - Date.parse(a.updated_at);
  });
}

async function mapWorldRow(row: WorldRow): Promise<WorldRecord> {
  return {
    id: row.id,
    slug: row.slug,
    universityId: row.university_id,
    draftContent: row.draft_content
      ? await backfillWorldDocument(row.draft_content, row.university_id)
      : null,
    publishedContent: row.published_content
      ? await backfillWorldDocument(row.published_content, row.university_id)
      : null,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  };
}

async function listWorldRows({
  includeDrafts = false,
}: {
  includeDrafts?: boolean;
} = {}): Promise<WorldRow[]> {
  const supabase = getSupabaseServerClient();
  let query = supabase.from("worlds").select(WORLD_SELECT);

  if (!includeDrafts) {
    query = query.not("published_content", "is", null);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return sortWorldRows((data ?? []) as WorldRow[]);
}

async function getWorldRowBySlug(
  slug: string,
  {
    includeDrafts = false,
  }: {
    includeDrafts?: boolean;
  } = {}
): Promise<WorldRow | null> {
  const supabase = getSupabaseServerClient();
  let query = supabase.from("worlds").select(WORLD_SELECT).eq("slug", slug).limit(1);

  if (!includeDrafts) {
    query = query.not("published_content", "is", null);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? [])[0] as WorldRow | undefined) ?? null;
}

async function getWorldRowById(
  id: string,
  {
    includeDrafts = false,
  }: {
    includeDrafts?: boolean;
  } = {}
): Promise<WorldRow | null> {
  const supabase = getSupabaseServerClient();
  let query = supabase.from("worlds").select(WORLD_SELECT).eq("id", id).limit(1);

  if (!includeDrafts) {
    query = query.not("published_content", "is", null);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? [])[0] as WorldRow | undefined) ?? null;
}

function pickPreferredContent(record: WorldRecord) {
  return record.draftContent ?? record.publishedContent;
}

function hasUnpublishedChanges(record: WorldRecord) {
  if (!record.draftContent || !record.publishedContent) return false;

  return JSON.stringify(record.draftContent) !== JSON.stringify(record.publishedContent);
}

function toExperienceWorld(
  record: WorldRecord,
  includeDrafts: boolean
): ExperienceWorld | null {
  if (!includeDrafts && !record.publishedContent) {
    return null;
  }

  const document = includeDrafts
    ? record.draftContent ?? record.publishedContent
    : record.publishedContent;

  if (!document) {
    return null;
  }

  return {
    id: record.id,
    slug: record.slug,
    universityId: record.universityId,
    status: record.publishedContent ? "published" : "draft",
    hasUnpublishedChanges: hasUnpublishedChanges(record),
    document,
    publishedAt: record.publishedAt,
    updatedAt: record.updatedAt,
    createdAt: record.createdAt,
  };
}

async function assertUniversity(universityId: string) {
  if (!(await isKnownUniversityId(universityId))) {
    throw new Error("Selected university is not in the current JUNK catalog.");
  }
}

function createLegacyWorldRecordFromProjectRecord(record: ProjectRecord): WorldRecord {
  return {
    id: createLegacyWorldId(record.id),
    slug: record.slug,
    universityId: record.universityId,
    draftContent: record.draftContent
      ? projectDocumentToWorldDocument(record.draftContent)
      : null,
    publishedContent: record.publishedContent
      ? projectDocumentToWorldDocument(record.publishedContent)
      : null,
    publishedAt: record.publishedAt,
    updatedAt: record.updatedAt,
    createdAt: record.createdAt,
  };
}

async function getLegacyWorldRecordBySlug(
  slug: string,
  includeDrafts: boolean
): Promise<WorldRecord | null> {
  const legacyProject = await getExperienceProjectBySlug(slug, { includeDrafts });
  if (!legacyProject || legacyProject.worldId) {
    return null;
  }

  const projectRecord: ProjectRecord = {
    id: legacyProject.id,
    slug: legacyProject.slug,
    universityId: legacyProject.universityId,
    worldId: "",
    draftContent:
      includeDrafts || legacyProject.status === "draft" ? legacyProject.document : null,
    publishedContent:
      legacyProject.status === "published" ? legacyProject.document : null,
    publishedAt: legacyProject.publishedAt,
    updatedAt: legacyProject.updatedAt,
    createdAt: legacyProject.createdAt,
  };

  return createLegacyWorldRecordFromProjectRecord(projectRecord);
}

export async function getExperienceWorlds({
  includeDrafts = false,
}: {
  includeDrafts?: boolean;
} = {}): Promise<ExperienceWorld[]> {
  try {
    const rows = await listWorldRows({ includeDrafts });
    const records = await Promise.all(rows.map(mapWorldRow));
    return records
      .map((row) => toExperienceWorld(row, includeDrafts))
      .filter((row): row is ExperienceWorld => Boolean(row));
  } catch (error) {
    if (error instanceof Error && isMissingWorldsTableError(error.message)) {
      return [];
    }
    return [];
  }
}

export async function getExperienceWorldBySlug(
  slug: string,
  {
    includeDrafts = false,
  }: {
    includeDrafts?: boolean;
  } = {}
) {
  try {
    const row = await getWorldRowBySlug(slug, { includeDrafts });
    const mapped = row ? await mapWorldRow(row) : null;
    if (mapped) {
      return toExperienceWorld(mapped, includeDrafts);
    }
  } catch (error) {
    if (!(error instanceof Error) || !isMissingWorldsTableError(error.message)) {
      throw error;
    }
  }

  const legacyRecord = await getLegacyWorldRecordBySlug(slug, includeDrafts);
  return legacyRecord ? toExperienceWorld(legacyRecord, includeDrafts) : null;
}

export async function getExperienceWorldById(
  id: string,
  {
    includeDrafts = false,
  }: {
    includeDrafts?: boolean;
  } = {}
) {
  try {
    const row = await getWorldRowById(id, { includeDrafts });
    const mapped = row ? await mapWorldRow(row) : null;
    if (mapped) {
      return toExperienceWorld(mapped, includeDrafts);
    }
  } catch (error) {
    if (!(error instanceof Error) || !isMissingWorldsTableError(error.message)) {
      throw error;
    }
  }

  return null;
}

export async function getHomepageUniversities({
  includeDrafts = false,
}: {
  includeDrafts?: boolean;
} = {}): Promise<University[]> {
  const [worlds, experienceProjects] = await Promise.all([
    getExperienceWorlds({ includeDrafts }),
    getExperienceProjects({ includeDrafts }),
  ]);

  const projectsWithWorlds = experienceProjects.filter((project) => project.worldId);
  const legacyProjects = experienceProjects.filter((project) => !project.worldId);
  const syntheticWorlds: ExperienceWorld[] = [];
  const syntheticProjects = [];
  const usedChildSlugs = new Set(projectsWithWorlds.map((project) => project.slug));

  for (const legacyProject of legacyProjects) {
    const promoted = promoteLegacyExperienceProject(legacyProject, usedChildSlugs);
    syntheticWorlds.push(promoted.world);
    syntheticProjects.push(promoted.childProject);
  }

  return mergeWorldsIntoUniversities(
    [...worlds, ...syntheticWorlds],
    [...projectsWithWorlds, ...syntheticProjects]
  );
}

export async function getPortalWorldSummaries(): Promise<PortalWorldSummary[]> {
  try {
    const rows = await listWorldRows({ includeDrafts: true });
    const records = await Promise.all(rows.map(mapWorldRow));

    return records.map((record) => {
      const content = pickPreferredContent(record);

      return {
        id: record.id,
        slug: record.slug,
        status: record.publishedContent ? "published" : "draft",
        title: content?.title || record.slug,
        universityId: record.universityId,
        updatedAt: record.updatedAt,
        publishedAt: record.publishedAt,
      };
    });
  } catch (error) {
    throw normalizeWorldWriteError(error);
  }
}

export async function getPortalWorldBySlug(slug: string) {
  try {
    const row = await getWorldRowBySlug(slug, { includeDrafts: true });
    if (!row) return null;

    return await mapWorldRow(row);
  } catch (error) {
    throw normalizeWorldWriteError(error);
  }
}

export async function createWorldDraft(input: unknown) {
  const document = await normalizeWorldDocument(input, { mode: "draft" });
  await assertUniversity(document.universityId);

  try {
    const supabase = getSupabaseServerClient();
    const timestamp = new Date().toISOString();
    const { data, error } = await supabase
      .from("worlds")
      .insert({
        id: randomUUID(),
        slug: document.slug,
        university_id: document.universityId,
        draft_content: document,
        updated_at: timestamp,
        created_at: timestamp,
      })
      .select(WORLD_SELECT)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return await mapWorldRow(data as WorldRow);
  } catch (error) {
    throw normalizeWorldWriteError(error);
  }
}

export async function updateWorldDraft(currentSlug: string, input: unknown) {
  const existing = await getPortalWorldBySlug(currentSlug);
  if (!existing) {
    throw new Error("World not found.");
  }

  const document = await normalizeWorldDocument(input, {
    fallbackSlug: existing.slug,
    mode: "draft",
  });
  await assertUniversity(document.universityId);

  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("worlds")
      .update({
        slug: document.slug,
        university_id: document.universityId,
        draft_content: document,
        updated_at: new Date().toISOString(),
      })
      .eq("slug", currentSlug)
      .select(WORLD_SELECT)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return {
      previousSlug: currentSlug,
      record: await mapWorldRow(data as WorldRow),
    };
  } catch (error) {
    throw normalizeWorldWriteError(error);
  }
}

export async function publishWorld(currentSlug: string, input: unknown) {
  const existing = await getPortalWorldBySlug(currentSlug);
  if (!existing) {
    throw new Error("World not found.");
  }

  const document = await normalizeWorldDocument(input, {
    fallbackSlug: existing.slug,
    mode: "publish",
  });
  await assertUniversity(document.universityId);

  try {
    const supabase = getSupabaseServerClient();
    const timestamp = new Date().toISOString();
    const { data, error } = await supabase
      .from("worlds")
      .update({
        slug: document.slug,
        university_id: document.universityId,
        draft_content: document,
        published_content: document,
        published_at: timestamp,
        updated_at: timestamp,
      })
      .eq("slug", currentSlug)
      .select(WORLD_SELECT)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return {
      previousSlug: currentSlug,
      record: await mapWorldRow(data as WorldRow),
    };
  } catch (error) {
    throw normalizeWorldWriteError(error);
  }
}

export async function deleteWorld(currentSlug: string) {
  const existing = await getPortalWorldBySlug(currentSlug);
  if (!existing) {
    throw new Error("World not found.");
  }

  try {
    const supabase = getSupabaseServerClient();
    const { error: deleteProjectsError } = await supabase
      .from("projects")
      .delete()
      .eq("world_id", existing.id);

    if (deleteProjectsError) {
      throw new Error(deleteProjectsError.message);
    }

    const { error } = await supabase.from("worlds").delete().eq("slug", currentSlug);
    if (error) {
      throw new Error(error.message);
    }

    return {
      deletedSlug: currentSlug,
    };
  } catch (error) {
    throw normalizeWorldWriteError(error);
  }
}

export async function getPublishedWorldBySlug(slug: string) {
  return getExperienceWorldBySlug(slug, { includeDrafts: false });
}

export async function getWorldForProjectSlug(
  slug: string,
  {
    includeDrafts = false,
  }: {
    includeDrafts?: boolean;
  } = {}
) {
  const project = await getExperienceProjectBySlug(slug, { includeDrafts });
  if (!project) return null;

  if (!project.worldId) {
    return getExperienceWorldBySlug(project.slug, { includeDrafts });
  }

  return getExperienceWorldById(project.worldId, { includeDrafts });
}
