"use client";

import { useRef, useEffect } from "react";
import * as THREE from "three";
import { feature } from "topojson-client";
import { University } from "@/types";

const R = 70;
const LABEL_Z_THRESHOLD = 10;
const COUNTRIES_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

function toVec3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

interface GlobeProps {
  universities: University[];
  selectedUniversity: University | null;
  onSelectUniversity: (uni: University | null) => void;
  hoveredProject: string | null;
  compact?: boolean;
}

export default function Globe({
  universities,
  selectedUniversity,
  compact = false,
}: GlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<(HTMLDivElement | null)[]>([]);

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
  const universitiesRef = useRef(universities);
  const labelsReadyRef = useRef(false);
  const prevVisibleRef = useRef<Set<number>>(new Set());

  // Keep refs in sync
  useEffect(() => {
    compactRef.current = compact;
    universitiesRef.current = universities;
    
    const s = sceneRef.current;
    if (s && s.renderer) {
      if (compact) {
        s.targetQ = null;
        s.drag.active = false;
        s.renderer.domElement.style.cursor = "default";
      } else {
        s.renderer.domElement.style.cursor = "grab";
      }
    }
  }, [compact, universities]);

  // Focus on selected university
  useEffect(() => {
    const s = sceneRef.current;
    if (!s) return;

    if (!selectedUniversity) {
      s.targetQ = null;
      return;
    }

    const pointDir = toVec3(
      selectedUniversity.lat,
      selectedUniversity.lng,
      1
    ).normalize();
    const front = new THREE.Vector3(0, 0, 1);
    s.targetQ = new THREE.Quaternion().setFromUnitVectors(pointDir, front);
  }, [selectedUniversity]);

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
    camera.position.z = 280;

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
    const rot = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(0.3, 0, 0, "YXZ")
    );
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
      targetQ: null,
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const countries = feature(topo as any, (topo as any).objects.countries) as any;
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

        const processGeom = (geom: any) => {
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
      if (compactRef.current || !sceneRef.current) return;
      sceneRef.current.drag = { active: true, x: e.clientX, y: e.clientY };
      el.style.cursor = "grabbing";
    };
    
    const onUp = () => {
      if (!sceneRef.current) return;
      sceneRef.current.drag.active = false;
      if (!compactRef.current) el.style.cursor = "grab";
    };

    const onMove = (e: PointerEvent) => {
      const s = sceneRef.current;
      if (!s || compactRef.current) return;
      
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

      // Rotation logic
      if (!isCompact && s.drag.active) {
        // Drag handled in onMove
      } else if (!isCompact && s.targetQ) {
        s.rot.slerp(s.targetQ, 0.05);
      } else {
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
      const targetScale = isCompact ? 1.0 : 1.15;
      const currentScale = s.globe.scale.x;
      const newScale = currentScale + (targetScale - currentScale) * 0.02;
      s.globe.scale.setScalar(newScale);

      s.globe.quaternion.copy(s.rot);
      s.renderer.render(s.scene, s.camera);

      // Label positioning with collision avoidance
      const visible: { idx: number; x: number; y: number; w: number; h: number; opacity: number }[] = [];

      for (let i = 0; i < currentUniversities.length; i++) {
        const label = labelsRef.current[i];
        if (!label) continue;

        if (!isCompact) {
          label.style.opacity = "0";
          continue;
        }

        const uni = currentUniversities[i];
        if (!uni) continue;

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
          label.style.transition = 'opacity 300ms ease-out';
          label.style.transform = `translate(${v.x}px, ${v.y}px) translate(-50%, -100%)`;
          label.getBoundingClientRect(); // force reflow so snap applies
          label.style.transition = 'transform 300ms ease-out, opacity 300ms ease-out';
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
              label.style.transition = 'transform 300ms ease-out, opacity 300ms ease-out';
            }
          }
        });
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

  // Update Markers when universities change
  useEffect(() => {
    const s = sceneRef.current;
    if (!s) return;

    // Clear old markers
    while(s.markersGroup.children.length > 0){ 
        const child = s.markersGroup.children[0];
        if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) {
                child.material.forEach(m => m.dispose());
            } else {
                child.material.dispose();
            }
        }
        s.markersGroup.remove(child); 
    }

    // Add new markers
    const mkGeo = new THREE.SphereGeometry(1.8, 12, 12);
    const mkMat = new THREE.MeshBasicMaterial({ color: 0x000000 });

    universities.forEach(uni => {
      const m = new THREE.Mesh(mkGeo, mkMat);
      m.position.copy(toVec3(uni.lat, uni.lng, R + 1));
      s.markersGroup.add(m);
    });

  }, [universities]);

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
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
    </div>
  );
}
