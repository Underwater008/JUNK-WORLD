"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PORTAL_READ_ONLY_MESSAGE } from "@/lib/portal/mode";
import { slugify } from "@/lib/utils";
import BlockNoteDocument from "@/components/projects/BlockNoteDocument";
import type {
  ProjectCollaborator,
  ProjectCredit,
  ProjectDocument,
  ProjectExternalLink,
  ProjectGalleryItem,
  University,
} from "@/types";

type SaveMode = "draft" | "publish";

interface ProjectEditorProps {
  mode: "create" | "edit";
  initialProject: ProjectDocument;
  currentSlug?: string;
  publishedAt?: string | null;
  universities: University[];
  writesDisabled?: boolean;
  variant?: "page" | "inline";
}

function arrayFromCommaSeparated(value: string) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function ArraySectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-black">
        {title}
      </h3>
      <button
        type="button"
        onClick={onAction}
        className="border border-black px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-black transition hover:bg-black hover:text-white"
      >
        {actionLabel}
      </button>
    </div>
  );
}

function uploadAsset(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  return fetch("/api/portal/uploads", {
    method: "POST",
    body: formData,
  }).then(async (response) => {
    const payload = (await response.json()) as { url?: string; error?: string };
    if (!response.ok || !payload.url) {
      throw new Error(payload.error ?? "Upload failed.");
    }
    return payload.url;
  });
}

export default function ProjectEditor({
  mode,
  initialProject,
  currentSlug,
  publishedAt,
  universities,
  writesDisabled = false,
  variant = "page",
}: ProjectEditorProps) {
  const router = useRouter();
  const [project, setProject] = useState<ProjectDocument>(initialProject);
  const [body, setBody] = useState(initialProject.body);
  const [slugTouched, setSlugTouched] = useState(Boolean(initialProject.slug));
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [savingMode, setSavingMode] = useState<SaveMode | null>(null);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const publicPath = project.slug ? `/?view=projects&project=${project.slug}` : "";
  const isEditMode = mode === "edit";
  const titleText = isEditMode ? "Edit Project" : "Add Project";
  const isInline = variant === "inline";

  const selectedUniversity = useMemo(
    () => universities.find((university) => university.id === project.universityId) ?? null,
    [project.universityId, universities]
  );

  useEffect(() => {
    setProject(initialProject);
    setBody(initialProject.body);
    setSlugTouched(Boolean(initialProject.slug));
    setStatusMessage("");
    setErrorMessage("");
    setSavingMode(null);
    setUploadingField(null);
  }, [currentSlug, initialProject]);

  function patchProject<K extends keyof ProjectDocument>(
    key: K,
    value: ProjectDocument[K]
  ) {
    setProject((current) => ({ ...current, [key]: value }));
  }

  function handleTitleChange(event: ChangeEvent<HTMLInputElement>) {
    const nextTitle = event.target.value;
    setProject((current) => ({
      ...current,
      title: nextTitle,
      slug: slugTouched ? current.slug : slugify(nextTitle),
    }));
  }

  function handleSlugChange(event: ChangeEvent<HTMLInputElement>) {
    setSlugTouched(true);
    patchProject("slug", slugify(event.target.value));
  }

  function handleUniversityChange(universityId: string) {
    const nextUniversity =
      universities.find((university) => university.id === universityId) ?? null;

    setProject((current) => {
      const useDefaultLocation =
        !current.locationLabel.trim() ||
        (current.markerOffset.lat === 0 && current.markerOffset.lng === 0);

      return {
        ...current,
        universityId,
        markerOffset:
          useDefaultLocation && nextUniversity
            ? { lat: nextUniversity.lat, lng: nextUniversity.lng }
            : current.markerOffset,
        locationLabel:
          useDefaultLocation && nextUniversity
            ? `${nextUniversity.city}, ${nextUniversity.country}`
            : current.locationLabel,
      };
    });
  }

  function updateGallery(index: number, value: ProjectGalleryItem) {
    patchProject(
      "gallery",
      project.gallery.map((item, itemIndex) => (itemIndex === index ? value : item))
    );
  }

  function updateCollaborator(index: number, value: ProjectCollaborator) {
    patchProject(
      "collaborators",
      project.collaborators.map((item, itemIndex) =>
        itemIndex === index ? value : item
      )
    );
  }

  function updateCredit(index: number, value: ProjectCredit) {
    patchProject(
      "credits",
      project.credits.map((item, itemIndex) => (itemIndex === index ? value : item))
    );
  }

  function updateExternalLink(index: number, value: ProjectExternalLink) {
    patchProject(
      "externalLinks",
      project.externalLinks.map((item, itemIndex) =>
        itemIndex === index ? value : item
      )
    );
  }

  async function handleAssetUpload(
    event: ChangeEvent<HTMLInputElement>,
    field: "coverImageUrl" | "cardImageUrl",
    fieldLabel: string
  ) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (writesDisabled) {
      setErrorMessage(PORTAL_READ_ONLY_MESSAGE);
      event.target.value = "";
      return;
    }

    setUploadingField(fieldLabel);
    setErrorMessage("");

    try {
      const url = await uploadAsset(file);
      patchProject(field, url);
      if (field === "coverImageUrl" && !project.cardImageUrl) {
        patchProject("cardImageUrl", url);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Image upload failed."
      );
    } finally {
      setUploadingField(null);
      event.target.value = "";
    }
  }

  async function handleGalleryUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (writesDisabled) {
      setErrorMessage(PORTAL_READ_ONLY_MESSAGE);
      event.target.value = "";
      return;
    }

    setUploadingField("gallery");
    setErrorMessage("");

    try {
      const url = await uploadAsset(file);
      patchProject("gallery", [...project.gallery, { url, alt: project.title }]);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Gallery upload failed."
      );
    } finally {
      setUploadingField(null);
      event.target.value = "";
    }
  }

  async function persistProject(nextMode: SaveMode) {
    if (writesDisabled) {
      setErrorMessage(PORTAL_READ_ONLY_MESSAGE);
      setStatusMessage("");
      return;
    }

    setSavingMode(nextMode);
    setStatusMessage("");
    setErrorMessage("");

    const requestBody = {
      ...project,
      body,
      tags: project.tags,
    };

    try {
      const initialResponse =
        mode === "create"
          ? await fetch("/api/portal/projects", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(requestBody),
            })
          : await fetch(
              nextMode === "publish"
                ? `/api/portal/projects/${currentSlug}/publish`
                : `/api/portal/projects/${currentSlug}`,
              {
                method: nextMode === "publish" ? "POST" : "PUT",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(requestBody),
              }
            );

      const initialPayload = (await initialResponse.json()) as {
        slug?: string;
        error?: string;
        status?: string;
      };

      if (!initialResponse.ok || !initialPayload.slug) {
        setErrorMessage(initialPayload.error ?? "Project save failed.");
        return;
      }

      const response =
        mode === "create" && nextMode === "publish"
          ? await fetch(`/api/portal/projects/${initialPayload.slug}/publish`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                ...requestBody,
                slug: initialPayload.slug,
              }),
            })
          : initialResponse;

      const payload =
        response === initialResponse
          ? initialPayload
          : ((await response.json()) as {
              slug?: string;
              error?: string;
              status?: string;
            });

      if (!response.ok || !payload.slug) {
        setErrorMessage(payload.error ?? "Project save failed.");
        return;
      }

      const nextSlug = payload.slug;
      const destination = `/?view=projects&edit=1&project=${nextSlug}`;
      setStatusMessage(
        nextMode === "publish"
          ? "Project published. Public view is live."
          : "Draft saved."
      );
      router.replace(destination);
      router.refresh();
    } catch {
      setErrorMessage("Project save failed. Please try again.");
    } finally {
      setSavingMode(null);
    }
  }

  return (
    <div className={isInline ? "" : "mx-auto max-w-7xl px-6 py-8 md:px-8 md:py-10"}>
      <div
        className={`grid gap-6 ${
          isInline
            ? "xl:grid-cols-[minmax(0,0.95fr)_minmax(280px,0.45fr)]"
            : "lg:grid-cols-[minmax(0,0.92fr)_minmax(320px,0.55fr)]"
        }`}
      >
        <section className="overflow-hidden border-2 border-black bg-white">
          <div className={`border-b-2 border-black ${isInline ? "px-5 py-4 md:px-6" : "px-6 py-5"}`}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#6F6F6F]">
              {isInline ? "Inline Editor" : "Portal Editor"}
            </p>
            <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className={`font-serif leading-none text-black ${isInline ? "text-3xl md:text-4xl" : "text-4xl"}`}>
                  {titleText}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-black/75">
                  Shape the card, globe target, and long-form page content without leaving
                  the projects view.
                </p>
              </div>
              {publicPath ? (
                <Link
                  href={publicPath}
                  target="_blank"
                  className="border border-black px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-black transition hover:bg-black hover:text-white"
                >
                  View Public Page
                </Link>
              ) : null}
            </div>
          </div>

          <div className={`space-y-8 ${isInline ? "px-5 py-5 md:px-6" : "px-6 py-6"}`}>
            {writesDisabled ? (
              <div className="border border-[#D97706] bg-[#FFF4E8] px-4 py-4 text-sm leading-6 text-[#8A3B12]">
                {PORTAL_READ_ONLY_MESSAGE}
              </div>
            ) : null}

            <div className="grid gap-5 md:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#6F6F6F]">
                  Title
                </span>
                <input
                  value={project.title}
                  onChange={handleTitleChange}
                  className="border border-black px-3 py-3 text-sm text-black outline-none"
                  placeholder="Project title"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#6F6F6F]">
                  Slug
                </span>
                <input
                  value={project.slug}
                  onChange={handleSlugChange}
                  className="border border-black px-3 py-3 text-sm text-black outline-none"
                  placeholder="project-slug"
                />
              </label>
            </div>

            <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_160px_180px]">
              <label className="flex flex-col gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#6F6F6F]">
                  University
                </span>
                <select
                  value={project.universityId}
                  onChange={(event) => handleUniversityChange(event.target.value)}
                  className="border border-black bg-white px-3 py-3 text-sm text-black outline-none"
                >
                  <option value="">Select a university</option>
                  {universities.map((university) => (
                    <option key={university.id} value={university.id}>
                      {university.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#6F6F6F]">
                  Year
                </span>
                <input
                  type="number"
                  value={project.year}
                  onChange={(event) =>
                    patchProject("year", Number(event.target.value) || new Date().getFullYear())
                  }
                  className="border border-black px-3 py-3 text-sm text-black outline-none"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#6F6F6F]">
                  Participants
                </span>
                <input
                  type="number"
                  min={0}
                  value={project.participantsCount}
                  onChange={(event) =>
                    patchProject("participantsCount", Number(event.target.value) || 0)
                  }
                  className="border border-black px-3 py-3 text-sm text-black outline-none"
                />
              </label>
            </div>

            <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_160px_160px]">
              <label className="flex flex-col gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#6F6F6F]">
                  Location Label
                </span>
                <input
                  value={project.locationLabel}
                  onChange={(event) => patchProject("locationLabel", event.target.value)}
                  className="border border-black px-3 py-3 text-sm text-black outline-none"
                  placeholder="Cartagena, Colombia"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#6F6F6F]">
                  Latitude
                </span>
                <input
                  type="number"
                  step="0.0001"
                  value={project.markerOffset.lat}
                  onChange={(event) =>
                    patchProject("markerOffset", {
                      ...project.markerOffset,
                      lat: Number(event.target.value) || 0,
                    })
                  }
                  className="border border-black px-3 py-3 text-sm text-black outline-none"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#6F6F6F]">
                  Longitude
                </span>
                <input
                  type="number"
                  step="0.0001"
                  value={project.markerOffset.lng}
                  onChange={(event) =>
                    patchProject("markerOffset", {
                      ...project.markerOffset,
                      lng: Number(event.target.value) || 0,
                    })
                  }
                  className="border border-black px-3 py-3 text-sm text-black outline-none"
                />
              </label>
            </div>

            <label className="flex flex-col gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#6F6F6F]">
                Summary
              </span>
              <textarea
                value={project.summary}
                onChange={(event) => patchProject("summary", event.target.value)}
                className="min-h-32 border border-black px-3 py-3 text-sm leading-6 text-black outline-none"
                placeholder="Short public-facing summary for cards and page intro"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#6F6F6F]">
                Tags
              </span>
              <input
                value={project.tags.join(", ")}
                onChange={(event) =>
                  patchProject("tags", arrayFromCommaSeparated(event.target.value))
                }
                className="border border-black px-3 py-3 text-sm text-black outline-none"
                placeholder="Worldbuilding, Game Design, Film"
              />
            </label>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="border border-black p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#6F6F6F]">
                      Cover Image
                    </p>
                    <p className="mt-2 text-sm leading-6 text-black/70">
                      Large hero image for the public project page.
                    </p>
                  </div>
                  <label className="border border-black px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-black transition hover:bg-black hover:text-white">
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={writesDisabled}
                      onChange={(event) =>
                        void handleAssetUpload(event, "coverImageUrl", "cover image")
                      }
                    />
                  </label>
                </div>
                {project.coverImageUrl ? (
                  <img
                    src={project.coverImageUrl}
                    alt={project.title || "Project cover"}
                    className="mt-4 aspect-[16/10] w-full border border-black object-cover"
                  />
                ) : (
                  <div className="mt-4 flex aspect-[16/10] items-center justify-center border border-dashed border-black/40 bg-[#F5F3EE] text-xs uppercase tracking-[0.16em] text-black/50">
                    No cover image
                  </div>
                )}
              </div>

              <div className="border border-black p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#6F6F6F]">
                      Card Image
                    </p>
                    <p className="mt-2 text-sm leading-6 text-black/70">
                      Used in the homepage project grid. If empty, the cover image is used.
                    </p>
                  </div>
                  <label className="border border-black px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-black transition hover:bg-black hover:text-white">
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={writesDisabled}
                      onChange={(event) =>
                        void handleAssetUpload(event, "cardImageUrl", "card image")
                      }
                    />
                  </label>
                </div>
                {(project.cardImageUrl || project.coverImageUrl) ? (
                  <img
                    src={project.cardImageUrl || project.coverImageUrl}
                    alt={project.title || "Project card"}
                    className="mt-4 aspect-[16/10] w-full border border-black object-cover"
                  />
                ) : (
                  <div className="mt-4 flex aspect-[16/10] items-center justify-center border border-dashed border-black/40 bg-[#F5F3EE] text-xs uppercase tracking-[0.16em] text-black/50">
                    No card image
                  </div>
                )}
              </div>
            </div>

            <div className="border border-black p-4">
              <div className="mb-3">
                <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-black">
                  Gallery
                </h3>
              </div>
              <label className="mb-4 inline-flex border border-black px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-black transition hover:bg-black hover:text-white">
                Add to Gallery
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={writesDisabled}
                  onChange={(event) => void handleGalleryUpload(event)}
                />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                {project.gallery.map((item, index) => (
                  <div key={`${item.url}-${index}`} className="border border-black p-3">
                    <img
                      src={item.url}
                      alt={item.alt || project.title}
                      className="aspect-[16/10] w-full border border-black object-cover"
                    />
                    <input
                      value={item.alt}
                      onChange={(event) =>
                        updateGallery(index, { ...item, alt: event.target.value })
                      }
                      className="mt-3 w-full border border-black px-3 py-2 text-sm text-black outline-none"
                      placeholder="Alt text"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        patchProject(
                          "gallery",
                          project.gallery.filter((_, itemIndex) => itemIndex !== index)
                        )
                      }
                      className="mt-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-black/60 transition hover:text-black"
                    >
                      Remove image
                    </button>
                  </div>
                ))}
                {!project.gallery.length ? (
                  <div className="flex min-h-40 items-center justify-center border border-dashed border-black/40 bg-[#F5F3EE] text-xs uppercase tracking-[0.16em] text-black/50">
                    No gallery items yet
                  </div>
                ) : null}
              </div>
            </div>

            <div className="border border-black p-4">
              <ArraySectionHeader
                title="Collaborators"
                actionLabel="Add Collaborator"
                onAction={() =>
                  patchProject("collaborators", [
                    ...project.collaborators,
                    { name: "", role: "" },
                  ])
                }
              />
              <div className="space-y-3">
                {project.collaborators.map((item, index) => (
                  <div key={`collaborator-${index}`} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_auto]">
                    <input
                      value={item.name}
                      onChange={(event) =>
                        updateCollaborator(index, { ...item, name: event.target.value })
                      }
                      className="border border-black px-3 py-2 text-sm text-black outline-none"
                      placeholder="Name"
                    />
                    <input
                      value={item.role}
                      onChange={(event) =>
                        updateCollaborator(index, { ...item, role: event.target.value })
                      }
                      className="border border-black px-3 py-2 text-sm text-black outline-none"
                      placeholder="Role"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        patchProject(
                          "collaborators",
                          project.collaborators.filter((_, itemIndex) => itemIndex !== index)
                        )
                      }
                      className="border border-black px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-black transition hover:bg-black hover:text-white"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {!project.collaborators.length ? (
                  <p className="text-sm text-black/55">No collaborators yet.</p>
                ) : null}
              </div>
            </div>

            <div className="border border-black p-4">
              <ArraySectionHeader
                title="Credits"
                actionLabel="Add Credit"
                onAction={() =>
                  patchProject("credits", [...project.credits, { label: "", value: "" }])
                }
              />
              <div className="space-y-3">
                {project.credits.map((item, index) => (
                  <div key={`credit-${index}`} className="grid gap-3 md:grid-cols-[180px_minmax(0,1fr)_auto]">
                    <input
                      value={item.label}
                      onChange={(event) =>
                        updateCredit(index, { ...item, label: event.target.value })
                      }
                      className="border border-black px-3 py-2 text-sm text-black outline-none"
                      placeholder="Label"
                    />
                    <input
                      value={item.value}
                      onChange={(event) =>
                        updateCredit(index, { ...item, value: event.target.value })
                      }
                      className="border border-black px-3 py-2 text-sm text-black outline-none"
                      placeholder="Value"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        patchProject(
                          "credits",
                          project.credits.filter((_, itemIndex) => itemIndex !== index)
                        )
                      }
                      className="border border-black px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-black transition hover:bg-black hover:text-white"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {!project.credits.length ? (
                  <p className="text-sm text-black/55">No credits yet.</p>
                ) : null}
              </div>
            </div>

            <div className="border border-black p-4">
              <ArraySectionHeader
                title="External Links"
                actionLabel="Add Link"
                onAction={() =>
                  patchProject("externalLinks", [
                    ...project.externalLinks,
                    { label: "", url: "" },
                  ])
                }
              />
              <div className="space-y-3">
                {project.externalLinks.map((item, index) => (
                  <div key={`link-${index}`} className="grid gap-3 md:grid-cols-[200px_minmax(0,1fr)_auto]">
                    <input
                      value={item.label}
                      onChange={(event) =>
                        updateExternalLink(index, { ...item, label: event.target.value })
                      }
                      className="border border-black px-3 py-2 text-sm text-black outline-none"
                      placeholder="Label"
                    />
                    <input
                      value={item.url}
                      onChange={(event) =>
                        updateExternalLink(index, { ...item, url: event.target.value })
                      }
                      className="border border-black px-3 py-2 text-sm text-black outline-none"
                      placeholder="https://..."
                    />
                    <button
                      type="button"
                      onClick={() =>
                        patchProject(
                          "externalLinks",
                          project.externalLinks.filter((_, itemIndex) => itemIndex !== index)
                        )
                      }
                      className="border border-black px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-black transition hover:bg-black hover:text-white"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {!project.externalLinks.length ? (
                  <p className="text-sm text-black/55">No external links yet.</p>
                ) : null}
              </div>
            </div>

            <div className="border border-black">
              <div className="border-b border-black px-4 py-3">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-black">
                  Project Page Body
                </p>
                <p className="mt-2 text-sm leading-6 text-black/70">
                  Freeform narrative content, sections, lists, quotes, and images.
                </p>
              </div>
              <div className="bg-[#F8F5EF] p-4">
                <BlockNoteDocument
                  body={body}
                  editable
                  uploadFile={uploadAsset}
                  onChange={setBody}
                  className="min-h-[380px] border border-black bg-white p-4"
                  resetKey={currentSlug ?? "new-project"}
                />
              </div>
            </div>
          </div>
        </section>

        <aside className={`space-y-5 ${isInline ? "xl:sticky xl:top-6 xl:self-start" : ""}`}>
          <div className="overflow-hidden border-2 border-black bg-white">
            <div className="border-b-2 border-black px-5 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#6F6F6F]">
                Draft Status
              </p>
              <h2 className="mt-3 font-serif text-3xl leading-none text-black">
                {publishedAt ? "Published" : isEditMode ? "Draft changes" : "New draft"}
              </h2>
            </div>
            <div className="space-y-3 px-5 py-5 text-sm leading-6 text-black/75">
              <p>
                {selectedUniversity
                  ? `${selectedUniversity.name} / ${selectedUniversity.city}, ${selectedUniversity.country}`
                  : "Choose a university to connect this project to the public catalog."}
              </p>
              <p>
                Public URL:
                {" "}
                {publicPath ? (
                  <Link href={publicPath} target="_blank" className="underline underline-offset-4">
                    {publicPath}
                  </Link>
                ) : (
                  <span className="text-black/50">Set a slug first</span>
                )}
              </p>
              {uploadingField ? (
                <p className="text-[#005F73]">Uploading {uploadingField}...</p>
              ) : null}
              {statusMessage ? <p className="text-[#0B6E4F]">{statusMessage}</p> : null}
              {errorMessage ? <p className="text-[#B42318]">{errorMessage}</p> : null}
            </div>
            <div className="grid gap-3 border-t border-black p-5">
              <button
                type="button"
                disabled={savingMode !== null || writesDisabled}
                onClick={() => void persistProject("draft")}
                className="border-2 border-black bg-white px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-black transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {writesDisabled
                  ? "Save Disabled In Dev"
                  : savingMode === "draft"
                    ? "Saving..."
                    : "Save Draft"}
              </button>
              <button
                type="button"
                disabled={savingMode !== null || writesDisabled}
                onClick={() => void persistProject("publish")}
                className="border-2 border-black bg-black px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                {writesDisabled
                  ? "Publish Disabled In Dev"
                  : savingMode === "publish"
                    ? "Publishing..."
                    : "Publish Changes"}
              </button>
            </div>
          </div>

          <div className="overflow-hidden border-2 border-black bg-white">
            <div className="border-b-2 border-black px-5 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#6F6F6F]">
                Notes
              </p>
            </div>
            <div className="space-y-3 px-5 py-5 text-sm leading-6 text-black/75">
              <p>Save draft to persist work without changing the public projects view.</p>
              <p>Publish to update the projects grid, focused view, and globe metadata.</p>
              <p>BlockNote supports rich text, image blocks, video blocks, and file attachments.</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
