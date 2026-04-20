export interface ProjectMarkerOffset {
  lat: number;
  lng: number;
}

export interface ProjectGalleryItem {
  url: string;
  alt: string;
}

export interface ProjectCollaborator {
  name: string;
  role: string;
}

export interface ProjectCredit {
  label: string;
  value: string;
}

export interface ProjectExternalLink {
  label: string;
  url: string;
}

export type ProjectBodyBlock = Record<string, unknown>;
export type ProjectBody = ProjectBodyBlock[];

export interface WorldDocument {
  slug: string;
  universityId: string;
  title: string;
  summary: string;
  year: number;
  tags: string[];
  coverImageUrl: string;
  cardImageUrl: string;
  gallery: ProjectGalleryItem[];
  markerOffset: ProjectMarkerOffset;
  locationLabel: string;
}

export interface ProjectDocument {
  slug: string;
  universityId: string;
  worldId: string;
  title: string;
  summary: string;
  year: number;
  tags: string[];
  coverImageUrl: string;
  cardImageUrl: string;
  gallery: ProjectGalleryItem[];
  participantsCount: number;
  markerOffset: ProjectMarkerOffset;
  locationLabel: string;
  collaborators: ProjectCollaborator[];
  credits: ProjectCredit[];
  externalLinks: ProjectExternalLink[];
  body: ProjectBody;
}

export interface Project {
  id: string;
  worldId: string;
  slug?: string;
  title: string;
  description: string;
  year: number;
  thumbnail: string;
  participants: number;
  tags: string[];
  markerOffset: ProjectMarkerOffset;
  locationLabel?: string;
  status?: "draft" | "published";
  hasUnpublishedChanges?: boolean;
  document?: ProjectDocument;
}

export interface World {
  id: string;
  universityId: string;
  slug?: string;
  title: string;
  description: string;
  year: number;
  thumbnail: string;
  tags: string[];
  markerOffset: ProjectMarkerOffset;
  locationLabel?: string;
  status?: "draft" | "published";
  hasUnpublishedChanges?: boolean;
  document?: WorldDocument;
  projects: Project[];
}

export interface University {
  id: string;
  name: string;
  shortName: string;
  city: string;
  lat: number;
  lng: number;
  color: string;
  country: string;
  disciplines: string[];
  worlds: World[];
  logo?: string;
  status?: "active" | "inactive";
}

export interface Member {
  id: string;
  name: string;
  title: string;
  university: string;
  universityId?: string;
  country: string;
  city: string;
  bio: string;
  image?: string;
  profileUrl?: string;
  websiteUrl?: string;
}

export interface WorldRecord {
  id: string;
  slug: string;
  universityId: string;
  draftContent: WorldDocument | null;
  publishedContent: WorldDocument | null;
  publishedAt: string | null;
  updatedAt: string;
  createdAt: string;
}

export interface ProjectRecord {
  id: string;
  slug: string;
  universityId: string;
  worldId: string;
  draftContent: ProjectDocument | null;
  publishedContent: ProjectDocument | null;
  publishedAt: string | null;
  updatedAt: string;
  createdAt: string;
}

export interface PortalWorldSummary {
  id: string;
  slug: string;
  status: "draft" | "published";
  title: string;
  universityId: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface PortalProjectSummary {
  id: string;
  slug: string;
  status: "draft" | "published";
  title: string;
  universityId: string;
  worldId: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface PublishedWorld {
  id: string;
  slug: string;
  universityId: string;
  document: WorldDocument;
  publishedAt: string | null;
  updatedAt: string;
  createdAt: string;
}

export interface ExperienceWorld {
  id: string;
  slug: string;
  universityId: string;
  status: "draft" | "published";
  hasUnpublishedChanges: boolean;
  document: WorldDocument;
  publishedAt: string | null;
  updatedAt: string;
  createdAt: string;
}

export interface PublishedProject {
  id: string;
  slug: string;
  universityId: string;
  worldId: string;
  document: ProjectDocument;
  publishedAt: string | null;
  updatedAt: string;
  createdAt: string;
}

export interface ExperienceProject {
  id: string;
  slug: string;
  universityId: string;
  worldId: string;
  status: "draft" | "published";
  hasUnpublishedChanges: boolean;
  document: ProjectDocument;
  publishedAt: string | null;
  updatedAt: string;
  createdAt: string;
}
