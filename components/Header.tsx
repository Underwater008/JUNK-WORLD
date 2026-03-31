"use client";

type View = "about" | "consortium" | "projects" | "members";

interface HeaderProps {
  view: View;
  onViewChange: (view: View) => void;
}

const views: { key: View; label: string }[] = [
  { key: "about", label: "About" },
  { key: "consortium", label: "Consortium" },
  { key: "projects", label: "Projects" },
  { key: "members", label: "Members" },
];

export default function Header({ view, onViewChange }: HeaderProps) {
  return (
    <header className="h-14 border-b-2 border-black flex items-center justify-between px-8 shrink-0 bg-white">
      <nav className="flex items-center gap-6">
        {views.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onViewChange(key)}
            className={`text-xs font-semibold uppercase tracking-[0.12em] transition-colors cursor-pointer ${
              view === key ? "text-black" : "text-[#888] hover:text-black"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>
    </header>
  );
}
