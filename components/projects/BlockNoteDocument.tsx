"use client";

import "@blocknote/core/fonts/inter.css";

import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import type { PartialBlock } from "@blocknote/core";
import type { ProjectBody } from "@/types";

interface BlockNoteDocumentProps {
  body: ProjectBody;
  editable?: boolean;
  onChange?: (body: ProjectBody) => void;
  uploadFile?: (file: File) => Promise<string>;
  className?: string;
  resetKey?: string;
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
      onChange={onChange ? (instance) => onChange(instance.document as ProjectBody) : undefined}
    />
  );
}
