"use client";

import {
  BasicTextStyleButton,
  FileCaptionButton,
  FileDeleteButton,
  FileDownloadButton,
  FilePreviewButton,
  TableCellMergeButton,
  TextAlignButton,
  useBlockNoteEditor,
  useEditorState,
  useComponentsContext,
} from "@blocknote/react";
import { useCallback, useMemo, type MouseEvent, type ReactNode } from "react";
import {
  RiH1,
  RiH2,
  RiH3,
  RiListOrdered,
  RiListUnordered,
  RiLink,
  RiQuoteText,
  RiText,
} from "react-icons/ri";

type BlockButtonSpec = {
  icon: ReactNode;
  label: string;
  mainTooltip: string;
  props?: Record<string, boolean | number | string>;
  type:
    | "paragraph"
    | "heading"
    | "quote"
    | "bulletListItem"
    | "numberedListItem";
};

const BLOCK_BUTTONS: BlockButtonSpec[] = [
  {
    type: "paragraph",
    label: "Paragraph",
    mainTooltip: "Paragraph",
    icon: <RiText />,
  },
  {
    type: "heading",
    props: { level: 1, isToggleable: false },
    label: "H1",
    mainTooltip: "Heading 1",
    icon: <RiH1 />,
  },
  {
    type: "heading",
    props: { level: 2, isToggleable: false },
    label: "H2",
    mainTooltip: "Heading 2",
    icon: <RiH2 />,
  },
  {
    type: "heading",
    props: { level: 3, isToggleable: false },
    label: "H3",
    mainTooltip: "Heading 3",
    icon: <RiH3 />,
  },
  {
    type: "bulletListItem",
    label: "Bullets",
    mainTooltip: "Bullet list",
    icon: <RiListUnordered />,
  },
  {
    type: "numberedListItem",
    label: "Numbers",
    mainTooltip: "Numbered list",
    icon: <RiListOrdered />,
  },
  {
    type: "quote",
    label: "Quote",
    mainTooltip: "Quote",
    icon: <RiQuoteText />,
  },
];

function ToolbarActionButton({
  active = false,
  disabled = false,
  icon,
  label,
  onMouseDown,
}: {
  active?: boolean;
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onMouseDown: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      data-active={active || undefined}
      onMouseDown={onMouseDown}
      className="project-editor-toolbar__action"
    >
      {icon}
    </button>
  );
}

function ProjectBlockTypeButtons() {
  const editor = useBlockNoteEditor();

  const selectedBlocks = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) =>
      currentEditor.getSelection()?.blocks || [
        currentEditor.getTextCursorPosition().block,
      ],
  });

  const firstSelectedBlock = selectedBlocks[0];
  const selectedKey = useMemo(() => {
    if (!firstSelectedBlock) return "paragraph";
    if (firstSelectedBlock.type !== "heading") return firstSelectedBlock.type;

    const level =
      typeof firstSelectedBlock.props.level === "number"
        ? firstSelectedBlock.props.level
        : 1;

    return `heading-${level}`;
  }, [firstSelectedBlock]);

  const applyBlockType = useCallback(
    (event: MouseEvent<HTMLButtonElement>, spec: BlockButtonSpec) => {
      event.preventDefault();

      const blocks =
        editor.getSelection()?.blocks || [editor.getTextCursorPosition().block];

      if (!blocks.length) return;

      editor.focus();
      editor.transact(() => {
        for (const block of blocks) {
          editor.updateBlock(block, {
            type: spec.type,
            props: spec.props,
          });
        }
      });
    },
    [editor]
  );

  if (!editor.isEditable || !firstSelectedBlock) {
    return null;
  }

  return (
    <>
      {BLOCK_BUTTONS.map((spec) => {
        const key =
          spec.type === "heading"
            ? `heading-${spec.props?.level ?? 1}`
            : spec.type;

        return (
          <ToolbarActionButton
            key={key}
            icon={spec.icon}
            label={spec.label}
            onMouseDown={(event) => applyBlockType(event, spec)}
            active={selectedKey === key}
          />
        );
      })}
    </>
  );
}

function ProjectTextAlignButtons() {
  const editor = useBlockNoteEditor();

  if (!editor.isEditable) {
    return null;
  }

  return (
    <>
      <TextAlignButton textAlignment="left" />
      <TextAlignButton textAlignment="center" />
      <TextAlignButton textAlignment="right" />
    </>
  );
}

function normalizeLinkUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("/")
  ) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function ProjectCreateLinkButton() {
  const editor = useBlockNoteEditor();

  const linkState = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => ({
      selectedText: currentEditor.getSelectedText(),
      selectedUrl: currentEditor.getSelectedLinkUrl(),
    }),
  });

  const canCreateLink = Boolean(
    linkState.selectedUrl || linkState.selectedText.trim().length > 0
  );

  const handleCreateLink = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (!canCreateLink) return;

    const currentValue = editor.getSelectedLinkUrl() ?? "https://";
    const nextUrl = window.prompt("Enter link URL", currentValue);
    if (nextUrl === null) return;

    const normalizedUrl = normalizeLinkUrl(nextUrl);
    if (!normalizedUrl) return;

    editor.focus();
    editor.createLink(
      normalizedUrl,
      editor.getSelectedText().trim() || undefined
    );
  }, [canCreateLink, editor]);

  if (!editor.isEditable) {
    return null;
  }

  return (
    <ToolbarActionButton
      icon={<RiLink />}
      label="Link"
      onMouseDown={handleCreateLink}
      disabled={!canCreateLink}
    />
  );
}

export default function ProjectFormattingToolbar() {
  const Components = useComponentsContext()!;
  const preserveSelection = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
    },
    []
  );

  return (
    <div onMouseDownCapture={preserveSelection}>
      <Components.FormattingToolbar.Root
        className="bn-toolbar bn-formatting-toolbar project-editor-toolbar"
      >
        <ProjectBlockTypeButtons />
        <TableCellMergeButton />
        <FileCaptionButton />
        <FileDeleteButton />
        <FileDownloadButton />
        <FilePreviewButton />
        <BasicTextStyleButton basicTextStyle="bold" />
        <BasicTextStyleButton basicTextStyle="italic" />
        <BasicTextStyleButton basicTextStyle="underline" />
        <BasicTextStyleButton basicTextStyle="strike" />
        <ProjectTextAlignButtons />
        <ProjectCreateLinkButton />
      </Components.FormattingToolbar.Root>
    </div>
  );
}
