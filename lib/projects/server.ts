import "server-only";

import { randomUUID } from "node:crypto";
import { createEmptyProjectDocument } from "@/lib/projects/defaults";
import { backfillProjectDocument } from "@/lib/projects/defaults.server";
import { normalizeProjectDocument } from "@/lib/projects/schema";
import { getSupabaseServerClient } from "@/lib/supabase";
import { getUniversityById, isKnownUniversityId, mergeProjectsIntoUniversities } from "@/lib/universities";
import type {
  ExperienceProject,
  PortalProjectSummary,
  ProjectDocument,
  ProjectRecord,
  University,
} from "@/types";

type ProjectRow = {
  id: string;
  slug: string;
  university_id: string;
  draft_content: ProjectDocument | null;
  published_content: ProjectDocument | null;
  published_at: string | null;
  updated_at: string;
  created_at: string;
};

const PROJECT_SELECT =
  "id, slug, university_id, draft_content, published_content, published_at, updated_at, created_at";

async function mapProjectRow(row: ProjectRow): Promise<ProjectRecord> {
  return {
    id: row.id,
    slug: row.slug,
    universityId: row.university_id,
    draftContent: row.draft_content
      ? await backfillProjectDocument(row.draft_content, row.university_id)
      : null,
    publishedContent: row.published_content
      ? await backfillProjectDocument(row.published_content, row.university_id)
      : null,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  };
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

async function listProjectRows({
  includeDrafts = false,
}: {
  includeDrafts?: boolean;
} = {}): Promise<ProjectRow[]> {
  const supabase = getSupabaseServerClient();
  let query = supabase.from("projects").select(PROJECT_SELECT);

  if (!includeDrafts) {
    query = query.not("published_content", "is", null);
  }

  const { data, error } = await query;
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
  let query = supabase.from("projects").select(PROJECT_SELECT).eq("slug", slug).limit(1);

  if (!includeDrafts) {
    query = query.not("published_content", "is", null);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? [])[0] as ProjectRow | undefined) ?? null;
}

function pickPreferredContent(row: ProjectRecord) {
  return row.draftContent ?? row.publishedContent ?? createEmptyProjectDocument();
}

async function assertUniversity(universityId: string) {
  if (!(await isKnownUniversityId(universityId))) {
    throw new Error("Selected university is not in the current JUNK catalog.");
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

export async function getHomepageUniversities({
  includeDrafts = false,
}: {
  includeDrafts?: boolean;
} = {}): Promise<University[]> {
  const experienceProjects = await getExperienceProjects({ includeDrafts });
  return await mergeProjectsIntoUniversities(experienceProjects);
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

  const experienceProject = toExperienceProject(mapped, includeDrafts);
  if (!experienceProject) return null;

  return {
    ...experienceProject,
    university: await getUniversityById(experienceProject.universityId),
  };
}

export async function getPublishedProjectBySlug(slug: string) {
  return getExperienceProjectBySlug(slug, { includeDrafts: false });
}

export async function getPortalProjectSummaries(): Promise<PortalProjectSummary[]> {
  const rows = await listProjectRows({ includeDrafts: true });
  const records = await Promise.all(rows.map(mapProjectRow));
  return records.map((record) => {
    const content = pickPreferredContent(record);

    return {
      id: record.id,
      slug: record.slug,
      status: record.publishedContent ? "published" : "draft",
      title: content.title || record.slug,
      universityId: record.universityId,
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
  if (document.universityId) {
    await assertUniversity(document.universityId);
  }

  const supabase = getSupabaseServerClient();
  const timestamp = new Date().toISOString();
  const { data, error } = await supabase
    .from("projects")
    .insert({
      id: randomUUID(),
      slug: document.slug,
      university_id: document.universityId,
      draft_content: document,
      updated_at: timestamp,
      created_at: timestamp,
    })
    .select(PROJECT_SELECT)
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
  if (document.universityId) {
    await assertUniversity(document.universityId);
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("projects")
    .update({
      slug: document.slug,
      university_id: document.universityId,
      draft_content: document,
      updated_at: new Date().toISOString(),
    })
    .eq("slug", currentSlug)
    .select(PROJECT_SELECT)
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

  const supabase = getSupabaseServerClient();
  const timestamp = new Date().toISOString();
  const { data, error } = await supabase
    .from("projects")
    .update({
      slug: document.slug,
      university_id: document.universityId,
      draft_content: document,
      published_content: document,
      published_at: timestamp,
      updated_at: timestamp,
    })
    .eq("slug", currentSlug)
    .select(PROJECT_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    previousSlug: currentSlug,
    record: await mapProjectRow(data as ProjectRow),
  };
}
