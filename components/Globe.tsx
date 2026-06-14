"use client";

import { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { feature } from "topojson-client";
import { getUniversityWorlds } from "@/lib/consortium";
import type { ProjectMarkerOffset, University } from "@/types";

const R = 70;
const LABEL_Z_THRESHOLD = 0;
// Constant idle rotation; only the latitude nod adapts to tour more logos.
const AUTO_ROTATION_SPEED = 0.001; // rad per 60fps frame around Y
const AUTO_COMPACT_ROTATION_SPEED = 0.0015; // rad per 60fps frame around Y
const AUTO_TILT_MAX = 1.32; // rad (~76°) max nod toward/away from camera
const AUTO_TILT_RATE = 0.00022; // rad per ms (~12.6°/s)
const AUTO_SWEET_SPOT_LAT = 38; // latitude that lands mid-dome when front-facing
const AUTO_FRONT_CENTER = 0; // deg from the camera-facing meridian
const AUTO_FRONT_SIGMA = 110;
const AUTO_SOUTH_BIAS_LAT = 35; // below this, tilt weighting increases
const AUTO_SOUTH_BIAS_STRENGTH = 5;
const AUTO_SCREEN_PULL_GAIN = 2.2; // rad per normalized viewport overflow
const AUTO_LABEL_VIEWPORT_MARGIN = 48;
const COUNTRIES_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const GLOBE_TEXTURE_WIDTH = 2048;
const GLOBE_TEXTURE_HEIGHT = 1024;
const UNIVERSITY_MARKER_RADIUS_PX = 4.3;
const SELECTED_UNIVERSITY_MARKER_RADIUS_PX = 4.55;
const PROJECT_MARKER_RADIUS_PX = 3.45;
const FOCUS_MARKER_RADIUS_PX = 4.2;
const MIN_MARKER_LOCAL_RADIUS = 0.28;
const MAX_MARKER_LOCAL_RADIUS = 1.22;
const MARKER_HOVER_SCALE = 1.28;
const MARKER_HOVER_HIT_RADIUS_PX = 16;
const MARKER_HOVER_HIT_RADIUS_MULTIPLIER = 3.7;
const MIN_LOGO_SIZE_PX = 30;
const MAX_LOGO_SIZE_PX = 58;
const LOGO_GLOBE_RADIUS_RATIO = 0.15;
const FALLBACK_LABEL_FONT_RATIO = 0.31;

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

function getFocusTargetVector(focusTargetYOffset: number) {
  return new THREE.Vector3(0, focusTargetYOffset, 1).normalize();
}

function createDefaultRotationQuaternion() {
  return new THREE.Quaternion().setFromEuler(
    new THREE.Euler(0.3, 0, 0, "YXZ")
  );
}

function projectLngLatToTexturePoint(
  lng: number,
  lat: number,
  width: number,
  height: number
) {
  return {
    x: ((lng + 180) / 360) * width,
    y: ((90 - lat) / 180) * height,
  };
}

function getUnwrappedTextureRing(
  coords: number[][],
  width: number,
  height: number
) {
  const points: Array<{ x: number; y: number }> = [];
  let prevX: number | null = null;

  for (const [lng, lat] of coords) {
    const point = projectLngLatToTexturePoint(lng, lat, width, height);
    let x = point.x;

    if (prevX !== null) {
      while (x - prevX > width / 2) x -= width;
      while (prevX - x > width / 2) x += width;
    }

    points.push({ x, y: point.y });
    prevX = x;
  }

  return points;
}

function addTextureRingPath(
  ctx: CanvasRenderingContext2D,
  coords: number[][],
  width: number,
  height: number,
  offsetX: number
) {
  const points = getUnwrappedTextureRing(coords, width, height);
  if (points.length < 2) return;

  ctx.moveTo(points[0].x + offsetX, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x + offsetX, points[i].y);
  }
  ctx.closePath();
}

function drawTexturePolygon(
  ctx: CanvasRenderingContext2D,
  rings: number[][][],
  width: number,
  height: number
) {
  for (const offsetX of [-width, 0, width]) {
    ctx.beginPath();
    for (const ring of rings) {
      addTextureRingPath(ctx, ring, width, height, offsetX);
    }
    ctx.fill("evenodd");
    ctx.stroke();
  }
}

function createGlobeTexture(
  countries: GlobeCountriesFeatureCollection | GlobeCountriesFeature
) {
  const width = GLOBE_TEXTURE_WIDTH;
  const height = GLOBE_TEXTURE_HEIGHT;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const ocean = ctx.createLinearGradient(0, 0, 0, height);
  ocean.addColorStop(0, "#b8edff");
  ocean.addColorStop(0.28, "#68c9f4");
  ocean.addColorStop(0.62, "#42aee7");
  ocean.addColorStop(1, "#2d91d2");
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
  ctx.lineWidth = 1;
  for (let lng = -150; lng <= 150; lng += 30) {
    const x = projectLngLatToTexturePoint(lng, 0, width, height).x;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    const y = projectLngLatToTexturePoint(0, lat, width, height).y;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.fillStyle = "#9ee172";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.52)";
  ctx.lineWidth = 1.25;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const drawGeometry = (geom: GlobeCountryGeometry) => {
    if (geom.type === "MultiPolygon") {
      for (const polygon of geom.coordinates) {
        drawTexturePolygon(ctx, polygon, width, height);
      }
      return;
    }

    for (const polygon of [geom.coordinates]) {
      drawTexturePolygon(ctx, polygon, width, height);
    }
  };

  if (countries.type === "FeatureCollection") {
    for (const country of countries.features) {
      drawGeometry(country.geometry);
    }
  } else {
    drawGeometry(countries.geometry);
  }
  ctx.restore();

  ctx.save();
  const equatorGlow = ctx.createLinearGradient(0, 0, 0, height);
  equatorGlow.addColorStop(0, "rgba(255, 255, 255, 0)");
  equatorGlow.addColorStop(0.5, "rgba(255, 244, 184, 0.18)");
  equatorGlow.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = equatorGlow;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

function createMarkerNode({
  color,
  pixelRadius,
  universityId,
  universityIndex,
}: {
  color: THREE.ColorRepresentation;
  pixelRadius: number;
  universityId?: string;
  universityIndex?: number;
}) {
  const group = new THREE.Group();
  group.userData.markerPixelRadius = pixelRadius;
  if (universityId) {
    group.userData.markerKind = "university";
    group.userData.universityId = universityId;
    group.userData.universityIndex = universityIndex ?? null;
  }

  const dot = new THREE.Mesh(
    new THREE.SphereGeometry(1, 18, 18),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(color) })
  );
  group.add(dot);

  return group;
}

function getResponsiveMarkerLocalRadius({
  camera,
  canvasHeight,
  globeScale,
  pixelRadius,
}: {
  camera: THREE.PerspectiveCamera;
  canvasHeight: number;
  globeScale: number;
  pixelRadius: number;
}) {
  if (canvasHeight <= 0 || globeScale <= 0) {
    return MIN_MARKER_LOCAL_RADIUS;
  }

  const fov = THREE.MathUtils.degToRad(camera.fov);
  const frontSurfaceDistance = Math.max(
    1,
    Math.hypot(
      camera.position.x,
      camera.position.y,
      camera.position.z - R * globeScale
    )
  );
  const worldUnits =
    (pixelRadius * 2 * Math.tan(fov / 2) * frontSurfaceDistance) /
    (canvasHeight * globeScale);

  return THREE.MathUtils.clamp(
    worldUnits,
    MIN_MARKER_LOCAL_RADIUS,
    MAX_MARKER_LOCAL_RADIUS
  );
}

function getResponsiveLogoSize(globeRadiusPx: number) {
  return Math.round(
    THREE.MathUtils.clamp(
      globeRadiusPx * LOGO_GLOBE_RADIUS_RATIO,
      MIN_LOGO_SIZE_PX,
      MAX_LOGO_SIZE_PX
    )
  );
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
  focusSpin = 0,
}: {
  selectedUniversity: University | null;
  hoveredProject: string | null;
  focusMarker: GlobeProps["focusMarker"];
  focusTargetYOffset: number;
  focusSpin?: number;
}) {
  const front = getFocusTargetVector(focusTargetYOffset);
  const withSpin = (quaternion: THREE.Quaternion) => {
    if (!focusSpin) return quaternion;

    return new THREE.Quaternion()
      .setFromAxisAngle(front, focusSpin)
      .multiply(quaternion);
  };

  if (focusMarker) {
    const pointDir = toVec3(
      focusMarker.markerOffset.lat,
      focusMarker.markerOffset.lng,
      1
    ).normalize();
    return withSpin(new THREE.Quaternion().setFromUnitVectors(pointDir, front));
  }

  if (hoveredProject && selectedUniversity) {
    const project = getUniversityWorlds(selectedUniversity).find(
      (candidate) => candidate.id === hoveredProject
    );
    if (project) {
      const pointDir = toVec3(
        project.markerOffset.lat,
        project.markerOffset.lng,
        1
      ).normalize();
      return withSpin(new THREE.Quaternion().setFromUnitVectors(pointDir, front));
    }
  }

  if (!selectedUniversity) {
    return null;
  }

  const pointDir = toVec3(selectedUniversity.lat, selectedUniversity.lng, 1).normalize();
  return withSpin(new THREE.Quaternion().setFromUnitVectors(pointDir, front));
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
  editableFocusMarker?: boolean;
  snapPose?: boolean;
}

export default function Globe({
  universities,
  selectedUniversity,
  onSelectUniversity,
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
  editableFocusMarker = false,
  snapPose = false,
}: GlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<(HTMLDivElement | null)[]>([]);
  const projectLabelsRef = useRef<(HTMLDivElement | null)[]>([]);
  const onSelectUniversityRef = useRef(onSelectUniversity);
  const editableFocusMarkerRef = useRef(editableFocusMarker);
  const editableFocusMarkerGroupRef = useRef<HTMLDivElement | null>(null);
  const editableMarkerOffsetRef = useRef<ProjectMarkerOffset | null>(
    focusMarker?.markerOffset ?? null
  );
  const [editableMarkerOffset, setEditableMarkerOffset] =
    useState<ProjectMarkerOffset | null>(focusMarker?.markerOffset ?? null);

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
    focusKey: string;
    focusSpin: number;
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
  const labelSmoothPosRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const projectLabelSmoothPosRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const hoveredLabelIdxRef = useRef<number | null>(null);
  const hoveredUniversityIdRef = useRef<string | null>(null);
  const upcomingLatSumRef = useRef(0);
  const upcomingWeightSumRef = useRef(0);
  const upcomingMinLatRef = useRef(90);
  const upcomingScreenPullRef = useRef(0);
  const autoTiltRef = useRef(0);

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
    editableFocusMarkerRef.current = editableFocusMarker;
    onSelectUniversityRef.current = onSelectUniversity;

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
    editableFocusMarker,
    onSelectUniversity,
  ]);

  useEffect(() => {
    if (!editableFocusMarker) {
      editableMarkerOffsetRef.current = null;
      const frameId = window.requestAnimationFrame(() => {
        setEditableMarkerOffset(null);
      });
      return () => window.cancelAnimationFrame(frameId);
    }

    const nextOffset = focusMarker?.markerOffset ?? null;
    editableMarkerOffsetRef.current = nextOffset;

    if (sceneRef.current?.drag.active) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      setEditableMarkerOffset(nextOffset);
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [editableFocusMarker, focusMarker]);

  useEffect(() => {
    const s = sceneRef.current;
    if (!s || !snapPose) return;

    const targetScale = scale ?? (compact ? 1.0 : 1.15);
    s.globe.scale.setScalar(targetScale);
    s.camera.position.y = cameraY;
    s.camera.updateProjectionMatrix();
  }, [cameraY, compact, scale, snapPose]);

  // Focus on selected university or hovered project
  useEffect(() => {
    const s = sceneRef.current;
    if (!s) return;
    const focusKey = focusMarker
      ? `focus:${focusMarker.id}`
      : hoveredProject
        ? `hover:${hoveredProject}`
        : selectedUniversity
          ? `university:${selectedUniversity.id}`
          : "default";

    if (s.focusKey !== focusKey) {
      s.focusKey = focusKey;
      s.focusSpin = 0;
    }

    s.targetQ = getFocusQuaternion({
      selectedUniversity,
      hoveredProject,
      focusMarker,
      focusTargetYOffset,
      focusSpin: s.focusSpin,
    });
  }, [focusMarker, focusTargetYOffset, selectedUniversity, hoveredProject]);

  // Initialize Three.js scene (ONCE)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Setup Scene
    const scene = new THREE.Scene();
    // Removed scene.background to allow transparency
    scene.add(new THREE.AmbientLight(0xffffff, 0.72));
    const skyFill = new THREE.HemisphereLight(0xdff7ff, 0x4e7f65, 0.55);
    scene.add(skyFill);
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.25);
    keyLight.position.set(-120, 145, 190);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0xccefff, 0.35);
    rimLight.position.set(140, -80, -170);
    scene.add(rimLight);
    
    const cw = container.offsetWidth;
    const ch = container.offsetHeight;
    const camera = new THREE.PerspectiveCamera(45, cw / ch, 1, 1000);
    camera.position.set(0, cameraYRef.current, 280);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.04;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    // Set buffer size but DO NOT update style (handled by CSS to prevent flicker)
    renderer.setSize(cw, ch, false);
    
    const el = renderer.domElement;
    el.style.position = "absolute";
    el.style.inset = "0";
    el.style.width = "100%";
    el.style.height = "100%";
    el.style.outline = "none";
    el.style.zIndex = "0";
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
      focusSpin: 0,
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
      focusKey: focusMarkerRef.current
        ? `focus:${focusMarkerRef.current.id}`
        : hoveredProjectRef.current
          ? `hover:${hoveredProjectRef.current}`
          : selectedUniversityRef.current
            ? `university:${selectedUniversityRef.current.id}`
            : "default",
      focusSpin: 0,
    };

    // 2. Build Globe Geometry (Static)
    const globeMaterial = new THREE.MeshStandardMaterial({
      color: 0x58bfe9,
      roughness: 0.76,
      metalness: 0,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });

    // Colored sphere (occludes back-facing lines)
    const globeMesh = new THREE.Mesh(
      new THREE.SphereGeometry(R, 64, 64),
      globeMaterial
    );
    globe.add(globeMesh);

    const atmosphereMesh = new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.018, 64, 64),
      new THREE.MeshBasicMaterial({
        color: 0x8fdfff,
        transparent: true,
        opacity: 0.12,
        side: THREE.BackSide,
        depthWrite: false,
      })
    );
    globe.add(atmosphereMesh);

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

        const texture = createGlobeTexture(countries);
        if (texture) {
          const previousMap = globeMaterial.map;
          globeMaterial.map = texture;
          globeMaterial.color.set(0xffffff);
          globeMaterial.needsUpdate = true;
          previousMap?.dispose();
        }

        if (pts.length > 0) {
          const geom = new THREE.BufferGeometry();
          geom.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
          globe.add(
            new THREE.LineSegments(
              geom,
              new THREE.LineBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.44,
              })
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
    const markerHoverVec = new THREE.Vector3();
    const markerHoverProj = new THREE.Vector3();

    const isPointerOverGlobe = (clientX: number, clientY: number) => {
      const activeScene = sceneRef.current;
      if (!activeScene) return false;

      const rect = activeScene.renderer.domElement.getBoundingClientRect();
      if (!rect.width || !rect.height) return false;

      const center = new THREE.Vector3(0, 0, 0).project(activeScene.camera);
      const edge = new THREE.Vector3(
        R * activeScene.globe.scale.x,
        0,
        0
      ).project(activeScene.camera);

      const centerX = rect.left + (center.x * 0.5 + 0.5) * rect.width;
      const centerY = rect.top + (-center.y * 0.5 + 0.5) * rect.height;
      const edgeX = rect.left + (edge.x * 0.5 + 0.5) * rect.width;
      const edgeY = rect.top + (-edge.y * 0.5 + 0.5) * rect.height;
      const radius = Math.hypot(edgeX - centerX, edgeY - centerY);

      return Math.hypot(clientX - centerX, clientY - centerY) <= radius;
    };

    const getHoveredUniversityMarker = (clientX: number, clientY: number) => {
      const activeScene = sceneRef.current;
      if (!activeScene) return null;

      const rect = activeScene.renderer.domElement.getBoundingClientRect();
      if (!rect.width || !rect.height) return null;

      let closest:
        | { distance: number; id: string; index: number | null }
        | null = null;

      const currentUniversities = universitiesRef.current;
      const selected = selectedUniversityRef.current;
      const focusedProjectId = hoveredProjectRef.current;
      const markerUniversities =
        selected && !focusedProjectId && !hideSelectedUniversityMarkerRef.current
          ? [selected]
          : selected && !focusedProjectId
            ? []
            : currentUniversities;

      for (const uni of markerUniversities) {
        const universityIndex = currentUniversities.findIndex(
          (candidate) => candidate.id === uni.id
        );
        markerHoverVec
          .copy(toVec3(uni.lat, uni.lng, R + 1))
          .applyQuaternion(activeScene.globe.quaternion)
          .multiplyScalar(activeScene.globe.scale.x);

        let distance = Number.POSITIVE_INFINITY;
        if (markerHoverVec.z >= LABEL_Z_THRESHOLD * activeScene.globe.scale.x) {
          markerHoverProj.copy(markerHoverVec).project(activeScene.camera);
          const x = rect.left + (markerHoverProj.x * 0.5 + 0.5) * rect.width;
          const y = rect.top + (-markerHoverProj.y * 0.5 + 0.5) * rect.height;
          distance = Math.hypot(clientX - x, clientY - y);
        }

        const label =
          universityIndex >= 0 ? labelsRef.current[universityIndex] : null;
        if (label && Number(getComputedStyle(label).opacity) > 0.05) {
          const labelRect = label.getBoundingClientRect();
          const labelAnchorX = (labelRect.left + labelRect.right) / 2;
          const labelAnchorY = labelRect.bottom;
          distance = Math.min(
            distance,
            Math.hypot(clientX - labelAnchorX, clientY - labelAnchorY)
          );
        }
        if (!Number.isFinite(distance)) continue;

        const pixelRadius =
          selected && selected.id === uni.id
            ? SELECTED_UNIVERSITY_MARKER_RADIUS_PX
            : UNIVERSITY_MARKER_RADIUS_PX;
        const hitRadius = Math.max(
          MARKER_HOVER_HIT_RADIUS_PX,
          pixelRadius * MARKER_HOVER_HIT_RADIUS_MULTIPLIER
        );

        if (distance > hitRadius || (closest && distance >= closest.distance)) {
          continue;
        }

        closest = {
          distance,
          id: uni.id,
          index: universityIndex >= 0 ? universityIndex : null,
        };
      }

      return closest;
    };

    const updateHoveredMarkerFromPointer = (clientX: number, clientY: number) => {
      const pointerOverGlobe = isPointerOverGlobe(clientX, clientY);
      const hoveredMarker = getHoveredUniversityMarker(clientX, clientY);
      hoveredUniversityIdRef.current = hoveredMarker?.id ?? null;
      hoveredLabelIdxRef.current = hoveredMarker?.index ?? null;
      el.style.cursor = hoveredMarker
        ? "pointer"
        : pointerOverGlobe
          ? "grab"
          : "default";
    };

    const onDown = (e: PointerEvent) => {
      const hoveredMarker = getHoveredUniversityMarker(e.clientX, e.clientY);
      if (hoveredMarker) {
        hoveredUniversityIdRef.current = hoveredMarker.id;
        hoveredLabelIdxRef.current = hoveredMarker.index;
        const university = universitiesRef.current.find(
          (candidate) => candidate.id === hoveredMarker.id
        );
        if (university) onSelectUniversityRef.current(university);
        return;
      }

      if (
        disableDragRef.current ||
        (compactRef.current && !allowDragInCompactRef.current) ||
        !sceneRef.current ||
        !isPointerOverGlobe(e.clientX, e.clientY)
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
        (!compactRef.current || allowDragInCompactRef.current) &&
        isPointerOverGlobe(sceneRef.current.drag.x, sceneRef.current.drag.y)
      ) {
        el.style.cursor = "grab";
      } else {
        el.style.cursor = "default";
      }

    };

    const onMove = (e: PointerEvent) => {
      const s = sceneRef.current;
      if (!s) return;

      const canDrag =
        !disableDragRef.current &&
        (!compactRef.current || allowDragInCompactRef.current);
      if (s.drag.active) {
        if (!canDrag) return;
        const dx = e.clientX - s.drag.x;
        const dy = e.clientY - s.drag.y;
        s.drag.x = e.clientX;
        s.drag.y = e.clientY;

        if (editableFocusMarkerRef.current && focusMarkerRef.current) {
          s.focusSpin += dx * 0.005;
          const spunFocusQ = getFocusQuaternion({
            selectedUniversity: selectedUniversityRef.current,
            hoveredProject: hoveredProjectRef.current,
            focusMarker: focusMarkerRef.current,
            focusTargetYOffset: focusTargetYOffsetRef.current,
            focusSpin: s.focusSpin,
          });
          if (spunFocusQ) {
            s.targetQ = spunFocusQ;
            s.rot.copy(spunFocusQ);
          }
          return;
        }

        const qY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), dx * 0.005);
        const qX = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), dy * 0.005);

        s.rot.premultiply(qY).premultiply(qX);
        s.targetQ = null;
        return;
      }

      updateHoveredMarkerFromPointer(e.clientX, e.clientY);
    };

    const onMouseMove = (e: MouseEvent) => {
      const s = sceneRef.current;
      if (!s || s.drag.active) return;

      updateHoveredMarkerFromPointer(e.clientX, e.clientY);
    };

    const onLeave = () => {
      const s = sceneRef.current;
      hoveredUniversityIdRef.current = null;
      hoveredLabelIdxRef.current = null;
      if (!s?.drag.active) {
        el.style.cursor = "default";
      }
    };

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("mousemove", onMouseMove);
    el.addEventListener("mouseleave", onLeave);
    window.addEventListener("pointerup", onUp);

    // 5. Animation Loop
    const _tempVec = new THREE.Vector3();
    const _projVec = new THREE.Vector3();
    const _autoAxisVec = new THREE.Vector3();

    let lastFrameTime = performance.now();

    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      const s = sceneRef.current;
      if (!s || !s.renderer) return;

      // Skip render if canvas has no size (prevents white flash/glitches during layout changes)
      const canvas = s.renderer.domElement;
      if (canvas.width === 0 || canvas.height === 0) return;

      const frameNow = performance.now();
      const frameDt = Math.min(64, frameNow - lastFrameTime);
      lastFrameTime = frameNow;
      // Label follow easing: ~250ms time constant, leashed to LABEL_MAX_LAG px
      const labelEase = 1 - Math.exp(-frameDt / 250);
      const LABEL_MAX_LAG = 18;

      const isCompact = compactRef.current;
      const currentUniversities = universitiesRef.current;
      const autoRotateDisabled = disableAutoRotateRef.current;
      const hoveredDomLabelIdx = labelsRef.current.findIndex((label) =>
        label?.matches(":hover")
      );
      if (hoveredDomLabelIdx >= 0) {
        hoveredLabelIdxRef.current = hoveredDomLabelIdx;
        hoveredUniversityIdRef.current =
          currentUniversities[hoveredDomLabelIdx]?.id ??
          hoveredUniversityIdRef.current;
      }
      const hoverPaused =
        hoveredLabelIdxRef.current !== null ||
        hoveredUniversityIdRef.current !== null;

      // Rotation logic
      const canDrag =
        !disableDragRef.current &&
        (!isCompact || allowDragInCompactRef.current);
      if (canDrag && s.drag.active) {
        // Drag handled in onMove — skip auto-rotate
        autoTiltRef.current = 0;
      } else if (hoverPaused) {
        // Keep logo/dot hover anchored by freezing both auto-tour and focus motion.
      } else if (s.targetQ) {
        autoTiltRef.current = 0;
        s.rot.slerp(s.targetQ, autoRotateDisabled ? 0.08 : 0.05);
      } else if (
        !autoRotateDisabled
      ) {
        const currentTourTilt = autoTiltRef.current;
        if (Math.abs(currentTourTilt) > 0.000001) {
          _autoAxisVec.set(1, 0, 0);
          s.autoQ.setFromAxisAngle(_autoAxisVec, -currentTourTilt);
          s.rot.premultiply(s.autoQ);
        }

        s.autoQ.setFromAxisAngle(
          autoAxis,
          (isCompact ? AUTO_COMPACT_ROTATION_SPEED : AUTO_ROTATION_SPEED) *
            (frameDt / 16.667)
        );
        s.rot.premultiply(s.autoQ);

        // Nod toward the mean latitude of universities about to come around,
        // so southern campuses rise into the visible dome on their turn.
        let targetTilt = 0;
        if (!isCompact && upcomingWeightSumRef.current > 0.001) {
          const meanLat =
            upcomingLatSumRef.current / upcomingWeightSumRef.current;
          const tourLat = Math.min(meanLat, upcomingMinLatRef.current);
          targetTilt = THREE.MathUtils.clamp(
            THREE.MathUtils.degToRad(AUTO_SWEET_SPOT_LAT - tourLat),
            -AUTO_TILT_MAX,
            AUTO_TILT_MAX
          );
        }
        if (!isCompact) {
          targetTilt = THREE.MathUtils.clamp(
            targetTilt + upcomingScreenPullRef.current * AUTO_SCREEN_PULL_GAIN,
            -AUTO_TILT_MAX,
            AUTO_TILT_MAX
          );
        }
        const maxStep = AUTO_TILT_RATE * frameDt;
        const nextTourTilt =
          currentTourTilt +
          THREE.MathUtils.clamp(
            targetTilt - currentTourTilt,
            -maxStep,
            maxStep
          );
        autoTiltRef.current = nextTourTilt;

        if (Math.abs(nextTourTilt) > 0.000001) {
          _autoAxisVec.set(1, 0, 0);
          s.autoQ.setFromAxisAngle(_autoAxisVec, nextTourTilt);
          s.rot.premultiply(s.autoQ);
        }
      }

      // Dynamic scale logic
      const targetScale = scaleRef.current ?? (isCompact ? 1.0 : 1.15);
      const currentScale = s.globe.scale.x;
      const newScale = currentScale + (targetScale - currentScale) * 0.02;
      s.globe.scale.setScalar(newScale);
      const globeScale = s.globe.scale.x;

      const nextCameraY =
        s.camera.position.y + (cameraYRef.current - s.camera.position.y) * 0.08;
      if (Math.abs(nextCameraY - s.camera.position.y) > 0.001) {
        s.camera.position.y = nextCameraY;
        s.camera.updateProjectionMatrix();
      }

      s.globe.quaternion.copy(s.rot);
      const markerPixelRatio = s.renderer.getPixelRatio();
      const markerCanvasW = canvas.width / markerPixelRatio;
      const markerCanvasH = canvas.height / markerPixelRatio;
      _tempVec.set(0, 0, 0).project(s.camera);
      _projVec.set(R * globeScale, 0, 0).project(s.camera);
      const projectedGlobeRadiusPx =
        Math.hypot(
          (_projVec.x - _tempVec.x) * markerCanvasW,
          (_projVec.y - _tempVec.y) * markerCanvasH
        ) * 0.5;
      const logoSizePx = getResponsiveLogoSize(projectedGlobeRadiusPx);
      const fallbackLabelFontSizePx = Math.round(
        THREE.MathUtils.clamp(logoSizePx * FALLBACK_LABEL_FONT_RATIO, 9, 14)
      );

      container.style.setProperty("--globe-logo-size", `${logoSizePx}px`);
      container.style.setProperty(
        "--globe-label-font-size",
        `${fallbackLabelFontSizePx}px`
      );

      for (const marker of s.markersGroup.children) {
        const markerPixelRadius =
          typeof marker.userData.markerPixelRadius === "number"
            ? marker.userData.markerPixelRadius
            : UNIVERSITY_MARKER_RADIUS_PX;
        const markerHoverScale =
          marker.userData.universityId === hoveredUniversityIdRef.current
            ? MARKER_HOVER_SCALE
            : 1;
        marker.scale.setScalar(
          getResponsiveMarkerLocalRadius({
            camera: s.camera,
            canvasHeight: markerCanvasH,
            globeScale,
            pixelRadius: markerPixelRadius,
          }) * markerHoverScale
        );
      }

      s.renderer.render(s.scene, s.camera);

      // Label positioning with collision avoidance
      const visible: {
        idx: number;
        x: number;
        y: number;
        anchorX: number;
        anchorY: number;
        w: number;
        h: number;
        opacity: number;
      }[] = [];

      let upcomingLatSum = 0;
      let upcomingWeightSum = 0;
      let upcomingMinLat = 90;
      let upcomingScreenPullSum = 0;
      let upcomingScreenPullWeight = 0;
      const containerRect = container.getBoundingClientRect();
      const labelBandTop = containerRect.top + AUTO_LABEL_VIEWPORT_MARGIN;
      const labelBandBottom = window.innerHeight - AUTO_LABEL_VIEWPORT_MARGIN;
      const maxVisibleLabels = maxLabelsRef.current ?? 8;
      const clampLabelsToViewport =
        isCompact && maxVisibleLabels >= currentUniversities.length;

      for (let i = 0; i < currentUniversities.length; i++) {
        const label = labelsRef.current[i];
        if (!label) continue;

        const uni = currentUniversities[i];
        if (!uni) continue;

        // Solo mode: only show the specified university's label
        const solo = soloLabelIdRef.current;

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
          .applyQuaternion(s.globe.quaternion)
          .multiplyScalar(globeScale);

        // Feed the latitude nod: weight universities by their closeness to the
        // camera-facing meridian so labels entering the dome can drive the tour.
        const frontDeg =
          Math.atan2(_tempVec.x, _tempVec.z) * (180 / Math.PI);
        if (frontDeg > -170 && frontDeg < 170) {
          const tFront = (frontDeg - AUTO_FRONT_CENTER) / AUTO_FRONT_SIGMA;
          const wFront = Math.exp(-tFront * tFront);
          const southBias =
            1 +
            Math.min(
              1.4,
              Math.max(0, (AUTO_SOUTH_BIAS_LAT - uni.lat) / 60)
            ) *
              AUTO_SOUTH_BIAS_STRENGTH;
          const wTilt = wFront * southBias;
          upcomingLatSum += uni.lat * wTilt;
          upcomingWeightSum += wTilt;
          if (wFront > 0.15) {
            upcomingMinLat = Math.min(upcomingMinLat, uni.lat);
          }
        }

        if (_tempVec.z < LABEL_Z_THRESHOLD * globeScale) {
          label.style.opacity = "0";
          continue;
        }

        _projVec.copy(_tempVec).project(s.camera);
        const canvasW = s.renderer.domElement.width / s.renderer.getPixelRatio();
        const canvasH = s.renderer.domElement.height / s.renderer.getPixelRatio();

        const x = (_projVec.x * 0.5 + 0.5) * canvasW;
        const y = (-_projVec.y * 0.5 + 0.5) * canvasH;

        const frontFacing = _tempVec.z / (R * globeScale);
        const opacity = Math.min(1, Math.max(0.45, frontFacing * 2.8));
        const labelH = label.offsetHeight || 36;
        const labelViewportTop = containerRect.top + y - labelH;
        const labelViewportBottom = containerRect.top + y;
        const bottomOverflow = Math.max(
          0,
          labelViewportBottom - labelBandBottom
        );
        const topOverflow = Math.max(0, labelBandTop - labelViewportTop);
        if (frontFacing > 0.05 && (bottomOverflow > 0 || topOverflow > 0)) {
          const screenPull = (bottomOverflow - topOverflow) / canvasH;
          const screenWeight =
            frontFacing *
            (1 +
              Math.min(
                1.4,
                Math.max(0, (AUTO_SOUTH_BIAS_LAT - uni.lat) / 60)
              ) *
                AUTO_SOUTH_BIAS_STRENGTH);
          upcomingScreenPullSum += screenPull * screenWeight;
          upcomingScreenPullWeight += screenWeight;
        }
        const clampedY = clampLabelsToViewport
          ? THREE.MathUtils.clamp(
              y,
              labelBandTop - containerRect.top + labelH,
              labelBandBottom - containerRect.top
            )
          : y;

        visible.push({
          idx: i,
          x,
          y: clampedY,
          anchorX: x,
          anchorY: clampedY,
          w: label.offsetWidth || 36,
          h: labelH,
          opacity,
        });
      }

      // Limit to most front-facing labels
      visible.sort((a, b) => b.opacity - a.opacity);
      const MAX_LABELS = maxVisibleLabels;
      if (visible.length > MAX_LABELS) {
        for (const v of visible.slice(MAX_LABELS)) {
          const label = labelsRef.current[v.idx];
          if (label) label.style.opacity = "0";
        }
        visible.length = MAX_LABELS;
      }

      upcomingLatSumRef.current = upcomingLatSum;
      upcomingWeightSumRef.current = upcomingWeightSum;
      upcomingMinLatRef.current = upcomingMinLat;
      upcomingScreenPullRef.current =
        upcomingScreenPullWeight > 0
          ? THREE.MathUtils.clamp(
              upcomingScreenPullSum / upcomingScreenPullWeight,
              -1,
              1
            )
          : 0;

      // Keep crowded labels readable without letting them drift away from their map point.
      const PAD = 4;
      const MAX_LABEL_DRIFT = 14;
      const clampToAnchor = (label: (typeof visible)[number]) => {
        label.x =
          label.anchorX +
          Math.max(-MAX_LABEL_DRIFT, Math.min(MAX_LABEL_DRIFT, label.x - label.anchorX));
        label.y =
          label.anchorY +
          Math.max(-MAX_LABEL_DRIFT, Math.min(MAX_LABEL_DRIFT, label.y - label.anchorY));
      };

      for (let iter = 0; iter < 3; iter++) {
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
              clampToAnchor(a);
              clampToAnchor(b);
            }
          }
        }
      }

      // Apply resolved positions: ease toward the target in JS, but clamp the
      // lag so a fast drag can never pull a label far from its dot.
      const smoothPos = labelSmoothPosRef.current;
      const nowVisible = new Set<number>();
      for (const v of visible) {
        const label = labelsRef.current[v.idx];
        if (!label) continue;
        nowVisible.add(v.idx);

        let pos = smoothPos.get(v.idx);
        if (!pos) {
          // Newly appearing: snap straight to the target
          pos = { x: v.x, y: v.y };
          smoothPos.set(v.idx, pos);
        } else {
          pos.x += (v.x - pos.x) * labelEase;
          pos.y += (v.y - pos.y) * labelEase;
          const lagX = pos.x - v.x;
          const lagY = pos.y - v.y;
          const lag = Math.hypot(lagX, lagY);
          if (lag > LABEL_MAX_LAG) {
            const k = LABEL_MAX_LAG / lag;
            pos.x = v.x + lagX * k;
            pos.y = v.y + lagY * k;
          }
        }
        label.style.transform = `translate(${pos.x}px, ${pos.y}px) translate(-50%, -100%)`;
        label.style.opacity = String(v.opacity);
        label.style.pointerEvents = "auto";
        const labelUniversity = currentUniversities[v.idx];
        const markerHovered =
          Boolean(labelUniversity) &&
          labelUniversity.id === hoveredUniversityIdRef.current;
        label.style.setProperty(
          "--globe-marker-hover-scale",
          markerHovered ? String(MARKER_HOVER_SCALE) : "1"
        );
        label.style.zIndex = markerHovered ? "10" : "";
      }
      for (const idx of smoothPos.keys()) {
        if (!nowVisible.has(idx)) smoothPos.delete(idx);
      }
      // Hidden labels must not capture hovers or block globe dragging
      for (let i = 0; i < labelsRef.current.length; i++) {
        if (nowVisible.has(i)) continue;
        const label = labelsRef.current[i];
        if (label) {
          label.style.pointerEvents = "none";
          label.style.setProperty("--globe-marker-hover-scale", "1");
          label.style.zIndex = "";
        }
        if (hoveredLabelIdxRef.current === i) hoveredLabelIdxRef.current = null;
      }

      // Project label positioning
      const visibleProjectLabels: Array<{
        idx: number;
        x: number;
        y: number;
        w: number;
        h: number;
        opacity: number;
        isFocusMarkerLabel: boolean;
      }> = [];
      const focusedProjectId = hoveredProjectRef.current;
      const projectLabelProjects = focusMarkerRef.current
        ? [focusMarkerRef.current]
        : focusedProjectId && selectedUniversityRef.current
          ? getUniversityWorlds(selectedUniversityRef.current).filter(
              (project) => project.id === focusedProjectId
            )
          : getUniversityWorlds(selectedUniversityRef.current);

      for (let i = 0; i < projectLabelsRef.current.length; i++) {
        const label = projectLabelsRef.current[i];
        if (!label) continue;

        if (
          hideProjectLabelsRef.current ||
          (editableFocusMarkerRef.current && Boolean(focusMarkerRef.current))
        ) {
          label.style.opacity = "0";
          continue;
        }

        if (!projectLabelProjects[i]) {
          label.style.opacity = "0";
          continue;
        }

        const project = projectLabelProjects[i];
        const { lat, lng } = project.markerOffset;

        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lng + 180) * (Math.PI / 180);
        const r = R + 3;

        _tempVec.set(
          -r * Math.sin(phi) * Math.cos(theta),
          r * Math.cos(phi),
          r * Math.sin(phi) * Math.sin(theta)
        ).applyQuaternion(s.globe.quaternion)
          .multiplyScalar(globeScale);

        if (_tempVec.z < LABEL_Z_THRESHOLD * globeScale) {
          label.style.opacity = "0";
          continue;
        }

        _projVec.copy(_tempVec).project(s.camera);
        const canvasW2 = s.renderer.domElement.width / s.renderer.getPixelRatio();
        const canvasH2 = s.renderer.domElement.height / s.renderer.getPixelRatio();

        const px = (_projVec.x * 0.5 + 0.5) * canvasW2;
        const py = (-_projVec.y * 0.5 + 0.5) * canvasH2;
        const isFocusMarkerLabel = Boolean(focusMarkerRef.current);
        const labelY = isFocusMarkerLabel ? py + 5 : py + 14;

        const frontFacing = _tempVec.z / (R * globeScale);
        const opacity = Math.min(1, Math.max(0, (frontFacing - 0.15) * 2.5));

        visibleProjectLabels.push({
          idx: i,
          x: px,
          y: labelY,
          w: label.offsetWidth || (isFocusMarkerLabel ? 150 : 110),
          h: label.offsetHeight || 24,
          opacity,
          isFocusMarkerLabel,
        });
      }

      for (let iter = 0; iter < 6; iter++) {
        for (let i = 0; i < visibleProjectLabels.length; i++) {
          for (let j = i + 1; j < visibleProjectLabels.length; j++) {
            const a = visibleProjectLabels[i];
            const b = visibleProjectLabels[j];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const overlapX = (a.w / 2 + b.w / 2 + 12) - Math.abs(dx);
            const overlapY = (a.h / 2 + b.h / 2 + 10) - Math.abs(dy);

            if (overlapX > 0 && overlapY > 0) {
              if (overlapX < overlapY) {
                const push = overlapX * 0.5;
                const sign = dx >= 0 ? 1 : -1;
                a.x -= sign * push;
                b.x += sign * push;
              } else {
                const push = overlapY * 0.5;
                a.y -= push * 0.35;
                b.y += push * 0.65;
              }
            }
          }
        }
      }

      const projectSmoothPos = projectLabelSmoothPosRef.current;
      const nowVisibleProjects = new Set<number>();
      for (const visibleProjectLabel of visibleProjectLabels) {
        const label = projectLabelsRef.current[visibleProjectLabel.idx];
        if (!label) continue;
        nowVisibleProjects.add(visibleProjectLabel.idx);

        let pos = projectSmoothPos.get(visibleProjectLabel.idx);
        if (!pos) {
          pos = { x: visibleProjectLabel.x, y: visibleProjectLabel.y };
          projectSmoothPos.set(visibleProjectLabel.idx, pos);
        } else {
          pos.x += (visibleProjectLabel.x - pos.x) * labelEase;
          pos.y += (visibleProjectLabel.y - pos.y) * labelEase;
          const lagX = pos.x - visibleProjectLabel.x;
          const lagY = pos.y - visibleProjectLabel.y;
          const lag = Math.hypot(lagX, lagY);
          if (lag > LABEL_MAX_LAG) {
            const k = LABEL_MAX_LAG / lag;
            pos.x = visibleProjectLabel.x + lagX * k;
            pos.y = visibleProjectLabel.y + lagY * k;
          }
        }
        label.style.transform = `translate(${pos.x}px, ${pos.y}px) translate(-50%, 0%)`;
        label.style.opacity = String(visibleProjectLabel.opacity);
      }
      for (const idx of projectSmoothPos.keys()) {
        if (!nowVisibleProjects.has(idx)) projectSmoothPos.delete(idx);
      }

      const editableMarkerGroup = editableFocusMarkerGroupRef.current;
      if (
        editableMarkerGroup &&
        editableFocusMarkerRef.current &&
        focusMarkerRef.current
      ) {
        _tempVec
          .copy(
            toVec3(
              focusMarkerRef.current.markerOffset.lat,
              focusMarkerRef.current.markerOffset.lng,
              R + 1
            )
          )
          .applyQuaternion(s.globe.quaternion)
          .multiplyScalar(s.globe.scale.x);
        _projVec.copy(_tempVec).project(s.camera);

        const canvasW3 = s.renderer.domElement.width / s.renderer.getPixelRatio();
        const canvasH3 = s.renderer.domElement.height / s.renderer.getPixelRatio();
        const px = (_projVec.x * 0.5 + 0.5) * canvasW3;
        const py = (-_projVec.y * 0.5 + 0.5) * canvasH3;

        editableMarkerGroup.style.transform = `translate(${px}px, ${py}px)`;
        editableMarkerGroup.style.opacity = "1";
      } else if (editableMarkerGroup) {
        editableMarkerGroup.style.opacity = "0";
      }
    };

    animate();

    return () => {
      cancelAnimationFrame(frameRef.current);
      resizeObserver.disconnect();
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("mousemove", onMouseMove);
      el.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("pointerup", onUp);

      // Dispose logic
      if (container.contains(el)) container.removeChild(el);
      globe.traverse((child) => {
        if (!(child instanceof THREE.Mesh || child instanceof THREE.LineSegments)) {
          return;
        }
        child.geometry.dispose();
        const materials = Array.isArray(child.material)
          ? child.material
          : [child.material];
        for (const material of materials) {
          const mappedMaterial = material as THREE.Material & {
            map?: THREE.Texture | null;
          };
          mappedMaterial.map?.dispose();
          material.dispose();
        }
      });
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

    // University markers — if a selected university is active, either show just that one
    // or none at all when the detail stage explicitly hides it.
    const focusedProjectId = hoveredProjectRef.current;

    if (selectedUniversity && !focusedProjectId) {
      if (!hideSelectedUniversityMarkerRef.current) {
        const selectedUniversityIndex = universities.findIndex(
          (uni) => uni.id === selectedUniversity.id
        );
        const m = createMarkerNode({
          color: selectedUniversity.color,
          pixelRadius: SELECTED_UNIVERSITY_MARKER_RADIUS_PX,
          universityId: selectedUniversity.id,
          universityIndex:
            selectedUniversityIndex >= 0 ? selectedUniversityIndex : undefined,
        });
        m.position.copy(toVec3(selectedUniversity.lat, selectedUniversity.lng, R + 1));
        s.markersGroup.add(m);
      }
    } else {
      universities.forEach((uni, uniIndex) => {
        const m = createMarkerNode({
          color: uni.color,
          pixelRadius: UNIVERSITY_MARKER_RADIUS_PX,
          universityId: uni.id,
          universityIndex: uniIndex,
        });
        m.position.copy(toVec3(uni.lat, uni.lng, R + 1));
        s.markersGroup.add(m);
      });
    }

    const focusedProjectMarker = focusMarkerRef.current;
    if (focusedProjectMarker) {
      if (!editableFocusMarkerRef.current) {
        const focusMesh = createMarkerNode({
          color:
            focusedProjectMarker.color ??
            selectedUniversity?.color ??
            "#000000",
          pixelRadius: FOCUS_MARKER_RADIUS_PX,
        });
        focusMesh.position.copy(
          toVec3(
            focusedProjectMarker.markerOffset.lat,
            focusedProjectMarker.markerOffset.lng,
            R + 1
          )
        );
        s.markersGroup.add(focusMesh);
      }
      return;
    }

    // Project markers for selected university
    if (selectedUniversity) {
      const projectsToRender = focusedProjectId
        ? getUniversityWorlds(selectedUniversity).filter((project) => project.id === focusedProjectId)
        : getUniversityWorlds(selectedUniversity);

      projectsToRender.forEach(project => {
        const { lat, lng } = project.markerOffset;
        // Skip if project is at the same location as the university
        if (Math.abs(lat - selectedUniversity.lat) < 0.01 && Math.abs(lng - selectedUniversity.lng) < 0.01) return;
        const m = createMarkerNode({
          color: selectedUniversity.color,
          pixelRadius: PROJECT_MARKER_RADIUS_PX,
        });
        m.position.copy(toVec3(lat, lng, R + 1));
        s.markersGroup.add(m);
      });
    }
  }, [universities, selectedUniversity, hoveredProject, focusMarker, editableFocusMarker]);

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full ${
        snapPose
          ? ""
          : "transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
      }`}
      style={{
        touchAction: "none",
        transform: verticalOffset ? `translateY(${verticalOffset}px)` : undefined,
      }}
    >
      <div className={`absolute inset-0 z-10 pointer-events-none transition-opacity duration-300 ${hideLabels ? "opacity-0" : ""}`}>
        {universities.map((uni, i) => (
          <div
            key={uni.id}
            ref={(el) => {
              labelsRef.current[i] = el;
            }}
            className="group absolute left-0 top-0 cursor-pointer will-change-[transform,opacity] whitespace-nowrap transition-opacity duration-300 ease-out hover:z-10"
            style={{ opacity: 0, pointerEvents: "none" }}
            onPointerEnter={() => {
              hoveredLabelIdxRef.current = i;
              hoveredUniversityIdRef.current = uni.id;
              labelsRef.current[i]?.style.setProperty(
                "--globe-marker-hover-scale",
                String(MARKER_HOVER_SCALE)
              );
            }}
            onPointerLeave={(event) => {
              const nextElement = document.elementFromPoint(
                event.clientX,
                event.clientY
              );
              const labelRect = event.currentTarget.getBoundingClientRect();
              const nearMarkerAnchor =
                Math.hypot(
                  event.clientX - (labelRect.left + labelRect.right) / 2,
                  event.clientY - labelRect.bottom
                ) <= MARKER_HOVER_HIT_RADIUS_PX;
              if (nextElement?.tagName === "CANVAS" && nearMarkerAnchor) {
                return;
              }

              if (hoveredLabelIdxRef.current === i) {
                hoveredLabelIdxRef.current = null;
              }
              if (hoveredUniversityIdRef.current === uni.id) {
                hoveredUniversityIdRef.current = null;
              }
              labelsRef.current[i]?.style.setProperty(
                "--globe-marker-hover-scale",
                "1"
              );
            }}
            onClick={() => {
              onSelectUniversity(uni);
            }}
          >
            {uni.logo ? (
              <img
                src={uni.logo}
                alt={uni.shortName}
                width={58}
                height={58}
                className="origin-bottom transition-transform duration-200 ease-out"
                style={{
                  display: "block",
                  height: "var(--globe-logo-size, 36px)",
                  objectFit: "contain",
                  transform: "scale(var(--globe-marker-hover-scale, 1))",
                  width: "var(--globe-logo-size, 36px)",
                }}
                draggable={false}
              />
            ) : (
              <span
                className="block origin-bottom font-bold uppercase tracking-[0.1em] text-black transition-transform duration-200 ease-out"
                style={{
                  fontSize: "var(--globe-label-font-size, 9px)",
                  lineHeight: 1,
                  transform: "scale(var(--globe-marker-hover-scale, 1))",
                }}
              >
                {uni.shortName}
              </span>
            )}
          </div>
        ))}
      </div>
      {/* Project location labels */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {(!editableFocusMarker || !focusMarker
          ? focusMarker
            ? [focusMarker]
            : getUniversityWorlds(selectedUniversity)
          : []
        ).map((project, i) => {
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
                transition: "opacity 400ms ease-out",
              }}
            >
              <span
                className={
                  isFocusMarkerLabel
                    ? "px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white"
                    : "px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-white"
                }
                style={{
                  color: "#ffffff",
                  backgroundColor: "rgba(0, 0, 0, 0.88)",
                  border: "none",
                }}
              >
                {projectLabel}
              </span>
            </div>
          );
        })}
        {editableFocusMarker && focusMarker && editableMarkerOffset ? (
          <div
            ref={editableFocusMarkerGroupRef}
            className="absolute left-0 top-0 will-change-[transform,opacity]"
            style={{
              opacity: 0,
              transition: "opacity 180ms ease-out",
            }}
          >
            <span className="absolute left-0 top-0 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black" />
            <span className="absolute left-0 top-[14px] -translate-x-1/2 bg-black px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white whitespace-nowrap">
              {`Lat ${editableMarkerOffset.lat.toFixed(4)} / Lng ${editableMarkerOffset.lng.toFixed(4)}`}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
