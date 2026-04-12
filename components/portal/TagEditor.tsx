"use client";

import { useState, KeyboardEvent } from "react";

interface TagEditorProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
}

export default function TagEditor({ tags, onChange, disabled = false }: TagEditorProps) {
  const [inputValue, setInputValue] = useState("");
  const [showInput, setShowInput] = useState(false);

  function addTags(raw: string) {
    const newTags = raw
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t && !tags.includes(t));
    if (newTags.length) {
      onChange([...tags, ...newTags]);
    }
    setInputValue("");
    setShowInput(false);
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      if (inputValue.trim()) addTags(inputValue);
    }
    if (event.key === "Escape") {
      setInputValue("");
      setShowInput(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-full bg-black/5 px-3 py-1 text-[11px] font-medium text-black/60"
        >
          {tag}
          {!disabled && (
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="ml-0.5 text-black/30 transition hover:text-black/60"
            >
              ×
            </button>
          )}
        </span>
      ))}
      {!disabled && (
        showInput ? (
          <input
            autoFocus
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (inputValue.trim()) addTags(inputValue);
              else setShowInput(false);
            }}
            placeholder="Tag name"
            className="w-24 rounded-full bg-transparent px-2 py-1 text-[11px] text-black/60 outline-none placeholder:text-black/25"
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowInput(true)}
            className="rounded-full px-2.5 py-1 text-[11px] font-medium text-black/25 transition hover:bg-black/5 hover:text-black/50"
          >
            + Add tag
          </button>
        )
      )}
    </div>
  );
}
