"use client";

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import type { GlobeMethods } from "react-globe.gl";
import { University } from "@/types";

const GlobeGL = dynamic(() => import("react-globe.gl"), { ssr: false });

interface GlobeProps {
  universities: University[];
  selectedUniversity: University | null;
  onSelectUniversity: (uni: University | null) => void;
  hoveredProject: string | null;
  onHoverProject: (id: string | null) => void;
}

interface MarkerData {
  id: string;
  lat: number;
  lng: number;
  color: string;
  label: string;
  type: "university" | "project";
  universityId: string;
  size: number;
}

export default function Globe({
  universities,
  selectedUniversity,
  onSelectUniversity,
  hoveredProject,
  onHoverProject,
}: GlobeProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const [globeReady, setGlobeReady] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [projectMarkersVisible, setProjectMarkersVisible] = useState(false);

  // Store callbacks in refs so HTML elements can access latest versions
  const onSelectRef = useRef(onSelectUniversity);
  const universitiesRef = useRef(universities);
  const selectedRef = useRef(selectedUniversity);
  onSelectRef.current = onSelectUniversity;
  universitiesRef.current = universities;
  selectedRef.current = selectedUniversity;

  // Track dimensions
  useEffect(() => {
    const update = () =>
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Called by react-globe.gl when the globe is fully initialized
  const handleGlobeReady = useCallback(() => {
    if (!globeRef.current) return;
    const controls = globeRef.current.controls();
    if (controls) {
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.4;
      controls.enableZoom = true;
    }
    globeRef.current.pointOfView({ lat: 30, lng: 10, altitude: 2.5 });
    setGlobeReady(true);
  }, []);

  // Animate to selected university
  useEffect(() => {
    if (!globeRef.current || !globeReady) return;
    const controls = globeRef.current.controls();

    if (selectedUniversity) {
      if (controls) controls.autoRotate = false;
      globeRef.current.pointOfView(
        {
          lat: selectedUniversity.lat,
          lng: selectedUniversity.lng,
          altitude: 1.8,
        },
        1200
      );
      setProjectMarkersVisible(false);
      const timer = setTimeout(() => setProjectMarkersVisible(true), 800);
      return () => clearTimeout(timer);
    } else {
      if (controls) controls.autoRotate = true;
      globeRef.current.pointOfView({ lat: 30, lng: 10, altitude: 2.5 }, 1200);
      setProjectMarkersVisible(false);
    }
  }, [selectedUniversity, globeReady]);

  // Build marker data
  const markers: MarkerData[] = useMemo(() => {
    const result: MarkerData[] = [];

    if (selectedUniversity) {
      result.push({
        id: selectedUniversity.id,
        lat: selectedUniversity.lat,
        lng: selectedUniversity.lng,
        color: selectedUniversity.color,
        label: selectedUniversity.shortName,
        type: "university",
        universityId: selectedUniversity.id,
        size: 18,
      });

      if (projectMarkersVisible) {
        selectedUniversity.projects.forEach((p) => {
          result.push({
            id: p.id,
            lat: selectedUniversity.lat + p.markerOffset.lat,
            lng: selectedUniversity.lng + p.markerOffset.lng,
            color: selectedUniversity.color,
            label: p.title,
            type: "project",
            universityId: selectedUniversity.id,
            size: 12,
          });
        });
      }
    } else {
      universities.forEach((uni) => {
        result.push({
          id: uni.id,
          lat: uni.lat,
          lng: uni.lng,
          color: uni.color,
          label: uni.shortName,
          type: "university",
          universityId: uni.id,
          size: 14,
        });
      });
    }

    return result;
  }, [universities, selectedUniversity, projectMarkersVisible]);

  // Create HTML element for each marker — attach click handlers directly
  const createMarkerElement = useCallback(
    (d: object) => {
      const marker = d as MarkerData;
      const el = document.createElement("div");
      el.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        cursor: pointer;
        pointer-events: auto;
        transition: transform 0.3s ease, opacity 0.5s ease;
      `;

      // Click handler on the element itself
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        if (marker.type === "university") {
          if (selectedRef.current?.id === marker.id) {
            onSelectRef.current(null);
          } else {
            const uni = universitiesRef.current.find(
              (u) => u.id === marker.id
            );
            if (uni) onSelectRef.current(uni);
          }
        }
      });

      const isProject = marker.type === "project";
      const isHovered = hoveredProject === marker.id;
      const dotSize = isHovered ? marker.size + 4 : marker.size;

      // Dot
      const dot = document.createElement("div");
      dot.style.cssText = `
        width: ${dotSize}px;
        height: ${dotSize}px;
        background: ${marker.color};
        border-radius: 50%;
        border: 2px solid rgba(255,255,255,0.9);
        box-shadow: 0 0 ${isHovered ? 20 : 12}px ${marker.color}80,
                    0 0 ${isHovered ? 40 : 24}px ${marker.color}40;
        transition: all 0.3s ease;
      `;

      // Ripple ring for project markers
      if (isProject) {
        const ripple = document.createElement("div");
        ripple.style.cssText = `
          position: absolute;
          width: ${dotSize + 16}px;
          height: ${dotSize + 16}px;
          border-radius: 50%;
          border: 1px solid ${marker.color}60;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation: markerRipple 2s ease-out infinite;
        `;
        el.style.position = "relative";
        el.appendChild(ripple);
      }

      // Label
      const label = document.createElement("div");
      label.textContent = marker.label;
      label.style.cssText = `
        margin-top: 6px;
        font-size: ${isProject ? 10 : 11}px;
        font-weight: ${isProject ? "400" : "600"};
        color: #fff;
        text-shadow: 0 1px 4px rgba(0,0,0,0.8);
        white-space: nowrap;
        letter-spacing: 0.5px;
        opacity: ${isProject && !isHovered ? 0.8 : 1};
      `;

      el.appendChild(dot);
      el.appendChild(label);

      return el;
    },
    [hoveredProject]
  );

  const handleGlobeClick = useCallback(() => {
    if (selectedRef.current) {
      onSelectRef.current(null);
    }
  }, []);

  return (
    <div className="absolute inset-0">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes markerRipple {
              0% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
              100% { transform: translate(-50%, -50%) scale(2.5); opacity: 0; }
            }
          `,
        }}
      />
      <GlobeGL
        ref={globeRef}
        width={dimensions.width}
        height={dimensions.height}
        backgroundColor="rgba(0,0,0,0)"
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
        atmosphereColor="#6b4ce6"
        atmosphereAltitude={0.2}
        htmlElementsData={markers}
        htmlLat="lat"
        htmlLng="lng"
        htmlElement={createMarkerElement}
        onGlobeClick={handleGlobeClick}
        onGlobeReady={handleGlobeReady}
        animateIn={true}
      />
    </div>
  );
}
