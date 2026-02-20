"use client";

import { useState } from "react";
import Globe from "@/components/Globe";
import Sidebar from "@/components/Sidebar";
import { universities as rawUniversities } from "@/data/mock";

const universities = [...rawUniversities].sort((a, b) =>
  a.name.localeCompare(b.name)
);
import { University } from "@/types";

export default function Home() {
  const [selectedUniversity, setSelectedUniversity] =
    useState<University | null>(null);
  const [hoveredProject, setHoveredProject] = useState<string | null>(null);

  return (
    <main className="w-screen h-screen overflow-hidden flex flex-col">
      {/* Header */}
      <header className="h-14 border-b-2 border-black flex items-center justify-between px-8 shrink-0 bg-white">
        <img
          src="/images/JUNK logos/JUNK-logo.gif"
          alt="JUNK"
          className="h-8"
        />
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
