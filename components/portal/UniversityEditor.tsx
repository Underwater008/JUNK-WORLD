"use client";

import { ChangeEvent, useState } from "react";
import TagEditor from "@/components/portal/TagEditor";
import { uploadAsset } from "@/lib/uploads";
import type { University } from "@/types";

interface UniversityEditorProps {
  mode: "create" | "edit";
  university?: University;
  writesDisabled: boolean;
  onBack: () => void;
  onSaved: (savedId: string) => void;
  onDeleted: () => void;
}

const EMPTY_UNIVERSITY = {
  name: "",
  shortName: "",
  city: "",
  country: "",
  lat: 0,
  lng: 0,
  color: "#000000",
  disciplines: [] as string[],
  logo: "",
  status: "active" as const,
};

export default function UniversityEditor({
  mode,
  university,
  writesDisabled,
  onBack,
  onSaved,
  onDeleted,
}: UniversityEditorProps) {
  const initial = university
    ? {
        name: university.name,
        shortName: university.shortName,
        city: university.city,
        country: university.country,
        lat: university.lat,
        lng: university.lng,
        color: university.color,
        disciplines: [...university.disciplines],
        logo: university.logo ?? "",
        status: university.status ?? "active",
      }
    : EMPTY_UNIVERSITY;

  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const disabled = writesDisabled || saving || deleting;

  function patch(updates: Partial<typeof form>) {
    setForm((prev) => ({ ...prev, ...updates }));
    setSuccess(false);
    setError(null);
  }

  async function handleLogoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || disabled) return;

    setUploading(true);
    try {
      const url = await uploadAsset(file, "logos");
      patch({ logo: url });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Logo upload failed.");
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
      const url =
        mode === "create"
          ? "/api/portal/universities"
          : `/api/portal/universities/${university!.id}`;

      const response = await fetch(url, {
        method: mode === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          shortName: form.shortName,
          city: form.city,
          country: form.country,
          lat: form.lat,
          lng: form.lng,
          color: form.color,
          disciplines: form.disciplines,
          logo: form.logo || undefined,
          status: form.status,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Save failed.");
      }

      setSuccess(true);
      const savedId = payload.university?.id ?? university?.id ?? "";
      onSaved(savedId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!university || disabled) return;
    setDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/portal/universities/${university.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || "Delete failed.");
      }

      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="space-y-5 border-2 border-black bg-white p-5 shadow-[6px_6px_0_#000]">
        {/* Logo */}
        <div className="flex items-center gap-4">
          {form.logo ? (
            <div className="group relative h-16 w-16 shrink-0">
              <img
                src={form.logo}
                alt={form.shortName || "Logo"}
                className="h-16 w-16 object-contain"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/30 group-hover:opacity-100">
                <label className="cursor-pointer rounded-full bg-white/90 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em]">
                  {uploading ? "..." : "Change"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={disabled || uploading}
                    onChange={(e) => void handleLogoUpload(e)}
                  />
                </label>
              </div>
            </div>
          ) : (
            <label className="flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-black/5 text-[9px] font-medium uppercase tracking-[0.12em] text-black/30 transition hover:bg-black/10 hover:text-black/50">
              {uploading ? "..." : "+ Logo"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={disabled || uploading}
                onChange={(e) => void handleLogoUpload(e)}
              />
            </label>
          )}
          {form.logo && !disabled && (
            <button
              type="button"
              onClick={() => patch({ logo: "" })}
              className="text-[10px] text-black/30 transition hover:text-black/60"
            >
              Remove logo
            </button>
          )}
        </div>

        {/* Name + Short Name */}
        <div className="grid grid-cols-3 gap-3">
          <label className="col-span-2 flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/70">
              Name
            </span>
            <input
              value={form.name}
              onChange={(e) => patch({ name: e.target.value })}
              disabled={disabled}
              className="rounded-md border border-black/10 px-3 py-2 text-sm text-black outline-none focus:border-black/30"
              placeholder="University name"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/70">
              Short Name
            </span>
            <input
              value={form.shortName}
              onChange={(e) => patch({ shortName: e.target.value })}
              disabled={disabled}
              className="rounded-md border border-black/10 px-3 py-2 text-sm text-black outline-none focus:border-black/30"
              placeholder="ABC"
            />
          </label>
        </div>

        {/* City + Country */}
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/70">
              City
            </span>
            <input
              value={form.city}
              onChange={(e) => patch({ city: e.target.value })}
              disabled={disabled}
              className="rounded-md border border-black/10 px-3 py-2 text-sm text-black outline-none focus:border-black/30"
              placeholder="City"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/70">
              Country
            </span>
            <input
              value={form.country}
              onChange={(e) => patch({ country: e.target.value })}
              disabled={disabled}
              className="rounded-md border border-black/10 px-3 py-2 text-sm text-black outline-none focus:border-black/30"
              placeholder="Country"
            />
          </label>
        </div>

        {/* Lat + Lng + Color */}
        <div className="grid grid-cols-3 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/70">
              Latitude
            </span>
            <input
              type="number"
              step="any"
              value={form.lat}
              onChange={(e) => patch({ lat: Number(e.target.value) || 0 })}
              disabled={disabled}
              className="rounded-md border border-black/10 px-3 py-2 text-sm text-black outline-none focus:border-black/30"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/70">
              Longitude
            </span>
            <input
              type="number"
              step="any"
              value={form.lng}
              onChange={(e) => patch({ lng: Number(e.target.value) || 0 })}
              disabled={disabled}
              className="rounded-md border border-black/10 px-3 py-2 text-sm text-black outline-none focus:border-black/30"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/70">
              Color
            </span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.color}
                onChange={(e) => patch({ color: e.target.value })}
                disabled={disabled}
                className="h-9 w-9 shrink-0 cursor-pointer rounded border border-black/10"
              />
              <input
                value={form.color}
                onChange={(e) => patch({ color: e.target.value })}
                disabled={disabled}
                className="w-full rounded-md border border-black/10 px-3 py-2 text-sm text-black outline-none focus:border-black/30"
                placeholder="#000000"
              />
            </div>
          </label>
        </div>

        {/* Status */}
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/70">
            Status
          </span>
          <select
            value={form.status}
            onChange={(e) =>
              patch({ status: e.target.value as "active" | "inactive" })
            }
            disabled={disabled}
            className="w-40 rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none focus:border-black/30"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>

        {/* Disciplines */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/70">
            Disciplines
          </span>
          <TagEditor
            tags={form.disciplines}
            onChange={(disciplines) => patch({ disciplines })}
            disabled={disabled}
          />
        </div>

        {/* Error / Success */}
        {error && (
          <div className="border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="border border-green-300 bg-green-50 px-3 py-2 text-xs text-green-700">
            University saved successfully.
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={disabled || !form.name.trim() || !form.shortName.trim()}
              className="border border-black bg-black px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-white hover:text-black disabled:opacity-40 disabled:hover:bg-black disabled:hover:text-white"
            >
              {saving ? "Saving..." : mode === "create" ? "Create" : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={onBack}
              className="border border-black/20 bg-white px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/60 transition hover:border-black hover:text-black"
            >
              Cancel
            </button>
          </div>

          {mode === "edit" && !writesDisabled && (
            confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-red-600">Are you sure?</span>
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  disabled={deleting}
                  className="border border-red-600 bg-red-600 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-red-700 disabled:opacity-40"
                >
                  {deleting ? "Deleting..." : "Yes, Delete"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="border border-black/20 bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/60 transition hover:border-black hover:text-black"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={disabled}
                className="border border-red-300 bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-red-500 transition hover:border-red-500 hover:bg-red-50 disabled:opacity-40"
              >
                Delete
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
