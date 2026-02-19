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
}

interface MarkerData {
  id: string;
  lat: number;
  lng: number;
  label: string;
  type: "university" | "project";
  universityId: string;
  size: number;
}

/**
 * Render GeoJSON country features onto a 2D canvas as an equirectangular
 * texture. This is then mapped onto the globe sphere — pure texture,
 * zero z-fighting.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderGlobeTexture(features: any[]): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d")!;
  const { width, height } = canvas;

  // Ocean
  ctx.fillStyle = "#f5f5f5";
  ctx.fillRect(0, 0, width, height);

  // Land fill + country border strokes in one pass
  ctx.fillStyle = "#ebebeb";
  ctx.strokeStyle = "#333333";
  ctx.lineWidth = 1.5;
  ctx.lineJoin = "round";

  for (const feature of features) {
    if (!feature.geometry) continue;
    const { type, coordinates } = feature.geometry;
    const polygons = type === "Polygon" ? [coordinates] : coordinates;

    for (const polygon of polygons) {
      ctx.beginPath();
      for (const ring of polygon) {
        for (let i = 0; i < ring.length; i++) {
          const [lng, lat] = ring[i];
          const x = ((lng + 180) / 360) * width;
          const y = ((90 - lat) / 180) * height;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            // Skip segments that cross the antimeridian
            const [prevLng] = ring[i - 1];
            if (Math.abs(lng - prevLng) > 180) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
        }
      }
      ctx.fill();
      ctx.stroke();
    }
  }

  return canvas;
}

export default function Globe({
  universities,
  selectedUniversity,
  onSelectUniversity,
  hoveredProject,
}: GlobeProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [globeReady, setGlobeReady] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [projectMarkersVisible, setProjectMarkersVisible] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [globeMaterial, setGlobeMaterial] = useState<any>(null);

  const onSelectRef = useRef(onSelectUniversity);
  const universitiesRef = useRef(universities);
  const selectedRef = useRef(selectedUniversity);
  onSelectRef.current = onSelectUniversity;
  universitiesRef.current = universities;
  selectedRef.current = selectedUniversity;

  // Load world data, render to canvas texture, create material
  useEffect(() => {
    Promise.all([
      import("three"),
      import("topojson-client"),
      fetch("https://unpkg.com/world-atlas@2/countries-110m.json").then((r) =>
        r.json()
      ),
    ]).then(([THREE, topojson, worldData]) => {
      const geojson = topojson.feature(
        worldData,
        worldData.objects.countries
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const canvas = renderGlobeTexture((geojson as any).features);
      const texture = new THREE.CanvasTexture(canvas);

      setGlobeMaterial(
        new THREE.MeshBasicMaterial({
          map: texture,
        })
      );
    });
  }, []);

  // Track container dimensions
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setDimensions({ width: rect.width, height: rect.height });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleGlobeReady = useCallback(() => {
    if (!globeRef.current) return;
    const controls = globeRef.current.controls();
    if (controls) {
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.3;
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
      globeRef.current.pointOfView(
        { lat: 30, lng: 10, altitude: 2.5 },
        1200
      );
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
        label: selectedUniversity.shortName,
        type: "university",
        universityId: selectedUniversity.id,
        size: 14,
      });

      if (projectMarkersVisible) {
        selectedUniversity.projects.forEach((p) => {
          result.push({
            id: p.id,
            lat: selectedUniversity.lat + p.markerOffset.lat,
            lng: selectedUniversity.lng + p.markerOffset.lng,
            label: p.title,
            type: "project",
            universityId: selectedUniversity.id,
            size: 8,
          });
        });
      }
    } else {
      universities.forEach((uni) => {
        result.push({
          id: uni.id,
          lat: uni.lat,
          lng: uni.lng,
          label: uni.shortName,
          type: "university",
          universityId: uni.id,
          size: 10,
        });
      });
    }

    return result;
  }, [universities, selectedUniversity, projectMarkersVisible]);

  // Create marker HTML elements
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

      // Dot — monochrome
      const dot = document.createElement("div");
      dot.style.cssText = `
        width: ${dotSize}px;
        height: ${dotSize}px;
        background: #000000;
        border-radius: 50%;
        border: 1.5px solid #ffffff;
        transition: all 0.3s ease;
        ${isHovered ? "box-shadow: 0 0 0 3px rgba(0,0,0,0.15);" : ""}
      `;

      // Label
      const label = document.createElement("div");
      label.textContent = marker.label;
      label.style.cssText = `
        margin-top: 4px;
        font-size: ${isProject ? 9 : 11}px;
        font-weight: ${isProject ? "500" : "600"};
        color: #171717;
        white-space: nowrap;
        letter-spacing: 0.3px;
        font-family: "Inter", -apple-system, sans-serif;
        opacity: ${isProject && !isHovered ? 0 : 1};
        transition: opacity 0.2s ease;
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
    <div ref={containerRef} className="w-full h-full relative">
      {dimensions.width > 0 && globeMaterial && (
        <GlobeGL
          ref={globeRef}
          width={dimensions.width}
          height={dimensions.height}
          backgroundColor="rgba(0,0,0,0)"
          globeMaterial={globeMaterial}
          showAtmosphere={false}
          htmlElementsData={markers}
          htmlLat="lat"
          htmlLng="lng"
          htmlElement={createMarkerElement}
          onGlobeClick={handleGlobeClick}
          onGlobeReady={handleGlobeReady}
          animateIn={true}
        />
      )}
    </div>
  );
}
