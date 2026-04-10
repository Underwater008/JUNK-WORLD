"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm({
  nextPath,
  submitLabel = "Enter Portal",
}: {
  nextPath: string;
  submitLabel?: string;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/portal/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Portal access failed.");
        return;
      }

      router.replace(nextPath);
      router.refresh();
    } catch {
      setError("Portal access failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#6F6F6F]">
          Shared Password
        </span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="border-2 border-black bg-white px-4 py-3 text-sm text-black outline-none focus:ring-0"
          placeholder="Enter the editor password"
          autoFocus
        />
      </label>

      {error ? <p className="text-sm text-[#B42318]">{error}</p> : null}

      <button
        type="submit"
        disabled={submitting}
        className="mt-2 inline-flex items-center justify-center border-2 border-black bg-black px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Checking..." : submitLabel}
      </button>
    </form>
  );
}
