import "server-only";

import { randomUUID } from "node:crypto";
import { backfillProjectDocument } from "@/lib/projects/defaults.server";
import { normalizeProjectDocument } from "@/lib/projects/schema";
import { getSupabaseServerClient } from "@/lib/supabase";
import { isKnownUniversityId } from "@/lib/universities";
import type {
  ExperienceProject,
  PortalProjectSummary,
  ProjectDocument,
  ProjectRecord,
} from "@/types";

type ProjectRow = {
  id: string;
  slug: string;
  university_id: string;
  world_id?: string | null;
  draft_content: ProjectDocument | null;
  published_content: ProjectDocument | null;
  published_at: string | null;
  updated_at: string;
  created_at: string;
};

const PROJECT_SELECT_WITH_WORLD =
  "id, slug, university_id, world_id, draft_content, published_content, published_at, updated_at, created_at";
const PROJECT_SELECT_LEGACY =
  "id, slug, university_id, draft_content, published_content, published_at, updated_at, created_at";

function isMissingWorldIdError(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes("world_id") && (
    normalized.includes("column") ||
    normalized.includes("schema cache")
  );
}

function normalizeWorldRequirementError(error: unknown) {
  if (error instanceof Error) {
    const normalized = error.message.toLowerCase();
    if (
      normalized.includes("public.worlds") ||
      normalized.includes("relation \"worlds\" does not exist") ||
      normalized.includes("schema cache")
    ) {
      return new Error(
        "Worlds table is not set up yet. Apply `supabase/worlds.sql` before creating or editing projects."
      );
    }
    return error;
  }

  return new Error("World validation failed.");
}

function sortProjectRows(rows: ProjectRow[]) {
  return [...rows].sort((a, b) => {
    const publishedAtA = a.published_at ? Date.parse(a.published_at) : -Infinity;
    const publishedAtB = b.published_at ? Date.parse(b.published_at) : -Infinity;

    if (publishedAtA !== publishedAtB) {
      return publishedAtB - publishedAtA;
    }

    return Date.parse(b.updated_at) - Date.parse(a.updated_at);
  });
}

async function mapProjectRow(row: ProjectRow): Promise<ProjectRecord> {
  const worldId = typeof row.world_id === "string" ? row.world_id : "";

  return {
    id: row.id,
    slug: row.slug,
    universityId: row.university_id,
    worldId,
    draftContent: row.draft_content
      ? await backfillProjectDocument(row.draft_content, row.university_id, worldId)
      : null,
    publishedContent: row.published_content
      ? await backfillProjectDocument(row.published_content, row.university_id, worldId)
      : null,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  };
}

async function listProjectRows({
  includeDrafts = false,
}: {
  includeDrafts?: boolean;
} = {}): Promise<ProjectRow[]> {
  const supabase = getSupabaseServerClient();
  let query = supabase.from("projects").select(PROJECT_SELECT_WITH_WORLD);

  if (!includeDrafts) {
    query = query.not("published_content", "is", null);
  }

  let { data, error } = await query;

  if (error && isMissingWorldIdError(error.message)) {
    let legacyQuery = supabase.from("projects").select(PROJECT_SELECT_LEGACY);
    if (!includeDrafts) {
      legacyQuery = legacyQuery.not("published_content", "is", null);
    }

    const legacyResponse = await legacyQuery;
    data = legacyResponse.data?.map((row) => ({ ...row, world_id: null })) ?? null;
    error = legacyResponse.error;
  }

  if (error) {
    throw new Error(error.message);
  }

  return sortProjectRows((data ?? []) as ProjectRow[]);
}

async function getProjectRowBySlug(
  slug: string,
  {
    includeDrafts = false,
  }: {
    includeDrafts?: boolean;
  } = {}
): Promise<ProjectRow | null> {
  const supabase = getSupabaseServerClient();
  let query = supabase
    .from("projects")
    .select(PROJECT_SELECT_WITH_WORLD)
    .eq("slug", slug)
    .limit(1);

  if (!includeDrafts) {
    query = query.not("published_content", "is", null);
  }

  let { data, error } = await query;

  if (error && isMissingWorldIdError(error.message)) {
    let legacyQuery = supabase
      .from("projects")
      .select(PROJECT_SELECT_LEGACY)
      .eq("slug", slug)
      .limit(1);

    if (!includeDrafts) {
      legacyQuery = legacyQuery.not("published_content", "is", null);
    }

    const legacyResponse = await legacyQuery;
    data = legacyResponse.data?.map((row) => ({ ...row, world_id: null })) ?? null;
    error = legacyResponse.error;
  }

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? [])[0] as ProjectRow | undefined) ?? null;
}

async function assertUniversity(universityId: string) {
  if (!(await isKnownUniversityId(universityId))) {
    throw new Error("Selected university is not in the current JUNK catalog.");
  }
}

async function assertWorld(worldId: string, universityId: string) {
  const normalizedWorldId = worldId.trim();
  if (!normalizedWorldId) {
    throw new Error("Projects must belong to a world.");
  }

  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("worlds")
      .select("id, university_id")
      .eq("id", normalizedWorldId)
      .limit(1);

    if (error) {
      throw new Error(error.message);
    }

    const row = (data ?? [])[0] as { id: string; university_id: string } | undefined;
    if (!row) {
      throw new Error("Selected world was not found.");
    }

    if (row.university_id !== universityId) {
      throw new Error("Selected world does not belong to the chosen university.");
    }
  } catch (error) {
    throw normalizeWorldRequirementError(error);
  }
}

function hasUnpublishedChanges(record: ProjectRecord) {
  if (!record.draftContent || !record.publishedContent) return false;

  return JSON.stringify(record.draftContent) !== JSON.stringify(record.publishedContent);
}

function toExperienceProject(
  record: ProjectRecord,
  includeDrafts: boolean
): ExperienceProject | null {
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
    worldId: record.worldId || document.worldId,
    status: record.publishedContent ? "published" : "draft",
    hasUnpublishedChanges: hasUnpublishedChanges(record),
    document,
    publishedAt: record.publishedAt,
    updatedAt: record.updatedAt,
    createdAt: record.createdAt,
  };
}

export async function getExperienceProjects({
  includeDrafts = false,
}: {
  includeDrafts?: boolean;
} = {}): Promise<ExperienceProject[]> {
  try {
    const rows = await listProjectRows({ includeDrafts });
    const records = await Promise.all(rows.map(mapProjectRow));
    return records
      .map((row) => toExperienceProject(row, includeDrafts))
      .filter((row): row is ExperienceProject => Boolean(row));
  } catch {
    return [];
  }
}

export async function getExperienceProjectBySlug(
  slug: string,
  {
    includeDrafts = false,
  }: {
    includeDrafts?: boolean;
  } = {}
) {
  const row = await getProjectRowBySlug(slug, { includeDrafts });
  const mapped = row ? await mapProjectRow(row) : null;
  if (!mapped) return null;

  return toExperienceProject(mapped, includeDrafts);
}

export async function getPublishedProjectBySlug(slug: string) {
  return getExperienceProjectBySlug(slug, { includeDrafts: false });
}

export async function getPortalProjectSummaries(): Promise<PortalProjectSummary[]> {
  const rows = await listProjectRows({ includeDrafts: true });
  const records = await Promise.all(rows.map(mapProjectRow));

  return records.map((record) => {
    const content = record.draftContent ?? record.publishedContent;

    return {
      id: record.id,
      slug: record.slug,
      status: record.publishedContent ? "published" : "draft",
      title: content?.title || record.slug,
      universityId: record.universityId,
      worldId: record.worldId || content?.worldId || "",
      updatedAt: record.updatedAt,
      publishedAt: record.publishedAt,
    };
  });
}

export async function getPortalProjectBySlug(slug: string) {
  const row = await getProjectRowBySlug(slug, { includeDrafts: true });
  if (!row) return null;

  return await mapProjectRow(row);
}

export async function createProjectDraft(input: unknown) {
  const document = await normalizeProjectDocument(input, { mode: "draft" });
  await assertUniversity(document.universityId);
  await assertWorld(document.worldId, document.universityId);

  const supabase = getSupabaseServerClient();
  const timestamp = new Date().toISOString();
  const { data, error } = await supabase
    .from("projects")
    .insert({
      id: randomUUID(),
      slug: document.slug,
      university_id: document.universityId,
      world_id: document.worldId,
      draft_content: document,
      updated_at: timestamp,
      created_at: timestamp,
    })
    .select(PROJECT_SELECT_WITH_WORLD)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return await mapProjectRow(data as ProjectRow);
}

export async function updateProjectDraft(currentSlug: string, input: unknown) {
  const existing = await getPortalProjectBySlug(currentSlug);
  if (!existing) {
    throw new Error("Project not found.");
  }

  const document = await normalizeProjectDocument(input, {
    fallbackSlug: existing.slug,
    mode: "draft",
  });
  await assertUniversity(document.universityId);
  await assertWorld(document.worldId, document.universityId);

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("projects")
    .update({
      slug: document.slug,
      university_id: document.universityId,
      world_id: document.worldId,
      draft_content: document,
      updated_at: new Date().toISOString(),
    })
    .eq("slug", currentSlug)
    .select(PROJECT_SELECT_WITH_WORLD)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    previousSlug: currentSlug,
    record: await mapProjectRow(data as ProjectRow),
  };
}

export async function publishProject(currentSlug: string, input: unknown) {
  const existing = await getPortalProjectBySlug(currentSlug);
  if (!existing) {
    throw new Error("Project not found.");
  }

  const document = await normalizeProjectDocument(input, {
    fallbackSlug: existing.slug,
    mode: "publish",
  });
  await assertUniversity(document.universityId);
  await assertWorld(document.worldId, document.universityId);

  const supabase = getSupabaseServerClient();
  const timestamp = new Date().toISOString();
  const { data, error } = await supabase
    .from("projects")
    .update({
      slug: document.slug,
      university_id: document.universityId,
      world_id: document.worldId,
      draft_content: document,
      published_content: document,
      published_at: timestamp,
      updated_at: timestamp,
    })
    .eq("slug", currentSlug)
    .select(PROJECT_SELECT_WITH_WORLD)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    previousSlug: currentSlug,
    record: await mapProjectRow(data as ProjectRow),
  };
}

export async function deleteProject(currentSlug: string) {
  const existing = await getPortalProjectBySlug(currentSlug);
  if (!existing) {
    throw new Error("Project not found.");
  }

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("projects").delete().eq("slug", currentSlug);

  if (error) {
    throw new Error(error.message);
  }

  return {
    deletedSlug: currentSlug,
  };
}
