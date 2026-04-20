import type {
  ExperienceProject,
  ExperienceWorld,
  Project,
  ProjectDocument,
  ProjectRecord,
  ProjectMarkerOffset,
  World,
  WorldDocument,
} from "@/types";

export function createLegacyWorldId(projectId: string) {
  return `world-${projectId}`;
}

export function createLegacyChildProjectSlug(worldSlug: string, existingSlugs?: Set<string>) {
  const base = `${worldSlug}-project`;
  if (!existingSlugs || !existingSlugs.has(base)) {
    existingSlugs?.add(base);
    return base;
  }

  let index = 2;
  let candidate = `${base}-${index}`;
  while (existingSlugs.has(candidate)) {
    index += 1;
    candidate = `${base}-${index}`;
  }

  existingSlugs.add(candidate);
  return candidate;
}

export function projectDocumentToWorldDocument(
  document: ProjectDocument
): WorldDocument {
  return {
    slug: document.slug,
    universityId: document.universityId,
    title: document.title,
    summary: document.summary,
    year: document.year,
    tags: [...document.tags],
    coverImageUrl: document.coverImageUrl,
    cardImageUrl: document.cardImageUrl || document.coverImageUrl,
    gallery: [...document.gallery],
    markerOffset: document.markerOffset,
    locationLabel: document.locationLabel,
  };
}

export function projectSummaryToWorldDocument({
  slug,
  universityId,
  title,
  description,
  year,
  tags,
  thumbnail,
  markerOffset,
  locationLabel,
}: {
  slug: string;
  universityId: string;
  title: string;
  description: string;
  year: number;
  tags: string[];
  thumbnail: string;
  markerOffset: ProjectMarkerOffset;
  locationLabel?: string;
}): WorldDocument {
  return {
    slug,
    universityId,
    title,
    summary: description,
    year,
    tags: [...tags],
    coverImageUrl: thumbnail,
    cardImageUrl: thumbnail,
    gallery: [],
    markerOffset,
    locationLabel: locationLabel ?? "",
  };
}

export function projectRecordToLegacyChildDocument(
  document: ProjectDocument,
  worldId: string,
  childSlug: string
): ProjectDocument {
  return {
    ...document,
    slug: childSlug,
    worldId,
  };
}

export function promoteLegacyExperienceProject(
  project: ExperienceProject,
  existingChildSlugs?: Set<string>
): { world: ExperienceWorld; childProject: ExperienceProject } {
  const worldId = createLegacyWorldId(project.id);
  const worldDocument = projectDocumentToWorldDocument(project.document);
  const childSlug = createLegacyChildProjectSlug(project.slug, existingChildSlugs);
  const childDocument = projectRecordToLegacyChildDocument(
    project.document,
    worldId,
    childSlug
  );

  return {
    world: {
      id: worldId,
      slug: project.slug,
      universityId: project.universityId,
      status: project.status,
      hasUnpublishedChanges: project.hasUnpublishedChanges,
      document: worldDocument,
      publishedAt: project.publishedAt,
      updatedAt: project.updatedAt,
      createdAt: project.createdAt,
    },
    childProject: {
      ...project,
      worldId,
      document: childDocument,
      slug: childSlug,
    },
  };
}

export function promoteLegacyProjectSummary(
  project: Project,
  universityId: string
): World {
  const worldId = createLegacyWorldId(project.id);
  const worldSlug = project.slug ?? project.id;
  const childSlug = createLegacyChildProjectSlug(worldSlug);
  const worldDocument = projectSummaryToWorldDocument({
    slug: worldSlug,
    universityId,
    title: project.title,
    description: project.description,
    year: project.year,
    tags: project.tags,
    thumbnail: project.thumbnail,
    markerOffset: project.markerOffset,
    locationLabel: project.locationLabel,
  });

  return {
    id: worldId,
    universityId,
    slug: worldSlug,
    title: project.title,
    description: project.description,
    year: project.year,
    thumbnail: project.thumbnail,
    tags: [...project.tags],
    markerOffset: project.markerOffset,
    locationLabel: project.locationLabel,
    status: project.status,
    hasUnpublishedChanges: project.hasUnpublishedChanges,
    document: worldDocument,
    projects: [
      {
        ...project,
        worldId,
        slug: childSlug,
        document: project.document
          ? projectRecordToLegacyChildDocument(project.document, worldId, childSlug)
          : undefined,
      },
    ],
  };
}

export function projectRecordToLegacyChildRecord(
  record: ProjectRecord,
  childSlug: string
): ProjectRecord {
  const worldId = createLegacyWorldId(record.id);

  return {
    ...record,
    worldId,
    slug: childSlug,
    draftContent: record.draftContent
      ? projectRecordToLegacyChildDocument(record.draftContent, worldId, childSlug)
      : null,
    publishedContent: record.publishedContent
      ? projectRecordToLegacyChildDocument(record.publishedContent, worldId, childSlug)
      : null,
  };
}
