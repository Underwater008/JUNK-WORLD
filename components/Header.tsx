"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface HeaderProps {
  showAbout?: boolean;
  onToggleAbout?: () => void;
}

export default function Header({ showAbout, onToggleAbout }: HeaderProps) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isMembers = pathname === "/members";

  return (
    <header className="h-14 border-b-2 border-black flex items-center justify-between px-8 shrink-0 bg-white">
      <nav className="flex items-center gap-6">
        {isHome && onToggleAbout ? (
          <>
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
          </>
        ) : (
          <>
            <Link
              href="/"
              className="text-xs font-semibold uppercase tracking-[0.12em] transition-colors text-[#888] hover:text-black"
            >
              About
            </Link>
            <Link
              href="/?view=consortium"
              className="text-xs font-semibold uppercase tracking-[0.12em] transition-colors text-[#888] hover:text-black"
            >
              Consortium
            </Link>
          </>
        )}
        <Link
          href="/members"
          className={`text-xs font-semibold uppercase tracking-[0.12em] transition-colors ${
            isMembers ? "text-black" : "text-[#888] hover:text-black"
          }`}
        >
          Members
        </Link>
      </nav>
      {!isHome && (
        <img
          src="/images/JUNK logos/JUNK-logo.gif"
          alt="JUNK"
          className="h-8"
        />
      )}
    </header>
  );
}
