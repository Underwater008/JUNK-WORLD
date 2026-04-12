"use client";

import {
  ChangeEvent,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
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
  appendGalleryItems: (items: ProjectDocument["gallery"]) => void;
  setGalleryItems: (items: ProjectDocument["gallery"]) => void;
  savingMode: "draft" | "publish" | null;
}

type ProjectSaveSuccess = {
  slug: string;
  mode: SaveMode;
  document: ProjectDocument;
};

type SaveToastTone = "pending" | "success" | "error";

type SaveToast = {
  id: number;
  tone: SaveToastTone;
  message: string;
};

const SAVE_FEEDBACK_FLASH_KEY = "project-editor-save-feedback";
const SAVE_FEEDBACK_FLASH_TTL_MS = 5000;

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
  onDocumentChange?: (document: ProjectDocument) => void;
  onDirtyStateChange?: (dirty: boolean) => void;
  onSaveSuccess?: (result: ProjectSaveSuccess) => void;
}

function serializeProjectDocument(document: ProjectDocument) {
  return JSON.stringify(document);
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
  onDocumentChange,
  onDirtyStateChange,
  onSaveSuccess,
}, ref) {
  const router = useRouter();
  const [project, setProject] = useState<ProjectDocument>(initialProject);
  const [body, setBody] = useState(initialProject.body);
  const [slugTouched, setSlugTouched] = useState(Boolean(initialProject.slug));
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [savingMode, setSavingMode] = useState<SaveMode | null>(null);
  const [showCropOverlay, setShowCropOverlay] = useState(false);
  const [saveToast, setSaveToast] = useState<SaveToast | null>(null);
  const [baselineSnapshot, setBaselineSnapshot] = useState(() =>
    serializeProjectDocument(initialProject)
  );
  const saveToastIdRef = useRef(0);

  const isEditMode = mode === "edit";
  const currentDocument = useMemo<ProjectDocument>(
    () => ({ ...project, body, tags: project.tags }),
    [project, body]
  );
  const currentDocumentSnapshot = useMemo(
    () => serializeProjectDocument(currentDocument),
    [currentDocument]
  );
  const lastEmittedDocumentSnapshotRef = useRef(currentDocumentSnapshot);
  const isDirty = useMemo(
    () => currentDocumentSnapshot !== baselineSnapshot,
    [baselineSnapshot, currentDocumentSnapshot]
  );
  const showSaveToast = useCallback((tone: SaveToastTone, message: string) => {
    saveToastIdRef.current += 1;
    setSaveToast({
      id: saveToastIdRef.current,
      tone,
      message,
    });
  }, []);
  const appendGalleryItems = useCallback((items: ProjectDocument["gallery"]) => {
    if (!items.length) return;

    setProject((current) => ({
      ...current,
      gallery: [...current.gallery, ...items],
    }));
  }, []);
  const setGalleryItems = useCallback((items: ProjectDocument["gallery"]) => {
    setProject((current) => ({
      ...current,
      gallery: items,
    }));
  }, []);

  const persistProject = useCallback(
    async (nextMode: SaveMode) => {
      if (writesDisabled) {
        setErrorMessage(PORTAL_READ_ONLY_MESSAGE);
        setStatusMessage("");
        return;
      }

      setSavingMode(nextMode);
      setStatusMessage("");
      setErrorMessage("");

      const requestBody = currentDocument;

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
                  body: JSON.stringify({
                    ...requestBody,
                    slug: initialPayload.slug,
                  }),
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

        const savedDocument = {
          ...requestBody,
          slug: payload.slug,
        };

        setProject((current) => ({
          ...current,
          slug: payload.slug ?? current.slug,
        }));
        setSlugTouched(Boolean(payload.slug));
        setBaselineSnapshot(serializeProjectDocument(savedDocument));
        const successMessage =
          nextMode === "publish" ? "Published" : "Draft saved";
        setStatusMessage(successMessage);
        window.sessionStorage.setItem(
          SAVE_FEEDBACK_FLASH_KEY,
          JSON.stringify({
            createdAt: Date.now(),
            message: successMessage,
            tone: "success",
          })
        );
        window.setTimeout(() => {
          window.sessionStorage.removeItem(SAVE_FEEDBACK_FLASH_KEY);
        }, SAVE_FEEDBACK_FLASH_TTL_MS);
        onSaveSuccess?.({
          slug: payload.slug,
          mode: nextMode,
          document: savedDocument,
        });

        const destination = `/?view=projects&edit=1&project=${payload.slug}`;
        router.replace(destination);
        router.refresh();
      } catch {
        setErrorMessage("Project save failed. Please try again.");
      } finally {
        setSavingMode(null);
      }
    },
    [currentDocument, currentSlug, mode, onSaveSuccess, router, writesDisabled]
  );

  useImperativeHandle(ref, () => ({
    saveDraft: () => void persistProject("draft"),
    publish: () => void persistProject("publish"),
    appendGalleryItems,
    setGalleryItems,
    savingMode,
  }), [appendGalleryItems, persistProject, savingMode, setGalleryItems]);

  useEffect(() => {
    onSavingStateChange?.(savingMode);
  }, [savingMode, onSavingStateChange]);

  useEffect(() => {
    const flashMessage = window.sessionStorage.getItem(SAVE_FEEDBACK_FLASH_KEY);
    if (!flashMessage) return;

    window.sessionStorage.removeItem(SAVE_FEEDBACK_FLASH_KEY);

    try {
      const parsed = JSON.parse(flashMessage) as {
        createdAt?: number;
        message?: string;
        tone?: SaveToastTone;
      };

      if (
        typeof parsed.message === "string" &&
        (parsed.tone === "success" || parsed.tone === "error") &&
        typeof parsed.createdAt === "number" &&
        Date.now() - parsed.createdAt <= SAVE_FEEDBACK_FLASH_TTL_MS
      ) {
        showSaveToast(parsed.tone, parsed.message);
      }
    } catch {
      window.sessionStorage.removeItem(SAVE_FEEDBACK_FLASH_KEY);
    }
  }, [showSaveToast]);

  useEffect(() => {
    if (!onDocumentChange) return;
    if (lastEmittedDocumentSnapshotRef.current === currentDocumentSnapshot) return;

    lastEmittedDocumentSnapshotRef.current = currentDocumentSnapshot;
    onDocumentChange(currentDocument);
  }, [currentDocument, currentDocumentSnapshot, onDocumentChange]);

  useEffect(() => {
    onDirtyStateChange?.(isDirty);
  }, [isDirty, onDirtyStateChange]);

  useEffect(() => {
    if (!isDirty || writesDisabled) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty, writesDisabled]);

  // Auto-fade status message
  useEffect(() => {
    if (!statusMessage) return;
    const t = setTimeout(() => setStatusMessage(""), 3000);
    return () => clearTimeout(t);
  }, [statusMessage]);

  useEffect(() => {
    if (!savingMode) return;

    showSaveToast(
      "pending",
      savingMode === "publish" ? "Publishing..." : "Saving draft..."
    );
  }, [savingMode, showSaveToast]);

  useEffect(() => {
    if (!statusMessage) return;
    showSaveToast("success", statusMessage);
  }, [statusMessage, showSaveToast]);

  useEffect(() => {
    if (!errorMessage) return;
    showSaveToast("error", errorMessage);
  }, [errorMessage, showSaveToast]);

  useEffect(() => {
    if (!saveToast || saveToast.tone !== "success") return;

    const t = window.setTimeout(() => {
      setSaveToast((current) => (current?.id === saveToast.id ? null : current));
    }, 2800);

    return () => window.clearTimeout(t);
  }, [saveToast]);

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

  return (
    <div className="project-editor-shell bg-white">
      {saveToast ? (
        <div className="pointer-events-none fixed bottom-5 right-5 z-[90]">
          <div
            role={saveToast.tone === "error" ? "alert" : "status"}
            aria-live="polite"
            className={`flex max-w-[min(92vw,24rem)] items-center gap-2 border px-3 py-2 text-[11px] font-semibold shadow-[0_14px_40px_rgba(0,0,0,0.12)] backdrop-blur-sm ${
              saveToast.tone === "error"
                ? "border-red-200 bg-red-50/95 text-red-700"
                : saveToast.tone === "success"
                  ? "border-emerald-200 bg-emerald-50/95 text-emerald-700"
                  : "border-black/10 bg-white/96 text-black/72"
            }`}
          >
            <span
              aria-hidden="true"
              className={`h-2 w-2 rounded-full ${
                saveToast.tone === "error"
                  ? "bg-red-500"
                  : saveToast.tone === "success"
                    ? "bg-emerald-500"
                    : "bg-black/40"
              }`}
            />
            <span>{saveToast.message}</span>
          </div>
        </div>
      ) : null}

      {/* Sticky top bar - within pane scroller */}
      {!hideTopBar && (
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-black/8 bg-white/92 px-5 py-3 backdrop-blur-md">
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
            onMarkerOffsetChange={(markerOffset) =>
              patchProject("markerOffset", markerOffset)
            }
            onLocationLabelChange={(label) => patchProject("locationLabel", label)}
            onSlugChange={(slug) => {
              setSlugTouched(true);
              patchProject("slug", slugify(slug));
            }}
            disabled={writesDisabled}
          />

          {/* Title - styled input that looks like a heading */}
          <input
            value={project.title}
            onChange={handleTitleChange}
            placeholder="Untitled"
            disabled={writesDisabled}
            className="mt-5 w-full border-0 bg-transparent font-serif text-[clamp(2.75rem,5vw,4.4rem)] leading-[0.98] text-black outline-none placeholder:text-black/20"
          />

          {/* Summary - styled textarea that looks like a paragraph */}
          <textarea
            value={project.summary}
            onChange={(e) => patchProject("summary", e.target.value)}
            placeholder="Write a short summary..."
            disabled={writesDisabled}
            rows={2}
            className="mt-4 w-full resize-none border-0 bg-transparent text-[1.02rem] leading-8 text-black/68 outline-none placeholder:text-black/28"
          />

          {/* Divider */}
          <div className="my-8 h-px bg-black/8" />

          {/* BlockNote body - flows naturally, no box */}
          <BlockNoteDocument
            body={body}
            editable={!writesDisabled}
            uploadFile={uploadAsset}
            onChange={setBody}
            className="project-body project-editor-body min-h-[420px]"
            resetKey={currentSlug ?? "new-project"}
          />

          {/* Divider */}
          <div className="my-8 h-px bg-black/8" />

          {/* Tags */}
          <TagEditor
            tags={project.tags}
            onChange={(tags) => patchProject("tags", tags)}
            disabled={writesDisabled}
          />

          {/* Divider */}
          <div className="my-8 h-px bg-black/8" />

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
