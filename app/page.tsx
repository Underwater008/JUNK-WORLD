"use client";

import { useState } from "react";
import Globe from "@/components/Globe";
import Sidebar from "@/components/Sidebar";
import { universities } from "@/data/mock";
import { University } from "@/types";

export default function Home() {
  const [selectedUniversity, setSelectedUniversity] =
    useState<University | null>(null);
  const [hoveredProject, setHoveredProject] = useState<string | null>(null);

  return (
    <main className="w-screen h-screen overflow-hidden flex flex-col">
      {/* Header */}
      <header className="h-14 border-b-2 border-black flex items-center justify-between px-8 shrink-0 bg-white">
        <h1 className="text-sm font-bold tracking-[0.2em] uppercase text-black">
          JUNK GLOBAL
        </h1>
        <span className="text-xs text-[#888] font-medium tracking-wide">
          University Design Projects
        </span>
      </header>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          universities={universities}
          selectedUniversity={selectedUniversity}
          onSelect={setSelectedUniversity}
          onHoverProject={setHoveredProject}
        />

        <div className="flex-1 relative bg-white">
          <Globe
            universities={universities}
            selectedUniversity={selectedUniversity}
            onSelectUniversity={setSelectedUniversity}
            hoveredProject={hoveredProject}
          />
        </div>
      </div>
    </main>
  );
}
