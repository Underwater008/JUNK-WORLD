"use client";

import { ChangeEvent, forwardRef, useEffect, useImperativeHandle, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { PORTAL_READ_ONLY_MESSAGE } from "@/lib/portal/mode";
import { slugify } from "@/lib/utils";
import { uploadAsset } from "@/lib/uploads";
import CardCropOverlay from "@/components/portal/CardCropOverlay";
import CoverImageUpload from "@/components/portal/CoverImageUpload";
import MetaRow from "@/components/portal/MetaRow";
import TagEditor from "@/components/portal/TagEditor";
import SettingsPanel from "@/components/portal/SettingsPanel";
import type { ProjectDocument, University } from "@/types";

type SaveMode = "draft" | "publish";

const BlockNoteDocument = dynamic(
  () => import("@/components/projects/BlockNoteDocument"),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[300px] rounded-md border border-black/6 bg-black/[0.015]" />
    ),
  }
);

export interface ProjectEditorHandle {
  saveDraft: () => void;
  publish: () => void;
  savingMode: "draft" | "publish" | null;
}

interface ProjectEditorProps {
  mode: "create" | "edit";
  initialProject: ProjectDocument;
  currentSlug?: string;
  universities: University[];
  writesDisabled?: boolean;
  variant?: "page" | "inline";
  hideTopBar?: boolean;
  onBack?: () => void;
  onSavingStateChange?: (mode: "draft" | "publish" | null) => void;
}

const ProjectEditor = forwardRef<ProjectEditorHandle, ProjectEditorProps>(function ProjectEditor({
  mode,
  initialProject,
  currentSlug,
  universities,
  writesDisabled = false,
  hideTopBar = false,
  onBack,
  onSavingStateChange,
}, ref) {
  const router = useRouter();
  const [project, setProject] = useState<ProjectDocument>(initialProject);
  const [body, setBody] = useState(initialProject.body);
  const [slugTouched, setSlugTouched] = useState(Boolean(initialProject.slug));
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [savingMode, setSavingMode] = useState<SaveMode | null>(null);
  const [showCropOverlay, setShowCropOverlay] = useState(false);

  const isEditMode = mode === "edit";

  useImperativeHandle(ref, () => ({
    saveDraft: () => void persistProject("draft"),
    publish: () => void persistProject("publish"),
    savingMode,
  }), [savingMode]);

  useEffect(() => {
    onSavingStateChange?.(savingMode);
  }, [savingMode, onSavingStateChange]);

  useMemo(
    () => universities.find((u) => u.id === project.universityId) ?? null,
    [project.universityId, universities]
  );

  // Reset state when project changes
  useEffect(() => {
    setProject(initialProject);
    setBody(initialProject.body);
    setSlugTouched(Boolean(initialProject.slug));
    setStatusMessage("");
    setErrorMessage("");
    setSavingMode(null);
  }, [currentSlug, initialProject]);

  // Auto-fade status message
  useEffect(() => {
    if (!statusMessage) return;
    const t = setTimeout(() => setStatusMessage(""), 3000);
    return () => clearTimeout(t);
  }, [statusMessage]);

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

  function handleUniversityChange(universityId: string) {
    const nextUniversity =
      universities.find((u) => u.id === universityId) ?? null;
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

  function handleCoverChange(url: string) {
    patchProject("coverImageUrl", url);
    if (url) {
      setShowCropOverlay(true);
    } else {
      patchProject("cardImageUrl", "");
      setShowCropOverlay(false);
    }
  }

  function handleCropConfirm(cardUrl: string) {
    patchProject("cardImageUrl", cardUrl);
    setShowCropOverlay(false);
  }

  function handleCropSkip() {
    patchProject("cardImageUrl", project.coverImageUrl);
    setShowCropOverlay(false);
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

    const requestBody = { ...project, body, tags: project.tags };

    try {
      const initialResponse =
        mode === "create"
          ? await fetch("/api/portal/projects", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(requestBody),
            })
          : await fetch(
              nextMode === "publish"
                ? `/api/portal/projects/${currentSlug}/publish`
                : `/api/portal/projects/${currentSlug}`,
              {
                method: nextMode === "publish" ? "POST" : "PUT",
                headers: { "Content-Type": "application/json" },
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
          ? await fetch(
              `/api/portal/projects/${initialPayload.slug}/publish`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...requestBody, slug: initialPayload.slug }),
              }
            )
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

      const destination = `/?view=projects&edit=1&project=${payload.slug}`;
      setStatusMessage(
        nextMode === "publish"
          ? "Published"
          : "Draft saved"
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
    <div className="bg-white">
      {/* Sticky top bar — within pane scroller */}
      {!hideTopBar && (
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-black/8 bg-white/95 px-5 py-3 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="rounded-md px-2 py-1 text-[11px] font-medium text-black/40 transition hover:bg-black/5 hover:text-black/70"
              >
                ← Back
              </button>
            )}
            <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-black/25">
              {isEditMode ? "Editing" : "New project"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={savingMode !== null || writesDisabled}
              onClick={() => void persistProject("draft")}
              className="rounded-md border border-black/15 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-black/60 transition hover:border-black/30 hover:text-black disabled:opacity-40"
            >
              {savingMode === "draft" ? "Saving..." : "Save Draft"}
            </button>
            <button
              type="button"
              disabled={savingMode !== null || writesDisabled}
              onClick={() => void persistProject("publish")}
              className="rounded-md bg-black px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-black/80 disabled:opacity-40"
            >
              {savingMode === "publish" ? "Publishing..." : "Publish"}
            </button>
          </div>
        </div>
      )}

      {/* Status messages (shown even when top bar is hidden) */}
      {hideTopBar && (statusMessage || errorMessage) && (
        <div className="px-5 py-2">
          {statusMessage && (
            <span className="text-[11px] font-medium text-emerald-600">{statusMessage}</span>
          )}
          {errorMessage && (
            <span className="text-[11px] font-medium text-red-600">{errorMessage}</span>
          )}
        </div>
      )}

      {writesDisabled && (
        <div className="border-b border-amber-300 bg-amber-50 px-5 py-3 text-xs text-amber-800">
          {PORTAL_READ_ONLY_MESSAGE}
        </div>
      )}

      {/* Cover image */}
      <CoverImageUpload
        imageUrl={project.coverImageUrl}
        onImageChange={handleCoverChange}
        disabled={writesDisabled}
      />

      {/* Crop overlay modal */}
      {showCropOverlay && project.coverImageUrl && (
        <CardCropOverlay
          coverImageUrl={project.coverImageUrl}
          onCrop={handleCropConfirm}
          onCancel={handleCropSkip}
          disabled={writesDisabled}
        />
      )}

      {/* Document body */}
      <div className="mx-auto max-w-3xl px-6 py-8">
        {/* Meta row */}
        <MetaRow
          slug={project.slug}
          universityId={project.universityId}
          year={project.year}
          participantsCount={project.participantsCount}
          markerOffset={project.markerOffset}
          locationLabel={project.locationLabel}
          universities={universities}
          onUniversityChange={handleUniversityChange}
          onYearChange={(year) => patchProject("year", year)}
          onParticipantsChange={(count) => patchProject("participantsCount", count)}
          onMarkerOffsetChange={(markerOffset) =>
            patchProject("markerOffset", markerOffset)
          }
          onLocationLabelChange={(label) => patchProject("locationLabel", label)}
          onSlugChange={(slug) => patchProject("slug", slugify(slug))}
          disabled={writesDisabled}
        />

        {/* Title — styled input that looks like a heading */}
        <input
          value={project.title}
          onChange={handleTitleChange}
          placeholder="Untitled"
          disabled={writesDisabled}
          className="mt-4 w-full border-0 bg-transparent font-serif text-[2.8rem] leading-[1.05] text-black outline-none placeholder:text-black/15"
        />

        {/* Summary — styled textarea that looks like a paragraph */}
        <textarea
          value={project.summary}
          onChange={(e) => patchProject("summary", e.target.value)}
          placeholder="Write a short summary..."
          disabled={writesDisabled}
          rows={2}
          className="mt-3 w-full resize-none border-0 bg-transparent text-base leading-7 text-black/65 outline-none placeholder:text-black/20"
        />

        {/* Divider */}
        <div className="my-6 h-px bg-black/8" />

        {/* BlockNote body — flows naturally, no box */}
        <BlockNoteDocument
          body={body}
          editable={!writesDisabled}
          uploadFile={uploadAsset}
          onChange={setBody}
          className="min-h-[300px] project-body"
          resetKey={currentSlug ?? "new-project"}
        />

        {/* Divider */}
        <div className="my-6 h-px bg-black/8" />

        {/* Tags */}
        <TagEditor
          tags={project.tags}
          onChange={(tags) => patchProject("tags", tags)}
          disabled={writesDisabled}
        />

        {/* Divider */}
        <div className="my-6 h-px bg-black/8" />

        {/* Settings panel (collapsible) */}
        <SettingsPanel
          project={project}
          onPatch={patchProject}
          disabled={writesDisabled}
        />
      </div>
    </div>
  );
});

export default ProjectEditor;
