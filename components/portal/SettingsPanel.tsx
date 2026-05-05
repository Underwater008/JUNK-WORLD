"use client";

import type { ProjectDocument } from "@/types";

interface SettingsPanelProps {
  project: ProjectDocument;
  onPatch: <K extends keyof ProjectDocument>(key: K, value: ProjectDocument[K]) => void;
  disabled?: boolean;
  embedded?: boolean;
}

export default function SettingsPanel(_props: SettingsPanelProps) {
  // Credits / collaborators editing was retired in favor of the
  // dedicated Contributors form (faculty submitters + students with
  // skills) shown directly in the project body. Nothing to render here
  // for now — the panel is kept as a stable mount point so callers that
  // pass it through MetaRow as `children` don't need to change.
  return null;
}
