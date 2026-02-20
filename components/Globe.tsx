"use client";

import { useRef, useEffect } from "react";
import * as THREE from "three";
import { feature } from "topojson-client";
import { University } from "@/types";

const R = 100;
const LAND_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json";

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
}

export default function Globe({ universities, selectedUniversity }: GlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const phiRef = useRef(0);
  const thetaRef = useRef(0.3);
  const focusRef = useRef<{ phi: number; theta: number } | null>(null);
  const dragRef = useRef({ active: false, x: 0 });
  const frameRef = useRef(0);

  // Focus on selected university
  useEffect(() => {
    if (!selectedUniversity) {
      focusRef.current = null;
      return;
    }

    const targetPhi = -(selectedUniversity.lng + 90) * (Math.PI / 180);
    const targetTheta = selectedUniversity.lat * (Math.PI / 180);

    let bestPhi = targetPhi;
    for (let offset = -4; offset <= 4; offset++) {
      const candidate = targetPhi + offset * 2 * Math.PI;
      if (
        Math.abs(candidate - phiRef.current) <
        Math.abs(bestPhi - phiRef.current)
      ) {
        bestPhi = candidate;
      }
    }

    focusRef.current = { phi: bestPhi, theta: targetTheta };
  }, [selectedUniversity]);

  // Three.js scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const w = container.offsetWidth;
    const h = container.offsetHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    const camera = new THREE.PerspectiveCamera(45, w / h, 1, 1000);
    camera.position.z = 280;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    container.appendChild(renderer.domElement);

    const el = renderer.domElement;
    el.style.opacity = "0";
    el.style.transition = "opacity 0.8s ease";
    el.style.cursor = "grab";
    requestAnimationFrame(() => {
      el.style.opacity = "1";
    });

    // Globe group — all content rotates together
    const globe = new THREE.Group();
    globe.rotation.order = "YXZ";
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

    // Graticule — light gray grid lines (#D4D4D4)
    const gPts: number[] = [];
    const gR = R + 0.3;
    for (let lng = -180; lng < 180; lng += 30) {
      for (let lat = -90; lat < 90; lat += 2) {
        const a = toVec3(lat, lng, gR);
        const b = toVec3(lat + 2, lng, gR);
        gPts.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    }
    for (let lat = -60; lat <= 60; lat += 30) {
      for (let lng = -180; lng < 180; lng += 2) {
        const a = toVec3(lat, lng, gR);
        const b = toVec3(lat, lng + 2, gR);
        gPts.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    }
    const gratGeom = new THREE.BufferGeometry();
    gratGeom.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(gPts, 3)
    );
    globe.add(
      new THREE.LineSegments(
        gratGeom,
        new THREE.LineBasicMaterial({ color: 0xd4d4d4 })
      )
    );

    // Continent outlines — black lines from TopoJSON
    fetch(LAND_URL)
      .then((r) => r.json())
      .then((topo) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const land = feature(topo as any, (topo as any).objects.land) as any;
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

        if (land.type === "FeatureCollection") {
          for (const f of land.features) processGeom(f.geometry);
        } else if (land.type === "Feature") {
          processGeom(land.geometry);
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
      .catch(() => {
        /* globe renders without continents if fetch fails */
      });

    // University markers — small black spheres
    const mkGeo = new THREE.SphereGeometry(1.5, 12, 12);
    const mkMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    for (const uni of universities) {
      const m = new THREE.Mesh(mkGeo, mkMat);
      m.position.copy(toVec3(uni.lat, uni.lng, R + 1));
      globe.add(m);
    }

    // Animation loop
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);

      const focus = focusRef.current;
      if (dragRef.current.active) {
        // dragging — don't override
      } else if (focus) {
        phiRef.current += (focus.phi - phiRef.current) * 0.05;
        thetaRef.current += (focus.theta - thetaRef.current) * 0.05;
      } else {
        phiRef.current += 0.003;
        thetaRef.current += (0.3 - thetaRef.current) * 0.05;
      }

      globe.rotation.y = phiRef.current;
      globe.rotation.x = thetaRef.current;
      renderer.render(scene, camera);
    };
    animate();

    // Resize
    const onResize = () => {
      const nw = container.offsetWidth;
      const nh = container.offsetHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener("resize", onResize);

    // Drag interaction
    const onDown = (e: PointerEvent) => {
      dragRef.current = { active: true, x: e.clientX };
      el.style.cursor = "grabbing";
    };
    const onUp = () => {
      dragRef.current.active = false;
      el.style.cursor = "grab";
    };
    const onMove = (e: PointerEvent) => {
      if (dragRef.current.active) {
        const dx = e.clientX - dragRef.current.x;
        dragRef.current.x = e.clientX;
        phiRef.current -= dx * 0.005;
        focusRef.current = null;
      }
    };
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointermove", onMove);

    // Cleanup
    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", onResize);
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

  return <div ref={containerRef} className="w-full h-full" />;
}
