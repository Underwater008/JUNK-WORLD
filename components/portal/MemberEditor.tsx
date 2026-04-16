"use client";

import { ChangeEvent, useState } from "react";
import { uploadAsset } from "@/lib/uploads";
import type { Member, University } from "@/types";

interface MemberEditorProps {
  mode: "create" | "edit";
  member?: Member;
  universities: University[];
  writesDisabled: boolean;
  onBack: () => void;
  onSaved: (member: Member) => void;
}

const EMPTY_MEMBER = {
  name: "",
  title: "",
  university: "",
  universityId: "",
  country: "",
  city: "",
  bio: "",
  image: "",
  profileUrl: "",
  websiteUrl: "",
};

export default function MemberEditor({
  mode,
  member,
  universities,
  writesDisabled,
  onBack,
  onSaved,
}: MemberEditorProps) {
  const initial = member
    ? {
        name: member.name,
        title: member.title,
        university: member.university,
        universityId: member.universityId ?? "",
        country: member.country,
        city: member.city,
        bio: member.bio,
        image: member.image ?? "",
        profileUrl: member.profileUrl ?? "",
        websiteUrl: member.websiteUrl ?? "",
      }
    : EMPTY_MEMBER;

  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disabled = writesDisabled || saving || uploading;

  function patch(updates: Partial<typeof form>) {
    setForm((current) => ({ ...current, ...updates }));
    setError(null);
  }

  function handleUniversityChange(universityId: string) {
    const nextUniversity =
      universities.find((entry) => entry.id === universityId) ?? null;

    patch({
      universityId,
      university: nextUniversity?.name ?? form.university,
      city: nextUniversity?.city ?? form.city,
      country: nextUniversity?.country ?? form.country,
    });
  }

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || disabled) return;

    setUploading(true);
    setError(null);

    try {
      const imageUrl = await uploadAsset(file, "members/photos");
      patch({ image: imageUrl });
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "Photo upload failed."
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function handleSave() {
    if (disabled) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(
        mode === "create" ? "/api/portal/members" : `/api/portal/members/${member!.id}`,
        {
          method: mode === "create" ? "POST" : "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: form.name,
            title: form.title,
            university: form.university,
            universityId: form.universityId || undefined,
            country: form.country,
            city: form.city,
            bio: form.bio,
            image: form.image || undefined,
            profileUrl: form.profileUrl || undefined,
            websiteUrl: form.websiteUrl || undefined,
          }),
        }
      );

      const payload = (await response.json()) as {
        member?: Member;
        error?: string;
      };

      if (!response.ok || !payload.member) {
        throw new Error(payload.error || "Save failed.");
      }

      onSaved(payload.member);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="space-y-5 border-2 border-black bg-white p-5 shadow-[6px_6px_0_#000]">
        <div className="flex items-start justify-between gap-4 border-b border-black/10 pb-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--ink-wash-700)]">
              Members Editor
            </p>
            <h2 className="mt-3 font-serif text-3xl leading-none text-black">
              {mode === "create" ? "Add a member." : "Edit member profile."}
            </h2>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="border border-black/20 bg-white px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/60 transition hover:border-black hover:text-black"
          >
            Back
          </button>
        </div>

        <div className="flex items-center gap-4">
          {form.image ? (
            <div className="group relative h-24 w-24 shrink-0 overflow-hidden bg-black/5">
              <img
                src={form.image}
                alt={form.name || "Member photo"}
                className="h-full w-full object-cover"
              />
              {!disabled ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/35 group-hover:opacity-100">
                  <label className="cursor-pointer rounded-full bg-white/90 px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.12em]">
                    {uploading ? "..." : "Change"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={disabled}
                      onChange={(event) => void handleImageUpload(event)}
                    />
                  </label>
                </div>
              ) : null}
            </div>
          ) : (
            <label className="flex h-24 w-24 shrink-0 cursor-pointer items-center justify-center bg-black text-[10px] font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-[var(--ink-wash-700)]">
              {uploading ? "..." : "Upload"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={disabled}
                onChange={(event) => void handleImageUpload(event)}
              />
            </label>
          )}

          <div className="space-y-2">
            <p className="text-sm text-black/65">
              Upload a member portrait, then edit their bio, role, and links.
            </p>
            {form.image && !disabled ? (
              <button
                type="button"
                onClick={() => patch({ image: "" })}
                className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45 transition hover:text-black"
              >
                Remove photo
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2 sm:col-span-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/45">
              Name
            </span>
            <input
              value={form.name}
              onChange={(event) => patch({ name: event.target.value })}
              disabled={disabled}
              className="border border-black/15 px-3 py-3 text-sm text-black outline-none transition focus:border-black"
              placeholder="Member name"
            />
          </label>

          <label className="flex flex-col gap-2 sm:col-span-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/45">
              Title
            </span>
            <input
              value={form.title}
              onChange={(event) => patch({ title: event.target.value })}
              disabled={disabled}
              className="border border-black/15 px-3 py-3 text-sm text-black outline-none transition focus:border-black"
              placeholder="Role or academic title"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/45">
              Consortium organization
            </span>
            <select
              value={form.universityId}
              onChange={(event) => handleUniversityChange(event.target.value)}
              disabled={disabled}
              className="border border-black/15 bg-white px-3 py-3 text-sm text-black outline-none transition focus:border-black"
            >
              <option value="">No linked organization</option>
              {universities.map((university) => (
                <option key={university.id} value={university.id}>
                  {university.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/45">
              Displayed organization name
            </span>
            <input
              value={form.university}
              onChange={(event) => patch({ university: event.target.value })}
              disabled={disabled}
              className="border border-black/15 px-3 py-3 text-sm text-black outline-none transition focus:border-black"
              placeholder="Organization or lab name"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/45">
              City
            </span>
            <input
              value={form.city}
              onChange={(event) => patch({ city: event.target.value })}
              disabled={disabled}
              className="border border-black/15 px-3 py-3 text-sm text-black outline-none transition focus:border-black"
              placeholder="City"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/45">
              Country
            </span>
            <input
              value={form.country}
              onChange={(event) => patch({ country: event.target.value })}
              disabled={disabled}
              className="border border-black/15 px-3 py-3 text-sm text-black outline-none transition focus:border-black"
              placeholder="Country"
            />
          </label>

          <label className="flex flex-col gap-2 sm:col-span-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/45">
              Bio
            </span>
            <textarea
              value={form.bio}
              onChange={(event) => patch({ bio: event.target.value })}
              disabled={disabled}
              rows={6}
              className="resize-y border border-black/15 px-3 py-3 text-sm leading-7 text-black outline-none transition focus:border-black"
              placeholder="Short biography"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/45">
              Profile URL
            </span>
            <input
              value={form.profileUrl}
              onChange={(event) => patch({ profileUrl: event.target.value })}
              disabled={disabled}
              className="border border-black/15 px-3 py-3 text-sm text-black outline-none transition focus:border-black"
              placeholder="https://..."
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/45">
              Website URL
            </span>
            <input
              value={form.websiteUrl}
              onChange={(event) => patch({ websiteUrl: event.target.value })}
              disabled={disabled}
              className="border border-black/15 px-3 py-3 text-sm text-black outline-none transition focus:border-black"
              placeholder="https://..."
            />
          </label>
        </div>

        {error ? (
          <div className="border border-[#D97706] bg-[#FFF4E8] px-4 py-3 text-sm text-[#8A3B12]">
            {error}
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3 pt-2">
          <p className="text-[11px] text-black/45">
            Changes save to the member directory and appear on the public members page.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBack}
              className="border border-black/20 bg-white px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/60 transition hover:border-black hover:text-black"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={disabled || !form.name.trim() || !form.university.trim()}
              className="border border-black bg-black px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-white hover:text-black disabled:opacity-40"
            >
              {saving ? "Saving..." : mode === "create" ? "Create Member" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
