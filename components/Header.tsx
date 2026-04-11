"use client";

type View = "about" | "projects" | "members";

interface HeaderProps {
  view: View;
  onViewChange: (view: View) => void;
}

const views: { key: View; label: string }[] = [
  { key: "about", label: "About" },
  { key: "projects", label: "Consortium" },
  { key: "members", label: "Members" },
];

export default function Header({ view, onViewChange }: HeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center border-b-2 border-black bg-[#F4F0E8] px-8">
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
