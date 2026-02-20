"use client";

interface HeaderProps {
  showAbout: boolean;
  onToggleAbout: () => void;
}

export default function Header({ showAbout, onToggleAbout }: HeaderProps) {
  return (
    <header className="h-14 border-b-2 border-black flex items-center justify-between px-8 shrink-0 bg-white">
      <img
        src="/images/JUNK logos/JUNK-logo.gif"
        alt="JUNK"
        className="h-8"
      />

      <button
        onClick={onToggleAbout}
        className="text-xs font-semibold uppercase tracking-[0.12em] text-[#888] hover:text-black transition-colors cursor-pointer flex items-center gap-2"
      >
        {showAbout ? (
          <>
            Close
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M4 4L12 12M12 4L4 12" />
            </svg>
          </>
        ) : (
          "About"
        )}
      </button>
    </header>
  );
}
