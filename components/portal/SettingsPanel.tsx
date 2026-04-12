"use client";

import { ChangeEvent, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { uploadAsset } from "@/lib/uploads";
import type {
  ProjectCollaborator,
  ProjectCredit,
  ProjectDocument,
  ProjectExternalLink,
} from "@/types";

interface SettingsPanelProps {
  project: ProjectDocument;
  onPatch: <K extends keyof ProjectDocument>(key: K, value: ProjectDocument[K]) => void;
  disabled?: boolean;
}

function SectionHeader({
  title,
  actionLabel,
  onAction,
  disabled = false,
}: {
  title: string;
  actionLabel: string;
  onAction: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/50">
        {title}
      </h4>
      <button
        type="button"
        onClick={onAction}
        disabled={disabled}
        className="rounded-md px-2 py-1 text-[10px] font-medium text-black/35 transition hover:bg-black/5 hover:text-black/60 disabled:cursor-not-allowed disabled:opacity-40"
      >
        + {actionLabel}
      </button>
    </div>
  );
}

export default function SettingsPanel({
  project,
  onPatch,
  disabled = false,
}: SettingsPanelProps) {
  const [open, setOpen] = useState(false);
  const [uploadingCardImage, setUploadingCardImage] = useState(false);

  async function handleCardImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || disabled) return;
    setUploadingCardImage(true);
    try {
      const url = await uploadAsset(file);
      onPatch("cardImageUrl", url);
    } catch {
      // error handled by parent
    } finally {
      setUploadingCardImage(false);
      event.target.value = "";
    }
  }

  function updateCollaborator(index: number, value: ProjectCollaborator) {
    onPatch(
      "collaborators",
      project.collaborators.map((item, i) => (i === index ? value : item))
    );
  }

  function updateCredit(index: number, value: ProjectCredit) {
    onPatch(
      "credits",
      project.credits.map((item, i) => (i === index ? value : item))
    );
  }

  function updateLink(index: number, value: ProjectExternalLink) {
    onPatch(
      "externalLinks",
      project.externalLinks.map((item, i) => (i === index ? value : item))
    );
  }

  const inputClass =
    "w-full rounded-md border border-black/10 px-3 py-2 text-sm text-black outline-none focus:border-black/30";
  const chipButtonClass =
    "rounded-full border border-black/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-black/45 transition hover:border-black/20 hover:bg-black/[0.03] hover:text-black disabled:cursor-not-allowed disabled:opacity-40";
  const hasStructuredDetails =
    project.collaborators.length > 0 ||
    project.credits.length > 0 ||
    project.externalLinks.length > 0;

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
            <div className="space-y-6 pb-6">
              {/* Card image */}
              <div className="rounded-2xl border border-black/8 bg-[#FAF8F2] p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-black/40">
                    Card Image (grid thumbnail)
                  </span>
                  <label
                    className={`rounded-md px-2 py-1 text-[10px] font-medium transition ${
                      disabled
                        ? "cursor-not-allowed text-black/20"
                        : "cursor-pointer text-black/35 hover:bg-black/5 hover:text-black/60"
                    }`}
                  >
                    {uploadingCardImage ? "Uploading..." : "Upload"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={disabled}
                      onChange={(e) => void handleCardImageUpload(e)}
                    />
                  </label>
                </div>
                {(project.cardImageUrl || project.coverImageUrl) ? (
                  <img
                    src={project.cardImageUrl || project.coverImageUrl}
                    alt="Card preview"
                    className="aspect-[16/10] w-full rounded-md border border-black/10 object-cover"
                  />
                ) : (
                  <div className="flex aspect-[16/10] items-center justify-center rounded-md border border-dashed border-black/15 bg-black/3 text-[10px] text-black/25">
                    Falls back to cover image
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-black/8 p-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onPatch("collaborators", [...project.collaborators, { name: "", role: "" }])
                    }
                    className={chipButtonClass}
                    disabled={disabled}
                  >
                    + Collaborator
                  </button>
                  <button
                    type="button"
                    onClick={() => onPatch("credits", [...project.credits, { label: "", value: "" }])}
                    className={chipButtonClass}
                    disabled={disabled}
                  >
                    + Credit
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onPatch("externalLinks", [...project.externalLinks, { label: "", url: "" }])
                    }
                    className={chipButtonClass}
                    disabled={disabled}
                  >
                    + Link
                  </button>
                </div>
                {!hasStructuredDetails ? (
                  <p className="mt-3 text-xs leading-5 text-black/35">
                    Images can be dropped directly into the editor body, so there is no separate
                    gallery panel anymore.
                  </p>
                ) : null}
              </div>

              {/* Collaborators */}
              {project.collaborators.length ? (
                <div>
                  <SectionHeader
                    title="Collaborators"
                    actionLabel="Add"
                    onAction={() =>
                      onPatch("collaborators", [...project.collaborators, { name: "", role: "" }])
                    }
                    disabled={disabled}
                  />
                  <div className="space-y-2">
                    {project.collaborators.map((item, index) => (
                      <div key={`collab-${index}`} className="flex gap-2">
                        <input
                          value={item.name}
                          onChange={(e) =>
                            updateCollaborator(index, { ...item, name: e.target.value })
                          }
                          className={inputClass}
                          placeholder="Name"
                          disabled={disabled}
                        />
                        <input
                          value={item.role}
                          onChange={(e) =>
                            updateCollaborator(index, { ...item, role: e.target.value })
                          }
                          className={inputClass}
                          placeholder="Role"
                          disabled={disabled}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            onPatch(
                              "collaborators",
                              project.collaborators.filter((_, i) => i !== index)
                            )
                          }
                          className="shrink-0 rounded-md px-2 text-[10px] text-black/30 transition hover:bg-black/5 hover:text-black/60"
                          disabled={disabled}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Credits */}
              {project.credits.length ? (
                <div>
                  <SectionHeader
                    title="Credits"
                    actionLabel="Add"
                    onAction={() => onPatch("credits", [...project.credits, { label: "", value: "" }])}
                    disabled={disabled}
                  />
                  <div className="space-y-2">
                    {project.credits.map((item, index) => (
                      <div key={`credit-${index}`} className="flex gap-2">
                        <input
                          value={item.label}
                          onChange={(e) => updateCredit(index, { ...item, label: e.target.value })}
                          className={inputClass}
                          placeholder="Label"
                          disabled={disabled}
                        />
                        <input
                          value={item.value}
                          onChange={(e) => updateCredit(index, { ...item, value: e.target.value })}
                          className={inputClass}
                          placeholder="Value"
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
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* External Links */}
              {project.externalLinks.length ? (
                <div>
                  <SectionHeader
                    title="External Links"
                    actionLabel="Add"
                    onAction={() =>
                      onPatch("externalLinks", [...project.externalLinks, { label: "", url: "" }])
                    }
                    disabled={disabled}
                  />
                  <div className="space-y-2">
                    {project.externalLinks.map((item, index) => (
                      <div key={`link-${index}`} className="flex gap-2">
                        <input
                          value={item.label}
                          onChange={(e) => updateLink(index, { ...item, label: e.target.value })}
                          className={inputClass}
                          placeholder="Label"
                          disabled={disabled}
                        />
                        <input
                          value={item.url}
                          onChange={(e) => updateLink(index, { ...item, url: e.target.value })}
                          className={inputClass}
                          placeholder="https://..."
                          disabled={disabled}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            onPatch(
                              "externalLinks",
                              project.externalLinks.filter((_, i) => i !== index)
                            )
                          }
                          className="shrink-0 rounded-md px-2 text-[10px] text-black/30 transition hover:bg-black/5 hover:text-black/60"
                          disabled={disabled}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
