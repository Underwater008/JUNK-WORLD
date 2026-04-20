"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ProjectCredit, ProjectDocument } from "@/types";

interface SettingsPanelProps {
  project: ProjectDocument;
  onPatch: <K extends keyof ProjectDocument>(key: K, value: ProjectDocument[K]) => void;
  disabled?: boolean;
  embedded?: boolean;
}

function NamesHeader({
  onAdd,
  disabled = false,
}: {
  onAdd: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/50">
        Credits
      </h4>
      <button
        type="button"
        onClick={onAdd}
        disabled={disabled}
        className="rounded-md px-2 py-1 text-[10px] font-medium text-black/35 transition hover:bg-black/5 hover:text-black/60 disabled:cursor-not-allowed disabled:opacity-40"
      >
        + Add name
      </button>
    </div>
  );
}

export default function SettingsPanel({
  project,
  onPatch,
  disabled = false,
  embedded = false,
}: SettingsPanelProps) {
  const [open, setOpen] = useState(false);

  function updateCredit(index: number, value: ProjectCredit) {
    onPatch(
      "credits",
      project.credits.map((item, i) => (i === index ? value : item))
    );
  }

  const inputClass =
    "w-full rounded-md border border-black/10 px-3 py-2 text-sm text-black outline-none focus:border-black/30";

  const content = (
    <div className="space-y-6">
      <div>
        <NamesHeader
          onAdd={() =>
            onPatch("credits", [
              ...project.credits,
              { label: "Credits", value: "" },
            ])
          }
          disabled={disabled}
        />
        {project.credits.length ? (
          <div className="space-y-2">
            {project.credits.map((item, index) => (
              <div
                key={`credit-${index}`}
                className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"
              >
                <textarea
                  value={item.value}
                  onChange={(e) =>
                    updateCredit(index, {
                      label: "Credits",
                      value: e.target.value,
                    })
                  }
                  rows={2}
                  className={`${inputClass} resize-y leading-6`}
                  placeholder="Name or names"
                  disabled={disabled}
                />
                <button
                  type="button"
                  onClick={() =>
                    onPatch("credits", project.credits.filter((_, i) => i !== index))
                  }
                  className="shrink-0 rounded-md px-2 text-[10px] text-black/30 transition hover:bg-black/5 hover:text-black/60"
                  disabled={disabled}
                >
                  ×
                </button>
                <p className="text-[11px] leading-5 text-black/35 sm:col-start-1">
                  Use one name, comma-separated names, or line breaks for multiple people.
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm leading-6 text-black/45">
            No credit names added yet.
          </p>
        )}
      </div>
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="border-t border-black/8">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-1 py-4 text-left"
      >
        <motion.svg
          animate={{ rotate: open ? 90 : 0 }}
          transition={{ duration: 0.15 }}
          width="12"
          height="12"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className="text-black/25"
        >
          <path d="M6 4L10 8L6 12" />
        </motion.svg>
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/35">
            Optional details
          </span>
          <p className="mt-1 text-xs text-black/35">
            Card image, collaborators, credits, and links.
          </p>
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="pb-6">
              {content}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
