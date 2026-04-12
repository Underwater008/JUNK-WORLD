"use client";

import { useRef, useEffect } from "react";
import * as THREE from "three";
import { feature } from "topojson-client";
import type { ProjectMarkerOffset, University } from "@/types";

const R = 70;
const LABEL_Z_THRESHOLD = 10;
const COUNTRIES_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

type GlobeCountryGeometry =
  | { type: "MultiPolygon"; coordinates: number[][][][] }
  | { type: "Polygon"; coordinates: number[][][] };

type GlobeCountriesFeatureCollection = {
  type: "FeatureCollection";
  features: Array<{ geometry: GlobeCountryGeometry }>;
};

type GlobeCountriesFeature = {
  type: "Feature";
  geometry: GlobeCountryGeometry;
};

function toVec3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function createDefaultRotationQuaternion() {
  return new THREE.Quaternion().setFromEuler(
    new THREE.Euler(0.3, 0, 0, "YXZ")
  );
}

function createMarkerNode({
  color,
  radius,
}: {
  color: THREE.ColorRepresentation;
  radius: number;
}) {
  const group = new THREE.Group();

  const dot = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 18, 18),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(color) })
  );
  group.add(dot);

  return group;
}

function disposeMarkerNode(node: THREE.Object3D) {
  node.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.geometry.dispose();
    if (Array.isArray(child.material)) {
      child.material.forEach((material) => material.dispose());
      return;
    }
    child.material.dispose();
  });
}

function getFocusQuaternion({
  selectedUniversity,
  hoveredProject,
  focusMarker,
  focusTargetYOffset,
}: {
  selectedUniversity: University | null;
  hoveredProject: string | null;
  focusMarker: GlobeProps["focusMarker"];
  focusTargetYOffset: number;
}) {
  const front = new THREE.Vector3(0, focusTargetYOffset, 1).normalize();

  if (focusMarker) {
    const pointDir = toVec3(
      focusMarker.markerOffset.lat,
      focusMarker.markerOffset.lng,
      1
    ).normalize();
    return new THREE.Quaternion().setFromUnitVectors(pointDir, front);
  }

  if (hoveredProject && selectedUniversity) {
    const project = selectedUniversity.projects.find(
      (candidate) => candidate.id === hoveredProject
    );
    if (project) {
      const pointDir = toVec3(
        project.markerOffset.lat,
        project.markerOffset.lng,
        1
      ).normalize();
      return new THREE.Quaternion().setFromUnitVectors(pointDir, front);
    }
  }

  if (!selectedUniversity) {
    return null;
  }

  const pointDir = toVec3(selectedUniversity.lat, selectedUniversity.lng, 1).normalize();
  return new THREE.Quaternion().setFromUnitVectors(pointDir, front);
}

interface GlobeProps {
  universities: University[];
  selectedUniversity: University | null;
  onSelectUniversity: (uni: University | null) => void;
  hoveredProject: string | null;
  compact?: boolean;
  scale?: number;
  allowDragInCompact?: boolean;
  hideLabels?: boolean;
  soloLabelId?: string;
  maxLabels?: number;
  disableAutoRotate?: boolean;
  disableDrag?: boolean;
  verticalOffset?: number;
  cameraY?: number;
  focusMarker?: {
    id: string;
    title: string;
    markerOffset: ProjectMarkerOffset;
    color?: string;
    label?: string;
  } | null;
  hideProjectLabels?: boolean;
  hideSelectedUniversityMarker?: boolean;
  focusTargetYOffset?: number;
}

export default function Globe({
  universities,
  selectedUniversity,
  hoveredProject,
  compact = false,
  scale,
  allowDragInCompact = false,
  hideLabels = false,
  soloLabelId,
  maxLabels,
  disableAutoRotate = false,
  disableDrag = false,
  verticalOffset = 0,
  cameraY = 40,
  focusMarker = null,
  hideProjectLabels = false,
  hideSelectedUniversityMarker = false,
  focusTargetYOffset = 0,
}: GlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<(HTMLDivElement | null)[]>([]);
  const projectLabelsRef = useRef<(HTMLDivElement | null)[]>([]);

  // Scene state refs
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    globe: THREE.Group;
    markersGroup: THREE.Group;
    rot: THREE.Quaternion;
    targetQ: THREE.Quaternion | null;
    autoQ: THREE.Quaternion;
    drag: { active: boolean; x: number; y: number };
  } | null>(null);

  const frameRef = useRef(0);
  const compactRef = useRef(compact);
  const scaleRef = useRef(scale);
  const allowDragInCompactRef = useRef(allowDragInCompact);
  const disableAutoRotateRef = useRef(disableAutoRotate);
  const disableDragRef = useRef(disableDrag);
  const hoveredProjectRef = useRef(hoveredProject);
  const universitiesRef = useRef(universities);
  const soloLabelIdRef = useRef(soloLabelId);
  const selectedUniversityRef = useRef(selectedUniversity);
  const maxLabelsRef = useRef(maxLabels);
  const hideLabelsRef = useRef(hideLabels);
  const focusMarkerRef = useRef(focusMarker);
  const hideProjectLabelsRef = useRef(hideProjectLabels);
  const hideSelectedUniversityMarkerRef = useRef(hideSelectedUniversityMarker);
  const focusTargetYOffsetRef = useRef(focusTargetYOffset);
  const cameraYRef = useRef(cameraY);
  const labelsReadyRef = useRef(false);
  const prevVisibleRef = useRef<Set<number>>(new Set());

  // Keep refs in sync
  useEffect(() => {
    compactRef.current = compact;
    scaleRef.current = scale;
    allowDragInCompactRef.current = allowDragInCompact;
    disableAutoRotateRef.current = disableAutoRotate;
    disableDragRef.current = disableDrag;
    hoveredProjectRef.current = hoveredProject;
    universitiesRef.current = universities;
    soloLabelIdRef.current = soloLabelId;
    selectedUniversityRef.current = selectedUniversity;
    maxLabelsRef.current = maxLabels;
    hideLabelsRef.current = hideLabels;
    focusMarkerRef.current = focusMarker;
    hideProjectLabelsRef.current = hideProjectLabels;
    hideSelectedUniversityMarkerRef.current = hideSelectedUniversityMarker;
    focusTargetYOffsetRef.current = focusTargetYOffset;
    cameraYRef.current = cameraY;

    const s = sceneRef.current;
    if (s && s.renderer) {
      if (disableDrag || (compact && !allowDragInCompact)) {
        s.drag.active = false;
        s.renderer.domElement.style.cursor = "default";
      } else {
        s.renderer.domElement.style.cursor = "grab";
      }
    }
  }, [
    compact,
    scale,
    allowDragInCompact,
    disableAutoRotate,
    disableDrag,
    hoveredProject,
    universities,
    soloLabelId,
    selectedUniversity,
    maxLabels,
    hideLabels,
    focusMarker,
    hideProjectLabels,
    hideSelectedUniversityMarker,
    focusTargetYOffset,
    cameraY,
  ]);

  // Focus on selected university or hovered project
  useEffect(() => {
    const s = sceneRef.current;
    if (!s) return;
    s.targetQ = getFocusQuaternion({
      selectedUniversity,
      hoveredProject,
      focusMarker,
      focusTargetYOffset,
    });
  }, [focusMarker, focusTargetYOffset, selectedUniversity, hoveredProject]);

  // Initialize Three.js scene (ONCE)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Setup Scene
    const scene = new THREE.Scene();
    // Removed scene.background to allow transparency
    
    const cw = container.offsetWidth;
    const ch = container.offsetHeight;
    const camera = new THREE.PerspectiveCamera(45, cw / ch, 1, 1000);
    camera.position.set(0, cameraYRef.current, 280);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    // Set buffer size but DO NOT update style (handled by CSS to prevent flicker)
    renderer.setSize(cw, ch, false);
    
    const el = renderer.domElement;
    el.style.width = "100%";
    el.style.height = "100%";
    el.style.outline = "none";
    container.appendChild(el);

    const globe = new THREE.Group();
    scene.add(globe);

    const markersGroup = new THREE.Group();
    globe.add(markersGroup);

    // Initial rotation state
    const initialTargetQ = getFocusQuaternion({
      selectedUniversity: selectedUniversityRef.current,
      hoveredProject: hoveredProjectRef.current,
      focusMarker: focusMarkerRef.current,
      focusTargetYOffset: focusTargetYOffsetRef.current,
    });
    const rot = initialTargetQ?.clone() ?? createDefaultRotationQuaternion();
    const autoAxis = new THREE.Vector3(0, 1, 0);
    const autoQ = new THREE.Quaternion();

    // Store in ref
    sceneRef.current = {
      scene,
      camera,
      renderer,
      globe,
      markersGroup,
      rot,
      targetQ: initialTargetQ,
      autoQ,
      drag: { active: false, x: 0, y: 0 },
    };

    // 2. Build Globe Geometry (Static)
    // White sphere (occludes back-facing lines)
    globe.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(R, 64, 64),
        new THREE.MeshBasicMaterial({
          color: 0xffffff,
          polygonOffset: true,
          polygonOffsetFactor: 1,
          polygonOffsetUnits: 1,
        })
      )
    );

    // Country borders
    fetch(COUNTRIES_URL)
      .then((r) => r.json())
      .then((topo) => {
        const toFeature = feature as unknown as (
          topology: unknown,
          object: unknown
        ) => unknown;
        const countries = toFeature(
          topo,
          (topo as { objects: { countries: unknown } }).objects.countries
        ) as GlobeCountriesFeatureCollection | GlobeCountriesFeature;
        const pts: number[] = [];
        const lR = R + 0.5;

        const processRing = (coords: number[][]) => {
          for (let i = 0; i < coords.length - 1; i++) {
            const [lng1, lat1] = coords[i];
            const [lng2, lat2] = coords[i + 1];
            const a = toVec3(lat1, lng1, lR);
            const b = toVec3(lat2, lng2, lR);
            pts.push(a.x, a.y, a.z, b.x, b.y, b.z);
          }
        };

        const processGeom = (geom: GlobeCountryGeometry) => {
          if (geom.type === "MultiPolygon") {
            for (const poly of geom.coordinates) for (const ring of poly) processRing(ring);
          } else if (geom.type === "Polygon") {
            for (const ring of geom.coordinates) processRing(ring);
          }
        };

        if (countries.type === "FeatureCollection") {
          for (const f of countries.features) processGeom(f.geometry);
        } else if (countries.type === "Feature") {
          processGeom(countries.geometry);
        }

        if (pts.length > 0) {
          const geom = new THREE.BufferGeometry();
          geom.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
          globe.add(
            new THREE.LineSegments(
              geom,
              new THREE.LineBasicMaterial({ color: 0x000000 })
            )
          );
        }
      })
      .catch(() => {});

    // 3. Resize Observer
    const resizeObserver = new ResizeObserver(() => {
      if (!container || !renderer || !camera) return;
      const nw = container.offsetWidth;
      const nh = container.offsetHeight;
      if (nw === 0 || nh === 0) return;
      
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh, false);
      
      // Force render immediately to prevent flickering/blank frames during resize
      if (sceneRef.current) {
        renderer.render(sceneRef.current.scene, camera);
      }
    });
    resizeObserver.observe(container);

    // 4. Interaction Handlers
    
    const onDown = (e: PointerEvent) => {
      if (
        disableDragRef.current ||
        (compactRef.current && !allowDragInCompactRef.current) ||
        !sceneRef.current
      ) {
        return;
      }
      sceneRef.current.drag = { active: true, x: e.clientX, y: e.clientY };
      el.style.cursor = "grabbing";
    };
    
    const onUp = () => {
      if (!sceneRef.current) return;
      sceneRef.current.drag.active = false;
      if (
        !disableDragRef.current &&
        (!compactRef.current || allowDragInCompactRef.current)
      ) {
        el.style.cursor = "grab";
      } else {
        el.style.cursor = "default";
      }
    };

    const onMove = (e: PointerEvent) => {
      const s = sceneRef.current;
      if (
        !s ||
        disableDragRef.current ||
        (compactRef.current && !allowDragInCompactRef.current)
      ) {
        return;
      }
      
      if (s.drag.active) {
        const dx = e.clientX - s.drag.x;
        const dy = e.clientY - s.drag.y;
        s.drag.x = e.clientX;
        s.drag.y = e.clientY;
        
        const qY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), dx * 0.005);
        const qX = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), dy * 0.005);
        
        s.rot.premultiply(qY).premultiply(qX);
        s.targetQ = null;
      }
    };

    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointermove", onMove);

    // 5. Animation Loop
    const _tempVec = new THREE.Vector3();
    const _projVec = new THREE.Vector3();
    const _autoAxisVec = new THREE.Vector3();

    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      const s = sceneRef.current;
      if (!s || !s.renderer) return;

      // Skip render if canvas has no size (prevents white flash/glitches during layout changes)
      const canvas = s.renderer.domElement;
      if (canvas.width === 0 || canvas.height === 0) return;

      const isCompact = compactRef.current;
      const currentUniversities = universitiesRef.current;
      const autoRotateDisabled = disableAutoRotateRef.current;

      // Rotation logic
      const canDrag =
        !disableDragRef.current &&
        (!isCompact || allowDragInCompactRef.current);
      if (canDrag && s.drag.active) {
        // Drag handled in onMove — skip auto-rotate
      } else if (s.targetQ) {
        s.rot.slerp(s.targetQ, autoRotateDisabled ? 0.08 : 0.05);
      } else if (!autoRotateDisabled) {
        // Auto-rotate
        const speed = isCompact ? 0.0015 : 0.001;
        if (isCompact) {
          // Steady Y-axis spin + gentle tilt oscillation to center each continent
          s.autoQ.setFromAxisAngle(autoAxis, speed);
          s.rot.premultiply(s.autoQ);
          // Slow latitude rock (~120s period) so different latitudes get centered
          const tiltAngle = Math.sin(performance.now() * 0.00005) * 0.0004;
          _autoAxisVec.set(1, 0, 0);
          s.autoQ.setFromAxisAngle(_autoAxisVec, tiltAngle);
          s.rot.premultiply(s.autoQ);
        } else {
          s.autoQ.setFromAxisAngle(autoAxis, speed);
          s.rot.premultiply(s.autoQ);
        }
      }

      // Dynamic scale logic
      const targetScale = scaleRef.current ?? (isCompact ? 1.0 : 1.15);
      const currentScale = s.globe.scale.x;
      const newScale = currentScale + (targetScale - currentScale) * 0.02;
      s.globe.scale.setScalar(newScale);

      const nextCameraY =
        s.camera.position.y + (cameraYRef.current - s.camera.position.y) * 0.08;
      if (Math.abs(nextCameraY - s.camera.position.y) > 0.001) {
        s.camera.position.y = nextCameraY;
        s.camera.updateProjectionMatrix();
      }

      s.globe.quaternion.copy(s.rot);
      s.renderer.render(s.scene, s.camera);

      // Label positioning with collision avoidance
      const visible: { idx: number; x: number; y: number; w: number; h: number; opacity: number }[] = [];

      for (let i = 0; i < currentUniversities.length; i++) {
        const label = labelsRef.current[i];
        if (!label) continue;

        const uni = currentUniversities[i];
        if (!uni) continue;

        // Solo mode: only show the specified university's label
        const solo = soloLabelIdRef.current;

        // In non-compact mode, hide all labels unless this is the solo label
        if (!isCompact && !(solo && uni.id === solo)) {
          label.style.opacity = "0";
          continue;
        }

        if (solo && uni.id !== solo) {
          label.style.opacity = "0";
          continue;
        }

        const phi = (90 - uni.lat) * (Math.PI / 180);
        const theta = (uni.lng + 180) * (Math.PI / 180);
        const r = R + 3;

        _tempVec.set(
            -r * Math.sin(phi) * Math.cos(theta),
            r * Math.cos(phi),
            r * Math.sin(phi) * Math.sin(theta)
          )
          .applyQuaternion(s.globe.quaternion);

        if (_tempVec.z < LABEL_Z_THRESHOLD) {
          label.style.opacity = "0";
          continue;
        }

        _projVec.copy(_tempVec).project(s.camera);
        const canvasW = s.renderer.domElement.width / s.renderer.getPixelRatio();
        const canvasH = s.renderer.domElement.height / s.renderer.getPixelRatio();

        const x = (_projVec.x * 0.5 + 0.5) * canvasW;
        const y = (-_projVec.y * 0.5 + 0.5) * canvasH;

        const frontFacing = _tempVec.z / R;
        const opacity = Math.min(1, Math.max(0, (frontFacing - 0.15) * 2.5));

        visible.push({ idx: i, x, y, w: label.offsetWidth || 36, h: label.offsetHeight || 36, opacity });
      }

      // Limit to most front-facing labels
      visible.sort((a, b) => b.opacity - a.opacity);
      const MAX_LABELS = maxLabelsRef.current ?? 8;
      if (visible.length > MAX_LABELS) {
        for (const v of visible.slice(MAX_LABELS)) {
          const label = labelsRef.current[v.idx];
          if (label) label.style.opacity = "0";
        }
        visible.length = MAX_LABELS;
      }

      // Full collision resolution
      const PAD = 14;
      for (let iter = 0; iter < 8; iter++) {
        for (let i = 0; i < visible.length; i++) {
          for (let j = i + 1; j < visible.length; j++) {
            const a = visible[i], b = visible[j];
            const dx = b.x - a.x;
            const dy = (b.y - b.h / 2) - (a.y - a.h / 2);
            const overlapX = (a.w / 2 + b.w / 2 + PAD) - Math.abs(dx);
            const overlapY = (a.h / 2 + b.h / 2 + PAD) - Math.abs(dy);
            if (overlapX > 0 && overlapY > 0) {
              if (overlapX < overlapY) {
                const push = overlapX * 0.5;
                const sign = dx >= 0 ? 1 : -1;
                a.x -= sign * push;
                b.x += sign * push;
              } else {
                const push = overlapY * 0.5;
                const sign = dy >= 0 ? 1 : -1;
                a.y -= sign * push;
                b.y += sign * push;
              }
            }
          }
        }
      }

      // Apply resolved positions
      const nowVisible = new Set<number>();
      for (const v of visible) {
        const label = labelsRef.current[v.idx];
        if (!label) continue;
        nowVisible.add(v.idx);

        const newlyAppearing = !prevVisibleRef.current.has(v.idx);
        if (newlyAppearing && labelsReadyRef.current) {
          // Snap position without transition, keep opacity transition
          label.style.transition = 'opacity 400ms ease-out';
          label.style.transform = `translate(${v.x}px, ${v.y}px) translate(-50%, -100%)`;
          label.getBoundingClientRect(); // force reflow so snap applies
          label.style.transition = 'transform 800ms ease-out, opacity 400ms ease-out';
        } else {
          label.style.transform = `translate(${v.x}px, ${v.y}px) translate(-50%, -100%)`;
        }
        label.style.opacity = String(v.opacity);
      }
      prevVisibleRef.current = nowVisible;

      // After first positioning, enable smooth transform transitions
      if (!labelsReadyRef.current && visible.length > 0) {
        labelsReadyRef.current = true;
        requestAnimationFrame(() => {
          for (const label of labelsRef.current) {
            if (label) {
              label.style.transition = 'transform 800ms ease-out, opacity 400ms ease-out';
            }
          }
        });
      }

      // Project label positioning
      for (let i = 0; i < projectLabelsRef.current.length; i++) {
        const label = projectLabelsRef.current[i];
        if (!label) continue;

        if (hideProjectLabelsRef.current) {
          label.style.opacity = "0";
          continue;
        }

        const projects = focusMarkerRef.current
          ? [focusMarkerRef.current]
          : selectedUniversityRef.current?.projects;
        if (!projects || !projects[i]) {
          label.style.opacity = "0";
          continue;
        }

        const project = projects[i];
        const { lat, lng } = project.markerOffset;

        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lng + 180) * (Math.PI / 180);
        const r = R + 3;

        _tempVec.set(
          -r * Math.sin(phi) * Math.cos(theta),
          r * Math.cos(phi),
          r * Math.sin(phi) * Math.sin(theta)
        ).applyQuaternion(s.globe.quaternion);

        if (_tempVec.z < LABEL_Z_THRESHOLD) {
          label.style.opacity = "0";
          continue;
        }

        _projVec.copy(_tempVec).project(s.camera);
        const canvasW2 = s.renderer.domElement.width / s.renderer.getPixelRatio();
        const canvasH2 = s.renderer.domElement.height / s.renderer.getPixelRatio();

        const px = (_projVec.x * 0.5 + 0.5) * canvasW2;
        const py = (-_projVec.y * 0.5 + 0.5) * canvasH2;
        const isFocusMarkerLabel = Boolean(focusMarkerRef.current);
        const labelY = isFocusMarkerLabel ? py + 5 : py;

        const frontFacing = _tempVec.z / R;
        const opacity = Math.min(1, Math.max(0, (frontFacing - 0.15) * 2.5));

        label.style.transform = `translate(${px}px, ${labelY}px) translate(-50%, ${
          isFocusMarkerLabel ? "0%" : "-100%"
        })`;
        label.style.opacity = String(opacity);
      }
    };
    animate();

    return () => {
      cancelAnimationFrame(frameRef.current);
      resizeObserver.disconnect();
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointermove", onMove);
      
      // Dispose logic
      if (container.contains(el)) container.removeChild(el);
      renderer.dispose();
      sceneRef.current = null;
    };
  }, []); // Empty dependency array = mount once

  // Update Markers when universities or selection change
  useEffect(() => {
    const s = sceneRef.current;
    if (!s) return;

    // Clear old markers
    while(s.markersGroup.children.length > 0){
        const child = s.markersGroup.children[0];
        disposeMarkerNode(child);
        s.markersGroup.remove(child);
    }

    // University markers — only show selected if one is selected, otherwise show all
    if (selectedUniversity && !hideSelectedUniversityMarkerRef.current) {
      const m = createMarkerNode({ color: 0x101010, radius: 1.8 });
      m.position.copy(toVec3(selectedUniversity.lat, selectedUniversity.lng, R + 1));
      s.markersGroup.add(m);
    } else {
      universities.forEach(uni => {
        const m = createMarkerNode({ color: 0x101010, radius: 1.8 });
        m.position.copy(toVec3(uni.lat, uni.lng, R + 1));
        s.markersGroup.add(m);
      });
    }

    const focusedProjectMarker = focusMarkerRef.current;
    if (focusedProjectMarker) {
      const focusMesh = createMarkerNode({
        color:
          focusedProjectMarker.color ??
          selectedUniversity?.color ??
          "#000000",
        radius: 1.7,
      });
      focusMesh.position.copy(
        toVec3(
          focusedProjectMarker.markerOffset.lat,
          focusedProjectMarker.markerOffset.lng,
          R + 1
        )
      );
      s.markersGroup.add(focusMesh);
      return;
    }

    // Project markers for selected university
    if (selectedUniversity) {
      selectedUniversity.projects.forEach(project => {
        const { lat, lng } = project.markerOffset;
        // Skip if project is at the same location as the university
        if (Math.abs(lat - selectedUniversity.lat) < 0.01 && Math.abs(lng - selectedUniversity.lng) < 0.01) return;
        const m = createMarkerNode({ color: selectedUniversity.color, radius: 1.4 });
        m.position.copy(toVec3(lat, lng, R + 1));
        s.markersGroup.add(m);
      });
    }

  }, [universities, selectedUniversity]);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
      style={{
        touchAction: "none",
        transform: verticalOffset ? `translateY(${verticalOffset}px)` : undefined,
      }}
    >
      <div className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${hideLabels ? "opacity-0" : ""}`}>
        {universities.map((uni, i) => (
          <div
            key={uni.id}
            ref={(el) => {
              labelsRef.current[i] = el;
            }}
            className="absolute left-0 top-0 will-change-[transform,opacity] whitespace-nowrap transition-opacity duration-300 ease-out"
            style={{ opacity: 0 }}
          >
            {uni.logo ? (
              <img
                src={uni.logo}
                alt={uni.shortName}
                width={36}
                height={36}
                style={{ objectFit: "contain", display: "block" }}
                draggable={false}
              />
            ) : (
              <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-black">
                {uni.shortName}
              </span>
            )}
          </div>
        ))}
      </div>
      {/* Project location labels */}
      <div className="absolute inset-0 pointer-events-none">
        {(focusMarker ? [focusMarker] : selectedUniversity?.projects ?? []).map((project, i) => {
          const projectLabel =
            "label" in project && typeof project.label === "string"
              ? project.label
              : project.title;
          const isFocusMarkerLabel = Boolean(focusMarker);

          return (
            <div
              key={project.id}
              ref={(el) => {
                projectLabelsRef.current[i] = el;
              }}
              className="absolute left-0 top-0 will-change-[transform,opacity] whitespace-nowrap"
              style={{
                opacity: 0,
                transition: isFocusMarkerLabel
                  ? "opacity 400ms ease-out"
                  : "transform 800ms ease-out, opacity 400ms ease-out",
              }}
            >
              <span
                className={
                  isFocusMarkerLabel
                    ? "px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white"
                    : "rounded-sm px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.08em]"
                }
                style={{
                  color: isFocusMarkerLabel
                    ? "#ffffff"
                    : focusMarker?.color ?? selectedUniversity?.color ?? "#000",
                  backgroundColor: isFocusMarkerLabel
                    ? "rgba(0, 0, 0, 0.88)"
                    : "rgba(255,255,255,0.85)",
                  border: isFocusMarkerLabel
                    ? "none"
                    : `1px solid ${focusMarker?.color ?? selectedUniversity?.color ?? "#000"}`,
                }}
              >
                {projectLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
