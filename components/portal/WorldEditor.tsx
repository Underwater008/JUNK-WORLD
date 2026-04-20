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
import { useRouter } from "next/navigation";
import { PORTAL_READ_ONLY_MESSAGE } from "@/lib/portal/mode";
import { slugify } from "@/lib/utils";
import CardCropOverlay from "@/components/portal/CardCropOverlay";
import CoverImageUpload from "@/components/portal/CoverImageUpload";
import MetaRow from "@/components/portal/MetaRow";
import type { University, WorldDocument } from "@/types";

type SaveMode = "draft" | "publish";

export interface WorldEditorHandle {
  saveDraft: () => void;
  publish: () => void;
  openSettings: () => void;
  setGalleryItems: (items: WorldDocument["gallery"]) => void;
  setMarkerOffset: (markerOffset: WorldDocument["markerOffset"]) => void;
  savingMode: "draft" | "publish" | null;
}

type WorldSaveSuccess = {
  slug: string;
  mode: SaveMode;
  document: WorldDocument;
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

const SAVE_FEEDBACK_FLASH_KEY = "world-editor-save-feedback";
const SAVE_FEEDBACK_FLASH_TTL_MS = 5000;

interface WorldEditorProps {
  mode: "create" | "edit";
  initialWorld: WorldDocument;
  currentSlug?: string;
  universities: University[];
  writesDisabled?: boolean;
  hideTopBar?: boolean;
  onBack?: () => void;
  onSavingStateChange?: (mode: "draft" | "publish" | null) => void;
  onDocumentChange?: (document: WorldDocument) => void;
  onDirtyStateChange?: (dirty: boolean) => void;
  onSaveSuccess?: (result: WorldSaveSuccess) => void;
}

function serializeWorldDocument(document: WorldDocument) {
  return JSON.stringify(document);
}

const WorldEditor = forwardRef<WorldEditorHandle, WorldEditorProps>(function WorldEditor({
  mode,
  initialWorld,
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
  const [world, setWorld] = useState<WorldDocument>(initialWorld);
  const [slugCustomized, setSlugCustomized] = useState(() =>
    isSlugCustomized(initialWorld.slug, initialWorld.title)
  );
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [savingMode, setSavingMode] = useState<SaveMode | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showCropOverlay, setShowCropOverlay] = useState(false);
  const [saveToast, setSaveToast] = useState<SaveToast | null>(null);
  const [baselineSnapshot, setBaselineSnapshot] = useState(() =>
    serializeWorldDocument(initialWorld)
  );
  const saveToastIdRef = useRef(0);
  const isEditMode = mode === "edit";
  const currentDocumentSnapshot = useMemo(
    () => serializeWorldDocument(world),
    [world]
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

  const setGalleryItems = useCallback((items: WorldDocument["gallery"]) => {
    setWorld((current) => ({
      ...current,
      gallery: items,
    }));
  }, []);

  const setMarkerOffset = useCallback(
    (markerOffset: WorldDocument["markerOffset"]) => {
      setWorld((current) => ({
        ...current,
        markerOffset,
      }));
    },
    []
  );

  const persistWorld = useCallback(
    async (nextMode: SaveMode) => {
      if (writesDisabled) {
        setErrorMessage(PORTAL_READ_ONLY_MESSAGE);
        setStatusMessage("");
        return;
      }

      setSavingMode(nextMode);
      setStatusMessage("");
      setErrorMessage("");

      try {
        const initialResponse =
          mode === "create"
            ? await fetch("/api/portal/worlds", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(world),
              })
            : await fetch(
                nextMode === "publish"
                  ? `/api/portal/worlds/${currentSlug}/publish`
                  : `/api/portal/worlds/${currentSlug}`,
                {
                  method: nextMode === "publish" ? "POST" : "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(world),
                }
              );

        const initialPayload = (await initialResponse.json()) as {
          slug?: string;
          error?: string;
        };

        if (!initialResponse.ok || !initialPayload.slug) {
          setErrorMessage(initialPayload.error ?? "World save failed.");
          return;
        }

        const response =
          mode === "create" && nextMode === "publish"
            ? await fetch(`/api/portal/worlds/${initialPayload.slug}/publish`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  ...world,
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
              });

        if (!response.ok || !payload.slug) {
          setErrorMessage(payload.error ?? "World save failed.");
          return;
        }

        const savedDocument = {
          ...world,
          slug: payload.slug,
        };

        setWorld((current) => ({
          ...current,
          slug: payload.slug ?? current.slug,
        }));
        setSlugCustomized(
          isSlugCustomized(payload.slug ?? world.slug, world.title)
        );
        setBaselineSnapshot(serializeWorldDocument(savedDocument));
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

        const destination = `/?view=projects&edit=1&world=${payload.slug}`;
        router.replace(destination);
        router.refresh();
      } catch {
        setErrorMessage("World save failed. Please try again.");
      } finally {
        setSavingMode(null);
      }
    },
    [currentSlug, mode, onSaveSuccess, router, world, writesDisabled]
  );

  useImperativeHandle(
    ref,
    () => ({
      saveDraft: () => void persistWorld("draft"),
      publish: () => void persistWorld("publish"),
      openSettings: () => setSettingsOpen(true),
      setGalleryItems,
      setMarkerOffset,
      savingMode,
    }),
    [persistWorld, savingMode, setGalleryItems, setMarkerOffset]
  );

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
    onDocumentChange(world);
  }, [currentDocumentSnapshot, onDocumentChange, world]);

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

  useEffect(() => {
    if (!statusMessage) return;
    const timeoutId = window.setTimeout(() => setStatusMessage(""), 3000);
    return () => window.clearTimeout(timeoutId);
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

    const timeoutId = window.setTimeout(() => {
      setSaveToast((current) => (current?.id === saveToast.id ? null : current));
    }, 2800);

    return () => window.clearTimeout(timeoutId);
  }, [saveToast]);

  function patchWorld<K extends keyof WorldDocument>(
    key: K,
    value: WorldDocument[K]
  ) {
    setWorld((current) => ({ ...current, [key]: value }));
  }

  function handleTitleChange(event: ChangeEvent<HTMLInputElement>) {
    const nextTitle = event.target.value;
    const nextAutoSlug = slugify(nextTitle);

    setWorld((current) => ({
      ...current,
      title: nextTitle,
      slug: slugCustomized ? current.slug : nextAutoSlug,
    }));
  }

  function handleUniversityChange(universityId: string) {
    const nextUniversity = universities.find((entry) => entry.id === universityId) ?? null;
    setWorld((current) => {
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
    patchWorld("coverImageUrl", url);
    if (url) {
      setShowCropOverlay(true);
    } else {
      patchWorld("cardImageUrl", "");
      setShowCropOverlay(false);
    }
  }

  function handleCropConfirm(cardUrl: string) {
    patchWorld("cardImageUrl", cardUrl);
    setShowCropOverlay(false);
  }

  function handleCropSkip() {
    patchWorld("cardImageUrl", world.coverImageUrl);
    setShowCropOverlay(false);
  }

  return (
    <div className="bg-white">
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
              {isEditMode ? "Editing" : "New world"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={writesDisabled}
              onClick={() => setSettingsOpen(true)}
              className="rounded-md border border-black/15 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-black/60 transition hover:border-black/30 hover:text-black disabled:opacity-40"
            >
              World Settings
            </button>
            <button
              type="button"
              disabled={savingMode !== null || writesDisabled}
              onClick={() => void persistWorld("draft")}
              className="rounded-md border border-black/15 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-black/60 transition hover:border-black/30 hover:text-black disabled:opacity-40"
            >
              {savingMode === "draft" ? "Saving..." : "Save Draft"}
            </button>
            <button
              type="button"
              disabled={savingMode !== null || writesDisabled}
              onClick={() => void persistWorld("publish")}
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

      <CoverImageUpload
        imageUrl={world.coverImageUrl}
        onImageChange={handleCoverChange}
        disabled={writesDisabled}
        uploadPrefix="worlds/cover"
      />

      {showCropOverlay && world.coverImageUrl ? (
        <CardCropOverlay
          coverImageUrl={world.coverImageUrl}
          onCrop={handleCropConfirm}
          onCancel={handleCropSkip}
          disabled={writesDisabled}
          uploadPrefix="worlds/card"
        />
      ) : null}

      <div className="mx-auto max-w-3xl px-6 py-8">
        <MetaRow
          slug={world.slug}
          universityId={world.universityId}
          year={world.year}
          markerOffset={world.markerOffset}
          locationLabel={world.locationLabel}
          universities={universities}
          onUniversityChange={handleUniversityChange}
          onYearChange={(year) => patchWorld("year", year)}
          onMarkerOffsetChange={(markerOffset) => patchWorld("markerOffset", markerOffset)}
          onLocationLabelChange={(label) => patchWorld("locationLabel", label)}
          onSlugChange={(slug) => {
            const nextSlug = slugify(slug);
            setSlugCustomized(isSlugCustomized(nextSlug, world.title));
            patchWorld("slug", nextSlug);
          }}
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          disabled={writesDisabled}
          entityLabel="World"
          showParticipants={false}
        />

        <input
          value={world.title}
          onChange={handleTitleChange}
          placeholder="Untitled world"
          disabled={writesDisabled}
          className="mt-5 w-full border-0 bg-transparent font-serif text-[clamp(2.75rem,5vw,4.4rem)] leading-[0.98] text-black outline-none placeholder:text-black/20"
        />

        <textarea
          value={world.summary}
          onChange={(event) => patchWorld("summary", event.target.value)}
          placeholder="Write a short world summary..."
          disabled={writesDisabled}
          rows={4}
          className="mt-4 w-full resize-none border-0 bg-transparent text-[1.02rem] leading-8 text-black/68 outline-none placeholder:text-black/28"
        />
      </div>
    </div>
  );
});

export default WorldEditor;
