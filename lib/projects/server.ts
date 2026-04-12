import "server-only";

import { randomUUID } from "node:crypto";
import type postgres from "postgres";
import { getSql } from "@/lib/db";
import { isPortalWriteDisabled } from "@/lib/portal/mode";
import { createEmptyProjectDocument } from "@/lib/projects/defaults";
import { backfillProjectDocument } from "@/lib/projects/defaults.server";
import { normalizeProjectDocument } from "@/lib/projects/schema";
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

function toJsonRecord(document: ProjectDocument) {
  return JSON.parse(JSON.stringify(document)) as postgres.JSONValue;
}

let projectSchemaEnsured = false;

async function ensureProjectTable() {
  if (projectSchemaEnsured) return;
  if (isPortalWriteDisabled()) {
    projectSchemaEnsured = true;
    return;
  }

  const sql = getSql();
  await sql`
    create table if not exists projects (
      id text primary key,
      slug text not null unique,
      university_id text not null,
      draft_content jsonb,
      published_content jsonb,
      published_at timestamptz,
      updated_at timestamptz not null default now(),
      created_at timestamptz not null default now()
    );
  `;
  await sql`create index if not exists projects_university_idx on projects (university_id);`;
  await sql`create index if not exists projects_published_idx on projects (published_at desc);`;

  projectSchemaEnsured = true;
}

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
    await ensureProjectTable();
    const sql = getSql();
    const rows = await sql<ProjectRow[]>`
      select id, slug, university_id, draft_content, published_content, published_at, updated_at, created_at
      from projects
      ${includeDrafts ? sql`` : sql`where published_content is not null`}
      order by published_at desc nulls last, updated_at desc;
    `;

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
  await ensureProjectTable();
  const sql = getSql();
  const rows = await sql<ProjectRow[]>`
    select id, slug, university_id, draft_content, published_content, published_at, updated_at, created_at
    from projects
    where slug = ${slug}
      ${includeDrafts ? sql`` : sql`and published_content is not null`}
    limit 1;
  `;

  const mapped = rows[0] ? await mapProjectRow(rows[0]) : null;
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
  await ensureProjectTable();
  const sql = getSql();
  const rows = await sql<ProjectRow[]>`
    select id, slug, university_id, draft_content, published_content, published_at, updated_at, created_at
    from projects
    order by updated_at desc;
  `;

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
  await ensureProjectTable();
  const sql = getSql();
  const rows = await sql<ProjectRow[]>`
    select id, slug, university_id, draft_content, published_content, published_at, updated_at, created_at
    from projects
    where slug = ${slug}
    limit 1;
  `;

  const row = rows[0];
  if (!row) return null;

  return await mapProjectRow(row);
}

export async function createProjectDraft(input: unknown) {
  await ensureProjectTable();

  const document = await normalizeProjectDocument(input);
  await assertUniversity(document.universityId);

  const sql = getSql();
  const inserted = await sql<ProjectRow[]>`
    insert into projects (id, slug, university_id, draft_content, updated_at, created_at)
    values (
      ${randomUUID()},
      ${document.slug},
      ${document.universityId},
      ${sql.json(toJsonRecord(document))},
      now(),
      now()
    )
    returning id, slug, university_id, draft_content, published_content, published_at, updated_at, created_at;
  `;

  return await mapProjectRow(inserted[0]);
}

export async function updateProjectDraft(currentSlug: string, input: unknown) {
  await ensureProjectTable();

  const existing = await getPortalProjectBySlug(currentSlug);
  if (!existing) {
    throw new Error("Project not found.");
  }

  const document = await normalizeProjectDocument(input, existing.slug);
  await assertUniversity(document.universityId);

  const sql = getSql();
  const updated = await sql<ProjectRow[]>`
    update projects
    set slug = ${document.slug},
        university_id = ${document.universityId},
        draft_content = ${sql.json(toJsonRecord(document))},
        updated_at = now()
    where slug = ${currentSlug}
    returning id, slug, university_id, draft_content, published_content, published_at, updated_at, created_at;
  `;

  return {
    previousSlug: currentSlug,
    record: await mapProjectRow(updated[0]),
  };
}

export async function publishProject(currentSlug: string, input: unknown) {
  await ensureProjectTable();

  const existing = await getPortalProjectBySlug(currentSlug);
  if (!existing) {
    throw new Error("Project not found.");
  }

  const document = await normalizeProjectDocument(input, existing.slug);
  await assertUniversity(document.universityId);

  const sql = getSql();
  const updated = await sql<ProjectRow[]>`
    update projects
    set slug = ${document.slug},
        university_id = ${document.universityId},
        draft_content = ${sql.json(toJsonRecord(document))},
        published_content = ${sql.json(toJsonRecord(document))},
        published_at = now(),
        updated_at = now()
    where slug = ${currentSlug}
    returning id, slug, university_id, draft_content, published_content, published_at, updated_at, created_at;
  `;

  return {
    previousSlug: currentSlug,
    record: await mapProjectRow(updated[0]),
  };
}
