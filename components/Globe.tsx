"use client";

import { useRef, useEffect } from "react";
import * as THREE from "three";
import { feature } from "topojson-client";
import { University } from "@/types";

const R = 100;
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
}

export default function Globe({
  universities,
  selectedUniversity,
}: GlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rotRef = useRef(
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0.3, 0, 0, "YXZ"))
  );
  const targetQRef = useRef<THREE.Quaternion | null>(null);
  const dragRef = useRef({ active: false, x: 0, y: 0 });
  const frameRef = useRef(0);

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

    // Animation loop
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);

      const target = targetQRef.current;
      if (dragRef.current.active) {
        // dragging
      } else if (target) {
        rotRef.current.slerp(target, 0.05);
      } else {
        const autoQ = new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 1, 0),
          0.001
        );
        rotRef.current.premultiply(autoQ);
      }

      globe.quaternion.copy(rotRef.current);
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
      dragRef.current = { active: true, x: e.clientX, y: e.clientY };
      el.style.cursor = "grabbing";
    };
    const onUp = () => {
      dragRef.current.active = false;
      el.style.cursor = "grab";
    };
    const onMove = (e: PointerEvent) => {
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
