"use client";

import { useRef, useEffect } from "react";
import * as THREE from "three";
import { feature } from "topojson-client";
import { University } from "@/types";

const R = 100;
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
  const rotRef = useRef(
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0.3, 0, 0, "YXZ"))
  );
  const targetQRef = useRef<THREE.Quaternion | null>(null);
  const dragRef = useRef({ active: false, x: 0, y: 0 });
  const frameRef = useRef(0);
  const compactRef = useRef(compact);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Keep compactRef in sync
  useEffect(() => {
    compactRef.current = compact;
    if (compact) {
      targetQRef.current = null;
      dragRef.current.active = false;
      if (canvasRef.current) canvasRef.current.style.cursor = "default";
    } else {
      if (canvasRef.current) canvasRef.current.style.cursor = "grab";
    }
  }, [compact]);

  // Focus on selected university
  useEffect(() => {
    if (!selectedUniversity) {
      targetQRef.current = null;
      return;
    }

    const pointDir = toVec3(
      selectedUniversity.lat,
      selectedUniversity.lng,
      1
    ).normalize();
    const front = new THREE.Vector3(0, 0, 1);
    targetQRef.current = new THREE.Quaternion().setFromUnitVectors(
      pointDir,
      front
    );
  }, [selectedUniversity]);

  // Three.js scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Cached container dimensions — updated by ResizeObserver
    let cw = container.offsetWidth;
    let ch = container.offsetHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    const camera = new THREE.PerspectiveCamera(45, cw / ch, 1, 1000);
    camera.position.z = 280;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(cw, ch);
    container.appendChild(renderer.domElement);

    const el = renderer.domElement;
    canvasRef.current = el;
    el.style.opacity = "0";
    el.style.transition = "opacity 0.8s ease";
    el.style.cursor = compactRef.current ? "default" : "grab";
    requestAnimationFrame(() => {
      el.style.opacity = "1";
    });

    // Globe group
    const globe = new THREE.Group();
    scene.add(globe);

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

    // Country borders from TopoJSON
    fetch(COUNTRIES_URL)
      .then((r) => r.json())
      .then((topo) => {
        const lR = R + 0.5;
        const pts: number[] = [];

        const processRing = (coords: number[][]) => {
          for (let i = 0; i < coords.length - 1; i++) {
            const [lng1, lat1] = coords[i];
            const [lng2, lat2] = coords[i + 1];
            const a = toVec3(lat1, lng1, lR);
            const b = toVec3(lat2, lng2, lR);
            pts.push(a.x, a.y, a.z, b.x, b.y, b.z);
          }
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const processGeom = (geom: any) => {
          if (geom.type === "MultiPolygon") {
            for (const poly of geom.coordinates)
              for (const ring of poly) processRing(ring);
          } else if (geom.type === "Polygon") {
            for (const ring of geom.coordinates) processRing(ring);
          }
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const countries = feature(
          topo as any,
          (topo as any).objects.countries
        ) as any;
        if (countries.type === "FeatureCollection") {
          for (const f of countries.features) processGeom(f.geometry);
        } else if (countries.type === "Feature") {
          processGeom(countries.geometry);
        }

        if (pts.length > 0) {
          const geom = new THREE.BufferGeometry();
          geom.setAttribute(
            "position",
            new THREE.Float32BufferAttribute(pts, 3)
          );
          globe.add(
            new THREE.LineSegments(
              geom,
              new THREE.LineBasicMaterial({ color: 0x000000 })
            )
          );
        }
      })
      .catch(() => {});

    // University markers
    const mkGeo = new THREE.SphereGeometry(1.8, 12, 12);
    const mkMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    for (const uni of universities) {
      const m = new THREE.Mesh(mkGeo, mkMat);
      m.position.copy(toVec3(uni.lat, uni.lng, R + 1));
      globe.add(m);
    }

    // Reusable temp objects for animation loop (avoid per-frame allocations)
    const _autoAxis = new THREE.Vector3(0, 1, 0);
    const _autoQ = new THREE.Quaternion();
    const _tempVec = new THREE.Vector3();
    const _projVec = new THREE.Vector3();

    // Animation loop
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);

      const isCompact = compactRef.current;
      const target = targetQRef.current;

      if (!isCompact && dragRef.current.active) {
        // dragging — rotation handled in pointermove
      } else if (!isCompact && target) {
        rotRef.current.slerp(target, 0.05);
      } else {
        // Auto-rotate (slightly faster when compact)
        const speed = isCompact ? 0.0015 : 0.001;
        _autoQ.setFromAxisAngle(_autoAxis, speed);
        rotRef.current.premultiply(_autoQ);
      }

      globe.quaternion.copy(rotRef.current);
      renderer.render(scene, camera);

      // Update label positions (compact mode only)
      for (let i = 0; i < universities.length; i++) {
        const label = labelsRef.current[i];
        if (!label) continue;

        if (!isCompact) {
          label.style.opacity = "0";
          continue;
        }

        // Get marker world position after globe rotation
        const uni = universities[i];
        const phi = (90 - uni.lat) * (Math.PI / 180);
        const theta = (uni.lng + 180) * (Math.PI / 180);
        const r = R + 3;
        _tempVec
          .set(
            -r * Math.sin(phi) * Math.cos(theta),
            r * Math.cos(phi),
            r * Math.sin(phi) * Math.sin(theta)
          )
          .applyQuaternion(globe.quaternion);

        // Front-facing check: positive z means facing camera
        if (_tempVec.z < LABEL_Z_THRESHOLD) {
          label.style.opacity = "0";
          continue;
        }

        // Project to screen coordinates
        _projVec.copy(_tempVec).project(camera);
        const x = (_projVec.x * 0.5 + 0.5) * cw;
        const y = (-_projVec.y * 0.5 + 0.5) * ch;

        // Opacity based on how front-facing the marker is
        const frontFacing = _tempVec.z / R;
        const opacity = Math.min(1, Math.max(0, frontFacing * 1.2 - 0.2));

        label.style.opacity = String(opacity);
        label.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
      }
    };
    animate();

    // ResizeObserver for container-based resizing (caches dimensions)
    const resizeObserver = new ResizeObserver(() => {
      const nw = container.offsetWidth;
      const nh = container.offsetHeight;
      if (nw === 0 || nh === 0) return;
      cw = nw;
      ch = nh;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    });
    resizeObserver.observe(container);

    // Drag interaction
    const onDown = (e: PointerEvent) => {
      if (compactRef.current) return;
      dragRef.current = { active: true, x: e.clientX, y: e.clientY };
      el.style.cursor = "grabbing";
    };
    const onUp = () => {
      if (compactRef.current) return;
      dragRef.current.active = false;
      el.style.cursor = "grab";
    };
    const onMove = (e: PointerEvent) => {
      if (compactRef.current) return;
      if (dragRef.current.active) {
        const dx = e.clientX - dragRef.current.x;
        const dy = e.clientY - dragRef.current.y;
        dragRef.current.x = e.clientX;
        dragRef.current.y = e.clientY;
        const qY = new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 1, 0),
          dx * 0.005
        );
        const qX = new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(1, 0, 0),
          dy * 0.005
        );
        rotRef.current.premultiply(qY).premultiply(qX);
        targetQRef.current = null;
      }
    };
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointermove", onMove);

    return () => {
      cancelAnimationFrame(frameRef.current);
      resizeObserver.disconnect();
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointermove", onMove);
      globe.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments) {
          obj.geometry.dispose();
          if (obj.material instanceof THREE.Material) obj.material.dispose();
        }
      });
      renderer.dispose();
      if (container.contains(el)) container.removeChild(el);
    };
  }, [universities]);

  return (
    <div ref={containerRef} className="w-full h-full relative">
      {/* Three.js canvas appended here by useEffect */}

      {/* University labels overlay (compact mode) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {universities.map((uni, i) => (
          <div
            key={uni.id}
            ref={(el) => {
              labelsRef.current[i] = el;
            }}
            className="absolute left-0 top-0 text-[9px] font-bold uppercase tracking-[0.1em] text-black whitespace-nowrap will-change-[transform,opacity]"
            style={{ opacity: 0 }}
          >
            {uni.shortName}
          </div>
        ))}
      </div>
    </div>
  );
}
