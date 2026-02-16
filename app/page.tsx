"use client";

import { useState } from "react";
import Globe from "@/components/Globe";
import UniversityList from "@/components/UniversityList";
import ProjectPanel from "@/components/ProjectPanel";
import { universities } from "@/data/mock";
import { University } from "@/types";

export default function Home() {
  const [selectedUniversity, setSelectedUniversity] =
    useState<University | null>(null);
  const [hoveredProject, setHoveredProject] = useState<string | null>(null);

  return (
    <main className="relative w-screen h-screen overflow-hidden">
      {/* Globe background */}
      <Globe
        universities={universities}
        selectedUniversity={selectedUniversity}
        onSelectUniversity={setSelectedUniversity}
        hoveredProject={hoveredProject}
        onHoverProject={setHoveredProject}
      />

      {/* Title */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20 text-center pointer-events-none">
        <h1 className="text-2xl font-semibold tracking-wider text-white/90 drop-shadow-lg">
          JUNK GLOBAL
        </h1>
        <p className="text-xs text-white/40 mt-1 tracking-widest uppercase">
          University Design Projects
        </p>
      </div>

      {/* University list - left side */}
      <UniversityList
        universities={universities}
        selectedUniversity={selectedUniversity}
        onSelect={setSelectedUniversity}
      />

      {/* Project panel - right side */}
      <ProjectPanel
        university={selectedUniversity}
        hoveredProject={hoveredProject}
        onHoverProject={setHoveredProject}
      />
    </main>
  );
}
