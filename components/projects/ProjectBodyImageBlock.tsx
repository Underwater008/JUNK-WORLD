"use client";

import {
  BlockNoteSchema,
  type BlockNoteEditor,
  createImageBlockConfig,
  defaultBlockSpecs,
  imageParse,
} from "@blocknote/core";
import {
  createReactBlockSpec,
  ImageToExternalHTML,
  ResizableFileBlockWrapper,
  useResolveUrl,
  type ReactCustomBlockRenderProps,
} from "@blocknote/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type UploadState = "idle" | "uploading" | "error";

type ProjectBodyImageBlockProps =
  ReactCustomBlockRenderProps<typeof createImageBlockConfig>;

interface ProjectBodyImageUploadCardProps {
  cardPreviewUrl: string | null;
  errorMessage: string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  helper: string;
  isDragging: boolean;
  isEditable: boolean;
  isReplacing: boolean;
  onDragEnter: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenPicker: () => void;
  onRetry: () => void;
  onSecondaryAction: () => void;
  pendingFile: File | null;
  secondaryLabel: string;
  title: string;
  uploadState: UploadState;
}

function ProjectBodyImageUploadCard({
  cardPreviewUrl,
  errorMessage,
  fileInputRef,
  helper,
  isDragging,
  isEditable,
  isReplacing,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  onFileChange,
  onOpenPicker,
  onRetry,
  onSecondaryAction,
  pendingFile,
  secondaryLabel,
  title,
  uploadState,
}: ProjectBodyImageUploadCardProps) {
  const handleActionMouseDown = (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div
      className="project-body-image-card"
      data-dragging={isDragging || undefined}
      data-has-preview={cardPreviewUrl ? true : undefined}
      data-upload-state={uploadState}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {cardPreviewUrl ? (
        <img
          src={cardPreviewUrl}
          alt=""
          className="project-body-image-card__preview"
          draggable={false}
        />
      ) : null}
      <div className="project-body-image-card__veil" />
      <div className="project-body-image-card__content">
        <p className="project-body-image-card__eyebrow">
          {uploadState === "uploading"
            ? "Uploading image"
            : isReplacing
              ? "Replace image"
              : "Inline image"}
        </p>
        <h3 className="project-body-image-card__title">{title}</h3>
        <p className="project-body-image-card__helper">
          {uploadState === "error" ? errorMessage : helper}
        </p>
        <div className="project-body-image-card__actions">
          <button
            type="button"
            onMouseDown={handleActionMouseDown}
            onClick={onOpenPicker}
            disabled={!isEditable || uploadState === "uploading"}
            className="project-body-image-button"
          >
            {uploadState === "uploading" ? "Uploading..." : "Choose image"}
          </button>
          {uploadState === "error" && pendingFile ? (
            <button
              type="button"
              onMouseDown={handleActionMouseDown}
              onClick={onRetry}
              className="project-body-image-button project-body-image-button--ghost"
            >
              Retry
            </button>
          ) : null}
          <button
            type="button"
            onMouseDown={handleActionMouseDown}
            onClick={onSecondaryAction}
            disabled={uploadState === "uploading"}
            className="project-body-image-button project-body-image-button--ghost"
          >
            {secondaryLabel}
          </button>
        </div>
        <p className="project-body-image-card__meta">
          Drag and drop or choose a file. JPG, PNG, WEBP, or GIF.
        </p>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={onFileChange}
      />
    </div>
  );
}

function normalizeUploadResult(
  file: File,
  result: Awaited<ReturnType<NonNullable<ProjectBodyImageBlockProps["editor"]["uploadFile"]>>>,
  previewWidth: number | undefined
) {
  if (typeof result === "string") {
    return {
      props: {
        name: file.name,
        url: result,
        previewWidth,
        showPreview: true,
      },
    };
  }

  return {
    ...result,
    props: {
      name: file.name,
      previewWidth,
      showPreview: true,
      ...(result.props ?? {}),
    },
  };
}

function ProjectBodyImageBlock({
  block,
  editor,
}: ProjectBodyImageBlockProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);
  const resolved = useResolveUrl(block.props.url || "data:,");
  const currentImageUrl =
    resolved.loadingState === "loading" ? block.props.url : resolved.downloadUrl;
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [isDragging, setIsDragging] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);

  const isEditable = editor.isEditable;
  const hasUploadedImage = Boolean(block.props.url);
  const cardPreviewUrl = useMemo(() => {
    if (localPreviewUrl) return localPreviewUrl;
    if (isReplacing && currentImageUrl) return currentImageUrl;
    return null;
  }, [currentImageUrl, isReplacing, localPreviewUrl]);

  useEffect(() => {
    return () => {
      if (localPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(localPreviewUrl);
      }
    };
  }, [localPreviewUrl]);

  const clearLocalPreview = useCallback(() => {
    setLocalPreviewUrl((current) => {
      if (current?.startsWith("blob:")) {
        URL.revokeObjectURL(current);
      }
      return null;
    });
  }, []);

  const resetTransientState = useCallback(() => {
    dragDepthRef.current = 0;
    setIsDragging(false);
    setUploadState("idle");
    setErrorMessage("");
    setPendingFile(null);
    clearLocalPreview();
  }, [clearLocalPreview]);

  const convertBlockToParagraph = useCallback(() => {
    const documentEditor = editor as unknown as BlockNoteEditor;
    const { insertedBlocks } = documentEditor.replaceBlocks([block], [
      {
        type: "paragraph",
        content: [],
      },
    ]);
    const [updatedBlock] = insertedBlocks;

    requestAnimationFrame(() => {
      if (!updatedBlock) return;
      documentEditor.setTextCursorPosition(updatedBlock, "start");
      documentEditor.focus();
    });
  }, [block, editor]);

  const cancelInlineFlow = useCallback(() => {
    resetTransientState();

    if (hasUploadedImage) {
      setIsReplacing(false);
      return;
    }

    convertBlockToParagraph();
  }, [convertBlockToParagraph, hasUploadedImage, resetTransientState]);

  const openPicker = useCallback(() => {
    if (!isEditable || uploadState === "uploading") return;
    fileInputRef.current?.click();
  }, [isEditable, uploadState]);

  const uploadSelectedFile = useCallback(
    async (file: File) => {
      if (!isEditable || uploadState === "uploading") return;

      if (!file.type.startsWith("image/")) {
        setUploadState("error");
        setErrorMessage("Choose an image file.");
        return;
      }

      if (!editor.uploadFile) {
        setUploadState("error");
        setErrorMessage("Image uploads are not configured.");
        return;
      }

      const nextPreviewUrl = URL.createObjectURL(file);
      setPendingFile(file);
      setUploadState("uploading");
      setErrorMessage("");
      setIsReplacing(hasUploadedImage);
      setLocalPreviewUrl((current) => {
        if (current?.startsWith("blob:")) {
          URL.revokeObjectURL(current);
        }
        return nextPreviewUrl;
      });

      try {
        const result = await editor.uploadFile(file, block.id);
        setUploadState("idle");
        setIsReplacing(false);
        setErrorMessage("");
        setPendingFile(null);
        clearLocalPreview();
        editor.updateBlock(
          block,
          normalizeUploadResult(file, result, block.props.previewWidth)
        );
      } catch (error) {
        setUploadState("error");
        setErrorMessage(
          error instanceof Error ? error.message : "Image upload failed."
        );
      }
    },
    [
      block,
      clearLocalPreview,
      editor,
      hasUploadedImage,
      isEditable,
      uploadState,
    ]
  );

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      void uploadSelectedFile(file);
    },
    [uploadSelectedFile]
  );

  const handleRetry = useCallback(() => {
    if (!pendingFile) return;
    void uploadSelectedFile(pendingFile);
  }, [pendingFile, uploadSelectedFile]);

  const handleDragEnter = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (!isEditable || uploadState === "uploading") return;
      dragDepthRef.current += 1;
      setIsDragging(true);
    },
    [isEditable, uploadState]
  );

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (!isEditable || uploadState === "uploading") return;
      event.dataTransfer.dropEffect = "copy";
      setIsDragging(true);
    },
    [isEditable, uploadState]
  );

  const handleDragLeave = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (!isEditable || uploadState === "uploading") return;
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
      if (dragDepthRef.current === 0) {
        setIsDragging(false);
      }
    },
    [isEditable, uploadState]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      dragDepthRef.current = 0;
      setIsDragging(false);

      if (!isEditable || uploadState === "uploading") return;

      const file = event.dataTransfer.files?.[0];
      if (!file) return;
      void uploadSelectedFile(file);
    },
    [isEditable, uploadState, uploadSelectedFile]
  );

  if (!hasUploadedImage) {
    if (!isEditable) {
      return null;
    }

    return (
      <ProjectBodyImageUploadCard
        cardPreviewUrl={cardPreviewUrl}
        errorMessage={errorMessage}
        fileInputRef={fileInputRef}
        helper="Drop an image here or pick one from your device."
        isDragging={isDragging}
        isEditable={isEditable}
        isReplacing={isReplacing}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onFileChange={handleFileChange}
        onOpenPicker={openPicker}
        onRetry={handleRetry}
        onSecondaryAction={cancelInlineFlow}
        pendingFile={pendingFile}
        secondaryLabel="Remove block"
        title="Add an image"
        uploadState={uploadState}
      />
    );
  }

  if (isReplacing || uploadState !== "idle") {
    return (
      <ProjectBodyImageUploadCard
        cardPreviewUrl={cardPreviewUrl}
        errorMessage={errorMessage}
        fileInputRef={fileInputRef}
        helper="Drop a new image here or choose one from your device."
        isDragging={isDragging}
        isEditable={isEditable}
        isReplacing={isReplacing}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onFileChange={handleFileChange}
        onOpenPicker={openPicker}
        onRetry={handleRetry}
        onSecondaryAction={() => {
          resetTransientState();
          setIsReplacing(false);
        }}
        pendingFile={pendingFile}
        secondaryLabel="Keep current"
        title="Replace this image"
        uploadState={uploadState}
      />
    );
  }

  return (
    <ResizableFileBlockWrapper block={block as never} editor={editor as never}>
      <div className="project-body-image-frame">
        <img
          className="bn-visual-media project-body-image-frame__media"
          src={currentImageUrl}
          alt={block.props.caption || block.props.name || "Project image"}
          contentEditable={false}
          draggable={false}
        />
        {isEditable ? (
          <div className="project-body-image-frame__actions">
            <button
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onClick={() => {
                resetTransientState();
                setIsReplacing(true);
              }}
              className="project-body-image-button"
            >
              Replace
            </button>
            <button
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onClick={convertBlockToParagraph}
              className="project-body-image-button project-body-image-button--ghost"
            >
              Remove
            </button>
          </div>
        ) : null}
      </div>
    </ResizableFileBlockWrapper>
  );
}

const PROJECT_BODY_IMAGE_BLOCK = createReactBlockSpec(
  createImageBlockConfig,
  (config) => ({
    render: ProjectBodyImageBlock,
    parse: imageParse(config),
    toExternalHTML: ImageToExternalHTML,
  })
)();

export const PROJECT_BODY_EDITOR_SCHEMA = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    image: PROJECT_BODY_IMAGE_BLOCK,
  },
});
