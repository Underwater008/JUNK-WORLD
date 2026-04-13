"use client";

import "@blocknote/core/fonts/inter.css";

import { BlockNoteView } from "@blocknote/shadcn";
import type { PartialBlock } from "@blocknote/core";
import {
  BlockNoteViewEditor,
  useBlockNoteEditor,
  useCreateBlockNote,
  useOnUploadEnd,
} from "@blocknote/react";
import type { ProjectBody } from "@/types";
import ProjectFormattingToolbar from "@/components/projects/ProjectFormattingToolbar";
import { PROJECT_BODY_EDITOR_SCHEMA } from "@/components/projects/ProjectBodyImageBlock";

interface BlockNoteDocumentProps {
  body: ProjectBody;
  editable?: boolean;
  onChange?: (body: ProjectBody) => void;
  uploadFile?: (file: File) => Promise<string>;
  className?: string;
  resetKey?: string;
}

function isBodyEffectivelyEmpty(body: ProjectBody) {
  if (body.length !== 1) return false;

  const [firstBlock] = body;
  if (!firstBlock || firstBlock.type !== "paragraph") return false;

  return !Array.isArray(firstBlock.content) || firstBlock.content.length === 0;
}

function UploadWidthClamp() {
  const editor = useBlockNoteEditor();

  useOnUploadEnd((blockId) => {
    if (!blockId) return;

    const block = editor.getBlock(blockId);
    if (!block) return;

    const blockType = String(block.type);
    if (!["image", "video", "file"].includes(blockType)) {
      return;
    }

    const props = (block.props ?? {}) as Record<string, unknown>;
    const currentWidth =
      typeof props.previewWidth === "number" ? props.previewWidth : undefined;
    const editorWidth = editor.domElement?.getBoundingClientRect().width ?? 720;
    const nextWidth = Math.max(
      280,
      Math.min(Math.floor(editorWidth * 0.58), 480)
    );

    if (!currentWidth || currentWidth > nextWidth) {
      editor.updateBlock(blockId, {
        props: {
          previewWidth: nextWidth,
        },
      });
    }
  });

  return null;
}

export default function BlockNoteDocument({
  body,
  editable = false,
  onChange,
  uploadFile,
  className,
  resetKey = "default",
}: BlockNoteDocumentProps) {
  const shouldAutoFocus = editable && isBodyEffectivelyEmpty(body);
  const editor = useCreateBlockNote(
    {
      initialContent: body as PartialBlock[],
      schema: PROJECT_BODY_EDITOR_SCHEMA,
      uploadFile,
      placeholders: {
        default: "",
        emptyDocument: "",
      },
    },
    [resetKey]
  );

  return (
    <BlockNoteView
      editor={editor}
      theme="light"
      editable={editable}
      autoFocus={shouldAutoFocus}
      formattingToolbar={false}
      linkToolbar={editable}
      className={className}
      sideMenu={false}
      filePanel={false}
      tableHandles={editable}
      emojiPicker={editable}
      slashMenu={false}
      renderEditor={false}
      onChange={onChange ? (instance) => onChange(instance.document as ProjectBody) : undefined}
    >
      {editable ? (
        <div className="project-editor-toolbar-shell">
          <ProjectFormattingToolbar />
        </div>
      ) : null}
      <BlockNoteViewEditor>
        {editable ? <UploadWidthClamp /> : null}
      </BlockNoteViewEditor>
    </BlockNoteView>
  );
}
