"use client";

interface HeaderProps {
  showAbout: boolean;
  onToggleAbout: () => void;
}

export default function Header({ showAbout, onToggleAbout }: HeaderProps) {
  return (
    <header className="h-14 border-b-2 border-black flex items-center justify-between px-8 shrink-0 bg-white">
      <nav className="flex items-center gap-6">
        <button
          onClick={() => !showAbout && onToggleAbout()}
          className={`text-xs font-semibold uppercase tracking-[0.12em] transition-colors cursor-pointer ${
            showAbout ? "text-black" : "text-[#888] hover:text-black"
          }`}
        >
          About
        </button>
        <button
          onClick={() => showAbout && onToggleAbout()}
          className={`text-xs font-semibold uppercase tracking-[0.12em] transition-colors cursor-pointer ${
            !showAbout ? "text-black" : "text-[#888] hover:text-black"
          }`}
        >
          Consortium
        </button>
      </nav>

      <img
        src="/images/JUNK logos/JUNK-logo.gif"
        alt="JUNK"
        className="h-8"
      />
    </header>
  );
}
