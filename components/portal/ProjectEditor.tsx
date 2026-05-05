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
import AutoGrowTextarea from "@/components/portal/AutoGrowTextarea";
import CardCropOverlay from "@/components/portal/CardCropOverlay";
import ContributorsForm from "@/components/portal/ContributorsForm";
import CoverImageUpload from "@/components/portal/CoverImageUpload";
import MetaRow from "@/components/portal/MetaRow";
import SaveStatusModal from "@/components/portal/SaveStatusModal";
import SettingsPanel from "@/components/portal/SettingsPanel";
import TagEditor from "@/components/portal/TagEditor";
import type { CropBox, ProjectDocument, University } from "@/types";

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
  openSettings: () => void;
  appendGalleryItems: (items: ProjectDocument["gallery"]) => void;
  setGalleryItems: (items: ProjectDocument["gallery"]) => void;
  setMarkerOffset: (markerOffset: ProjectDocument["markerOffset"]) => void;
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

function isSlugCustomized(slug: string, title: string) {
  const normalizedSlug = slugify(slug);
  const autoSlug = slugify(title);

  if (!normalizedSlug) {
    return false;
  }

  if (!autoSlug) {
    return true;
  }

  return normalizedSlug !== autoSlug;
}

const SAVE_FEEDBACK_FLASH_KEY = "project-editor-save-feedback";
const SAVE_FEEDBACK_FLASH_TTL_MS = 5000;

interface ProjectEditorProps {
  mode: "create" | "edit";
  initialProject: ProjectDocument;
  currentSlug?: string;
  universities: University[];
  parentWorld?: {
    id: string;
    slug: string;
    title: string;
  } | null;
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
  parentWorld = null,
  writesDisabled = false,
  hideTopBar = false,
  onBack,
  onSavingStateChange,
  onDocumentChange,
  onDirtyStateChange,
  onSaveSuccess,
}, ref) {
  const router = useRouter();
  const [project, setProject] = useState<ProjectDocument>({
    ...initialProject,
    worldId: initialProject.worldId || parentWorld?.id || "",
  });
  const [body, setBody] = useState(initialProject.body);
  const [slugCustomized, setSlugCustomized] = useState(() =>
    isSlugCustomized(initialProject.slug, initialProject.title)
  );
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [savingMode, setSavingMode] = useState<SaveMode | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cropStep, setCropStep] = useState<"cover" | "thumbnail" | null>(null);
  const [originalCoverUrl, setOriginalCoverUrl] = useState<string>(
    initialProject.coverImageUrl
  );
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
  const uploadBodyAsset = useCallback(
    (file: File) => uploadAsset(file, "projects/body"),
    []
  );
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
  const setMarkerOffset = useCallback(
    (markerOffset: ProjectDocument["markerOffset"]) => {
      setProject((current) => ({
        ...current,
        markerOffset,
      }));
    },
    []
  );

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
        setSlugCustomized(
          isSlugCustomized(
            payload.slug ?? requestBody.slug,
            requestBody.title
          )
        );
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

        const destination = parentWorld
          ? `/?view=projects&edit=1&world=${encodeURIComponent(parentWorld.slug)}&project=${payload.slug}`
          : `/?view=projects&edit=1&project=${payload.slug}`;
        router.replace(destination);
        router.refresh();
      } catch {
        setErrorMessage("Project save failed. Please try again.");
      } finally {
        setSavingMode(null);
      }
    },
    [currentDocument, currentSlug, mode, onSaveSuccess, parentWorld, router, writesDisabled]
  );

  useImperativeHandle(ref, () => ({
    saveDraft: () => void persistProject("draft"),
    publish: () => void persistProject("publish"),
    openSettings: () => setSettingsOpen(true),
    appendGalleryItems,
    setGalleryItems,
    setMarkerOffset,
    savingMode,
  }), [appendGalleryItems, persistProject, savingMode, setGalleryItems, setMarkerOffset]);

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
    const nextAutoSlug = slugify(nextTitle);

    setProject((current) => ({
      ...current,
      title: nextTitle,
      slug: slugCustomized ? current.slug : nextAutoSlug,
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
      setOriginalCoverUrl(url);
      setCropStep("cover");
    } else {
      patchProject("cardImageUrl", "");
      setOriginalCoverUrl("");
      setCropStep(null);
    }
  }

  function handleCoverCropConfirm(crop: CropBox) {
    patchProject("coverCrop", crop);
    setCropStep("thumbnail");
  }

  function handleCoverCropSkip() {
    patchProject("coverCrop", null);
    setCropStep("thumbnail");
  }

  function handleThumbnailCropConfirm(crop: CropBox) {
    setProject((current) => ({
      ...current,
      cardImageUrl: originalCoverUrl || current.coverImageUrl,
      cardCrop: crop,
    }));
    setCropStep(null);
  }

  function handleThumbnailCropSkip() {
    setProject((current) => ({
      ...current,
      cardImageUrl: originalCoverUrl || current.coverImageUrl,
      cardCrop: current.coverCrop ?? null,
    }));
    setCropStep(null);
  }

  return (
    <div className="project-editor-shell bg-white">
      {saveToast ? (
        <SaveStatusModal
          tone={saveToast.tone}
          message={saveToast.message}
          onDismiss={() => setSaveToast(null)}
        />
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
              disabled={writesDisabled}
              onClick={() => setSettingsOpen(true)}
              className="rounded-md border border-black/15 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-black/60 transition hover:border-black/30 hover:text-black disabled:opacity-40"
            >
              Project Settings
            </button>
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
        uploadPrefix="projects/cover"
        crop={project.coverCrop}
      />

      {/* Crop overlay — step 1: page cover (free aspect) */}
      {cropStep === "cover" && originalCoverUrl ? (
        <CardCropOverlay
          coverImageUrl={originalCoverUrl}
          title="Crop for the page cover"
          subtitle="Pick the area shown as the large cover at the top of the project page. Choose any aspect — animated GIFs are preserved. Click 'Use full image' to skip."
          confirmLabel="Save cover"
          skipLabel="Use full image"
          onCrop={handleCoverCropConfirm}
          onCancel={handleCoverCropSkip}
          disabled={writesDisabled}
        />
      ) : null}

      {/* Crop overlay — step 2: card thumbnail (locked 16:9) */}
      {cropStep === "thumbnail" && originalCoverUrl ? (
        <CardCropOverlay
          coverImageUrl={originalCoverUrl}
          title="Crop for the card thumbnail"
          subtitle="The thumbnail aspect is locked to 16:9 so all cards line up in lists. Drag and resize the box to pick the area shown."
          confirmLabel="Save thumbnail"
          skipLabel="Same as cover"
          lockedAspect={16 / 9}
          onCrop={handleThumbnailCropConfirm}
          onCancel={handleThumbnailCropSkip}
          disabled={writesDisabled}
        />
      ) : null}

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
              const nextSlug = slugify(slug);
              setSlugCustomized(isSlugCustomized(nextSlug, project.title));
              patchProject("slug", nextSlug);
            }}
            open={settingsOpen}
            onOpenChange={setSettingsOpen}
            disabled={writesDisabled}
          >
            <SettingsPanel
              project={project}
              onPatch={(key, value) => patchProject(key, value)}
              disabled={writesDisabled}
              embedded
            />
          </MetaRow>

          {/* Title - styled input that looks like a heading */}
          <input
            value={project.title}
            onChange={handleTitleChange}
            placeholder="Untitled"
            disabled={writesDisabled}
            className="mt-5 w-full border-0 bg-transparent font-serif text-[clamp(2.75rem,5vw,4.4rem)] leading-[0.98] text-black outline-none placeholder:text-black/20"
          />

          {parentWorld ? (
            <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-black/45">
              Inside World: {parentWorld.title}
            </p>
          ) : null}

          {/* Summary - styled textarea that looks like a paragraph */}
          <AutoGrowTextarea
            value={project.summary}
            onChange={(value) => patchProject("summary", value)}
            placeholder="Write a short summary..."
            disabled={writesDisabled}
            minRows={2}
            className="mt-4 w-full resize-none overflow-hidden border-0 bg-transparent text-[1.02rem] leading-8 text-black/68 outline-none placeholder:text-black/28"
          />

          {/* Divider */}
          <div className="my-8 h-px bg-black/8" />

          {/* Faculty + students */}
          <ContributorsForm
            facultySubmitters={project.facultySubmitters}
            students={project.students}
            onFacultyChange={(facultySubmitters) =>
              patchProject("facultySubmitters", facultySubmitters)
            }
            onStudentsChange={(students) => patchProject("students", students)}
            disabled={writesDisabled}
          />

          {/* Divider */}
          <div className="my-8 h-px bg-black/8" />

          {/* BlockNote body - flows naturally, no box */}
          <BlockNoteDocument
            body={body}
            editable={!writesDisabled}
            uploadFile={uploadBodyAsset}
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

      </div>
    </div>
  );
});

export default ProjectEditor;
