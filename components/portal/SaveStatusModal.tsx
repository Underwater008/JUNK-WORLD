"use client";

export type SaveStatusTone = "pending" | "success" | "error";

interface SaveStatusModalProps {
  tone: SaveStatusTone;
  message: string;
  onDismiss: () => void;
}

export default function SaveStatusModal({
  tone,
  message,
  onDismiss,
}: SaveStatusModalProps) {
  const dismissable = tone !== "pending";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 px-4"
      onClick={() => {
        if (dismissable) onDismiss();
      }}
    >
      <div
        role={tone === "error" ? "alert" : "status"}
        aria-live="polite"
        onClick={(event) => event.stopPropagation()}
        className={`flex w-full max-w-sm flex-col items-center gap-4 border-2 bg-white px-6 py-7 text-center shadow-[0_24px_60px_rgba(0,0,0,0.18)] ${
          tone === "error"
            ? "border-red-500"
            : tone === "success"
              ? "border-emerald-500"
              : "border-black"
        }`}
      >
        {tone === "pending" ? (
          <span
            aria-hidden="true"
            className="block h-10 w-10 animate-spin rounded-full border-[3px] border-black/15 border-t-black"
          />
        ) : tone === "success" ? (
          <span
            aria-hidden="true"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 10.5L8 14.5L16 6" />
            </svg>
          </span>
        ) : (
          <span
            aria-hidden="true"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500 text-white"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 5L15 15" />
              <path d="M15 5L5 15" />
            </svg>
          </span>
        )}

        <p
          className={`text-sm font-semibold ${
            tone === "error"
              ? "text-red-700"
              : tone === "success"
                ? "text-emerald-700"
                : "text-black"
          }`}
        >
          {message}
        </p>

        {dismissable ? (
          <button
            type="button"
            onClick={onDismiss}
            className="mt-1 border border-black bg-black px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-white hover:text-black"
          >
            {tone === "error" ? "Dismiss" : "OK"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
