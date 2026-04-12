"use client";

import "@blocknote/core/fonts/inter.css";

import { filterSuggestionItems } from "@blocknote/core/extensions";
import { BlockNoteView } from "@blocknote/shadcn";
import type { PartialBlock } from "@blocknote/core";
import {
  getDefaultReactSlashMenuItems,
  SuggestionMenuController,
  useBlockNoteEditor,
  useCreateBlockNote,
  useOnUploadEnd,
} from "@blocknote/react";
import type { ProjectBody } from "@/types";
import ProjectSlashMenu from "@/components/projects/ProjectSlashMenu";

interface BlockNoteDocumentProps {
  body: ProjectBody;
  editable?: boolean;
  onChange?: (body: ProjectBody) => void;
  uploadFile?: (file: File) => Promise<string>;
  className?: string;
  resetKey?: string;
}

const PROJECT_SLASH_MENU_KEYS = new Set([
  "paragraph",
  "heading",
  "heading_2",
  "heading_3",
  "bullet_list",
  "numbered_list",
  "check_list",
  "quote",
  "divider",
  "image",
]);

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
  const editor = useCreateBlockNote(
    {
      initialContent: body as PartialBlock[],
      uploadFile,
    },
    [resetKey]
  );

  return (
    <BlockNoteView
      editor={editor}
      editable={editable}
      className={className}
      slashMenu={false}
      onChange={onChange ? (instance) => onChange(instance.document as ProjectBody) : undefined}
    >
      {editable ? (
        <>
          <SuggestionMenuController
            triggerCharacter="/"
            suggestionMenuComponent={ProjectSlashMenu}
            getItems={async (query) =>
              filterSuggestionItems(
                getDefaultReactSlashMenuItems(editor)
                  .filter((item) =>
                    PROJECT_SLASH_MENU_KEYS.has(
                      ((item as { key?: string }).key ?? "").toLowerCase()
                    )
                  ),
                query
              )
            }
          />
          <UploadWidthClamp />
        </>
      ) : null}
    </BlockNoteView>
  );
}
