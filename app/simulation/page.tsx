"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { Canvas, ThreeEvent } from "@react-three/fiber";
import Link from "next/link";
import {
  OrbitControls,
  Line,
  Html,
  Grid,
  TransformControls,
} from "@react-three/drei";
import * as THREE from "three";
import { InlineMath } from "react-katex";
import {
  ArrowBigLeft,
  Eye,
  RotateCcw,
  Maximize2,
  Move,
  RefreshCw,
} from "lucide-react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import {
  projectionExamples,
  ProjectionExample,
  PropertyTab,
  cloneVector3,
} from "@/app/lib/examples";

type SelectedLineTarget = null | "delta" | "line1" | "line2";
type PointKey = "A" | "B" | "C" | "D";

// Color palette for each point and the delta line
const COLORS = {
  A: "#f87171", // Red
  B: "#4ade80", // Green
  C: "#60a5fa", // Blue
  D: "#facc15", // Yellow
  Delta: "#38bdf8", // Cyan
};

// Project point P along direction D onto plane y = 0
function projectPoint(p: THREE.Vector3, dir: THREE.Vector3): THREE.Vector3 {
  const safeY = Math.abs(dir.y) < 0.08 ? (dir.y >= 0 ? 0.08 : -0.08) : dir.y;
  const t = -p.y / safeY;
  return new THREE.Vector3(p.x + t * dir.x, 0.015, p.z + t * dir.z);
}

// Direction (either +dir or -dir) that moves p toward the plane y = 0.
// Used so the arrow cone of every projection ray points at the plane.
function projectionDirTowardPlane(
  p: THREE.Vector3,
  dir: THREE.Vector3,
): THREE.Vector3 {
  if (p.y === 0 || dir.y === 0) return dir.clone();
  return p.y * dir.y > 0 ? dir.clone().negate() : dir.clone();
}

// Split segment [p1, p2] at plane y = 0 into visible (y >= 0) and hidden (y < 0)
function splitAtPlane(p1: THREE.Vector3, p2: THREE.Vector3) {
  if (p1.y >= 0 && p2.y >= 0) {
    return { solid: [p1, p2] as [THREE.Vector3, THREE.Vector3], dashed: null };
  }
  if (p1.y < 0 && p2.y < 0) {
    return { solid: null, dashed: [p1, p2] as [THREE.Vector3, THREE.Vector3] };
  }
  const t = -p1.y / (p2.y - p1.y);
  const hit = new THREE.Vector3().lerpVectors(p1, p2, t);
  hit.y = 0.01;
  return p1.y >= 0
    ? {
        solid: [p1, hit] as [THREE.Vector3, THREE.Vector3],
        dashed: [hit, p2] as [THREE.Vector3, THREE.Vector3],
      }
    : {
        solid: [hit, p2] as [THREE.Vector3, THREE.Vector3],
        dashed: [p1, hit] as [THREE.Vector3, THREE.Vector3],
      };
}

// Infinite line defined by 1 center point + 1 unit direction vector
function InfiniteLine({
  center,
  dir,
  color = "#ffffff",
  isSelected = false,
  onSelectLine,
  isProjectionAxis = false,
  label,
  lineWidth,
  arrowSize = [0.11, 0.32],
  opacity = 1,
}: {
  center: THREE.Vector3;
  dir: THREE.Vector3;
  color?: string;
  isSelected?: boolean;
  onSelectLine?: (clickPoint: THREE.Vector3) => void;
  isProjectionAxis?: boolean;
  label?: string;
  lineWidth?: number;
  arrowSize?: [number, number];
  opacity?: number;
}) {
  const [hovered, setHovered] = useState(false);

  const extStart = useMemo(
    () => center.clone().addScaledVector(dir, -150),
    [center, dir],
  );
  const extEnd = useMemo(
    () => center.clone().addScaledVector(dir, 150),
    [center, dir],
  );

  const quaternion = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    return q;
  }, [dir]);

  const { solid, dashed } = useMemo(
    () => splitAtPlane(extStart, extEnd),
    [extStart, extEnd],
  );

  const arrowPos = useMemo(
    () => center.clone().addScaledVector(dir, 1.8),
    [center, dir],
  );

  const activeColor = isSelected ? "#ffffff" : hovered ? "#e5e5e5" : color;
  const baseWidth = isSelected ? 3.5 : hovered ? 3 : 2.2;
  const activeWidth = lineWidth ?? baseWidth;

  return (
    <group>
      {/* Solid portion above plane */}
      {solid && (
        <Line
          color={activeColor}
          lineWidth={activeWidth}
          points={solid}
          opacity={opacity}
          transparent={opacity < 1}
        />
      )}

      {/* Dashed portion below/hidden behind plane */}
      {dashed && (
        <Line
          color={activeColor}
          lineWidth={activeWidth * 0.85}
          points={dashed}
          dashed
          dashScale={6}
          dashSize={0.35}
          gapSize={0.25}
          opacity={opacity * 0.6}
          transparent
        />
      )}

      {/* Direction arrowhead */}
      {isProjectionAxis && (
        <mesh position={arrowPos} quaternion={quaternion}>
          <coneGeometry args={[arrowSize[0], arrowSize[1], 16]} />
          <meshBasicMaterial
            color={activeColor}
            transparent
            opacity={opacity}
          />
        </mesh>
      )}

      {/* Label tag near center */}
      {label && (
        <Html
          position={center.clone().add(new THREE.Vector3(0, 0.35, 0))}
          center
        >
          <div
            onClick={(e) => {
              e.stopPropagation();
              onSelectLine?.(center.clone());
            }}
            className={`px-2 py-0.5 rounded text-xs font-mono cursor-pointer select-none border transition ${
              isSelected
                ? "bg-white text-black border-white font-bold"
                : "bg-neutral-950/90 text-neutral-200 border-neutral-700 hover:border-white"
            }`}
          >
            {label}
          </div>
        </Html>
      )}

      {/* Invisible thick cylinder collider */}
      {onSelectLine && (
        <mesh
          position={center}
          quaternion={quaternion}
          onClick={(e: ThreeEvent<MouseEvent>) => {
            e.stopPropagation();
            const v = new THREE.Vector3().subVectors(e.point, center);
            const projectedHit = center
              .clone()
              .addScaledVector(dir, v.dot(dir));
            onSelectLine(projectedHit);
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHovered(true);
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            setHovered(false);
            document.body.style.cursor = "auto";
          }}
        >
          <cylinderGeometry args={[0.22, 0.22, 300, 8]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

// Infinite projection ray — like the Δ axis: solid above plane, dashed below,
// arrow cone pointing toward the plane.
function InfiniteProjectionRay({
  center,
  dir,
  visible,
  color = "#7a7a7a",
  opacity = 0.6,
}: {
  center: THREE.Vector3;
  dir: THREE.Vector3;
  visible: boolean;
  color?: string;
  opacity?: number;
}) {
  if (!visible) return null;
  const rayDir = projectionDirTowardPlane(center, dir);
  return (
    <InfiniteLine
      center={center}
      dir={rayDir}
      color={color}
      opacity={opacity}
      isProjectionAxis={true}
      lineWidth={1.3}
      arrowSize={[0.08, 0.24]}
    />
  );
}

// Point constrained to slide directly along a line when dragged
function DraggableLinePoint({
  position,
  label,
  lineCenter,
  lineDir,
  onDragT,
  onDragStart,
  onDragEnd,
  color = "#ffffff",
  isInteractive = true,
  opacity = 1,
}: {
  position: THREE.Vector3;
  label: string;
  lineCenter?: THREE.Vector3;
  lineDir?: THREE.Vector3;
  onDragT?: (newT: number) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  color?: string;
  isInteractive?: boolean;
  opacity?: number;
}) {
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (!isInteractive || !onDragT || !lineCenter || !lineDir) return;
    e.stopPropagation();
    (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId);
    setDragging(true);
    onDragStart?.();
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!dragging || !onDragT || !lineCenter || !lineDir) return;
    e.stopPropagation();
    const ray = e.ray;
    const w0 = new THREE.Vector3().subVectors(ray.origin, lineCenter);
    const a = ray.direction.dot(ray.direction);
    const b = ray.direction.dot(lineDir);
    const c = lineDir.dot(lineDir);
    const d = ray.direction.dot(w0);
    const f = lineDir.dot(w0);
    const denom = a * c - b * b;

    if (Math.abs(denom) > 1e-5) {
      const tLine = (a * f - b * d) / denom;
      onDragT(THREE.MathUtils.clamp(tLine, -8, 8));
    }
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    if (!dragging) return;
    e.stopPropagation();
    (e.target as HTMLElement)?.releasePointerCapture?.(e.pointerId);
    setDragging(false);
    onDragEnd?.();
  };

  return (
    <group position={position}>
      {(dragging || (isInteractive && hovered)) && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.17, 0.24, 32]} />
          <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
        </mesh>
      )}
      <mesh
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerOver={(e) => {
          if (!isInteractive) return;
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = dragging ? "grabbing" : "grab";
        }}
        onPointerOut={() => {
          setHovered(false);
          if (!dragging) document.body.style.cursor = "auto";
        }}
      >
        <sphereGeometry args={[isInteractive ? 0.13 : 0.09, 24, 24]} />
        <meshStandardMaterial
          color={dragging ? "#ffffff" : color}
          emissive={dragging || hovered ? "#ffffff" : color}
          emissiveIntensity={dragging ? 0.9 : hovered ? 0.5 : 0.2}
          opacity={opacity}
          transparent={opacity < 1}
        />
      </mesh>
      <Html position={[0, 0.3, 0]} center distanceFactor={11}>
        <div
          className={`px-1.5 py-0.5 rounded text-[11px] font-mono whitespace-nowrap select-none pointer-events-none border ${
            dragging
              ? "bg-white text-black border-white font-bold"
              : isInteractive
                ? "bg-neutral-950/90 text-white border-neutral-600"
                : "bg-black/80 text-neutral-400 border-neutral-800"
          }`}
          style={{ borderColor: isInteractive ? color : undefined }}
        >
          {label}
        </div>
      </Html>
    </group>
  );
}

// Optional 3D length badge at segment midpoint
function LengthBadge({
  p1,
  p2,
  label,
  visible,
}: {
  p1: THREE.Vector3;
  p2: THREE.Vector3;
  label: string;
  visible: boolean;
}) {
  if (!visible) return null;
  const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
  return (
    <Html
      position={mid.add(new THREE.Vector3(0, 0.22, 0))}
      center
      distanceFactor={12}
    >
      <div className="px-1.5 py-0.5 rounded bg-neutral-900/90 border border-neutral-700 text-[10px] font-mono text-neutral-200 whitespace-nowrap pointer-events-none">
        {label}
      </div>
    </Html>
  );
}

export default function FullscreenProjectionScene() {
  const [selectedExample, setSelectedExample] = useState<ProjectionExample>(
    projectionExamples[0],
  );
  const [activeTab, setActiveTab] = useState<PropertyTab>(
    projectionExamples[0].type,
  );
  const [showRays, setShowRays] = useState(true);
  const [showLengths, setShowLengths] = useState(false);

  const [selectedLine, setSelectedLine] = useState<SelectedLineTarget>(null);
  const [gizmoMode, setGizmoMode] = useState<"translate" | "rotate">(
    "translate",
  );
  const [gizmoAnchor, setGizmoAnchor] = useState<THREE.Vector3>(
    () => new THREE.Vector3(),
  );
  const gizmoDummyRef = useRef<THREE.Group>(null);
  const dragStartState = useRef<{
    center: THREE.Vector3;
    dir: THREE.Vector3;
    anchorOffset: THREE.Vector3;
    startQuat: THREE.Quaternion;
  } | null>(null);

  const orbitRef = useRef<OrbitControlsImpl | null>(null);
  const [isInteracting, setIsInteracting] = useState(false);

  const [deltaCenter, setDeltaCenter] = useState<THREE.Vector3>(() =>
    cloneVector3(projectionExamples[0].deltaCenter),
  );
  const [deltaDir, setDeltaDir] = useState<THREE.Vector3>(() =>
    cloneVector3(projectionExamples[0].deltaDir).normalize(),
  );

  const [line1Center, setLine1Center] = useState<THREE.Vector3>(() =>
    cloneVector3(projectionExamples[0].line1Center),
  );
  const [line1Dir, setLine1Dir] = useState<THREE.Vector3>(() =>
    cloneVector3(projectionExamples[0].line1Dir).normalize(),
  );

  const [line2Center, setLine2Center] = useState<THREE.Vector3>(() =>
    cloneVector3(projectionExamples[1].line2Center!),
  );

  const [tVals, setTVals] = useState(projectionExamples[0].tValues);

  const loadExample = (ex: ProjectionExample) => {
    setSelectedExample(ex);
    setActiveTab(ex.type);
    setDeltaCenter(cloneVector3(ex.deltaCenter));
    setDeltaDir(cloneVector3(ex.deltaDir).normalize());
    setLine1Center(cloneVector3(ex.line1Center));
    setLine1Dir(cloneVector3(ex.line1Dir).normalize());
    if (ex.line2Center) {
      setLine2Center(cloneVector3(ex.line2Center));
    }
    setTVals({ ...ex.tValues });
    setSelectedLine(null);
  };

  useEffect(() => {
    if (gizmoDummyRef.current && selectedLine) {
      gizmoDummyRef.current.position.copy(gizmoAnchor);
      gizmoDummyRef.current.rotation.set(0, 0, 0);
      gizmoDummyRef.current.updateMatrixWorld();
    }
  }, [selectedLine, gizmoAnchor, gizmoMode]);

  // Determine if the current geometry uses 1 line (collinear) or 2 lines (parallel).
  const is1Line =
    activeTab === "collinearity" || selectedExample.line2Center === undefined;

  // Compute 3D Points and their Parallel Projections.
  const geom = useMemo(() => {
    const dir = deltaDir.clone().normalize();

    const A = line1Center.clone().addScaledVector(line1Dir, tVals.A);
    const B = line1Center.clone().addScaledVector(line1Dir, tVals.B);
    const C = (is1Line ? line1Center : line2Center)
      .clone()
      .addScaledVector(line1Dir, tVals.C);
    const D =
      tVals.D !== undefined
        ? (is1Line ? line1Center : line2Center)
            .clone()
            .addScaledVector(line1Dir, tVals.D)
        : null;

    return {
      A,
      B,
      C,
      D,
      A_p: projectPoint(A, dir),
      B_p: projectPoint(B, dir),
      C_p: projectPoint(C, dir),
      D_p: D ? projectPoint(D, dir) : null,
      hasD: D !== null,
    };
  }, [is1Line, line1Center, line1Dir, line2Center, tVals, deltaDir]);

  const stats = useMemo(() => {
    const ab = geom.A.distanceTo(geom.B);
    const ab_p = geom.A_p.distanceTo(geom.B_p);

    if (is1Line) {
      const bc = geom.B.distanceTo(geom.C);
      const bc_p = geom.B_p.distanceTo(geom.C_p);
      const cd = geom.hasD ? geom.C.distanceTo(geom.D!) : bc;
      const cd_p = geom.hasD ? geom.C_p.distanceTo(geom.D_p!) : bc_p;
      return {
        ratio: cd > 0.001 ? (ab / cd).toFixed(2) : "∞",
        ab: ab.toFixed(1),
        bc: bc.toFixed(1),
        cd: cd.toFixed(1),
        ab_p: ab_p.toFixed(1),
        bc_p: bc_p.toFixed(1),
        cd_p: cd_p.toFixed(1),
      };
    } else {
      const cd = geom.hasD ? geom.C.distanceTo(geom.D!) : 0;
      const cd_p = geom.hasD ? geom.C_p.distanceTo(geom.D_p!) : 0;
      return {
        ratio: cd > 0.001 ? (ab / cd).toFixed(2) : "∞",
        ab: ab.toFixed(1),
        bc: "0",
        cd: cd.toFixed(1),
        ab_p: ab_p.toFixed(1),
        bc_p: "0",
        cd_p: cd_p.toFixed(1),
      };
    }
  }, [is1Line, geom]);

  const updatePointT = (key: PointKey, newT: number) => {
    setTVals((prev) => ({ ...prev, [key]: newT }));
  };

  const collinearProjectedEnd = geom.hasD ? geom.D_p! : geom.C_p;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black text-white font-sans select-none">
      <Canvas
        camera={{ position: [7.5, 6.2, 8.8], fov: 42 }}
        onPointerMissed={() => setSelectedLine(null)}
      >
        <color attach="background" args={["#040404"]} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[8, 15, 8]} intensity={1.3} />

        {/* Projection Plane (α) */}
        <group>
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[300, 300]} />
            <meshStandardMaterial
              color="#151515"
              roughness={0.9}
              metalness={0.1}
              transparent
              opacity={0.85}
              depthWrite={false}
            />
          </mesh>
          <Grid
            args={[300, 300]}
            cellSize={1}
            cellThickness={0.75}
            cellColor="#1c1c1c"
            sectionSize={5}
            sectionThickness={1.2}
            sectionColor="#2e2e2e"
            fadeDistance={80}
            position={[0, 0.003, 0]}
          />
          <Html position={[-12.5, 0.1, 10.5]} center>
            <div className="px-2.5 py-1 rounded bg-neutral-950/90 border border-neutral-800 text-neutral-400 text-xs font-serif italic">
              Mặt phẳng (α)
            </div>
          </Html>
        </group>

        {/* Projection Direction Axis Δ - Thinner and colored cyan */}
        <InfiniteLine
          center={deltaCenter}
          dir={deltaDir}
          color={COLORS.Delta}
          lineWidth={1.5}
          arrowSize={[0.09, 0.26]}
          isProjectionAxis
          isSelected={selectedLine === "delta"}
          label="Phương Δ"
          onSelectLine={(hitPoint) => {
            setSelectedLine("delta");
            setGizmoAnchor(hitPoint);
          }}
        />

        {/* GEOMETRY */}
        {is1Line ? (
          <group>
            <InfiniteLine
              center={line1Center}
              dir={line1Dir}
              color="#d4d4d4"
              isSelected={selectedLine === "line1"}
              onSelectLine={(hitPoint) => {
                setSelectedLine("line1");
                setGizmoAnchor(hitPoint);
              }}
            />
            <InfiniteLine
              center={geom.A_p}
              dir={new THREE.Vector3()
                .subVectors(collinearProjectedEnd, geom.A_p)
                .normalize()}
              color="#737373"
              opacity={0.8}
            />

            {/* Draggable Points */}
            <DraggableLinePoint
              position={geom.A}
              label="A"
              color={COLORS.A}
              lineCenter={line1Center}
              lineDir={line1Dir}
              onDragT={(t) => updatePointT("A", t)}
              onDragStart={() => setIsInteracting(true)}
              onDragEnd={() => setIsInteracting(false)}
            />
            <DraggableLinePoint
              position={geom.B}
              label="B"
              color={COLORS.B}
              lineCenter={line1Center}
              lineDir={line1Dir}
              onDragT={(t) => updatePointT("B", t)}
              onDragStart={() => setIsInteracting(true)}
              onDragEnd={() => setIsInteracting(false)}
            />
            <DraggableLinePoint
              position={geom.C}
              label="C"
              color={COLORS.C}
              lineCenter={line1Center}
              lineDir={line1Dir}
              onDragT={(t) => updatePointT("C", t)}
              onDragStart={() => setIsInteracting(true)}
              onDragEnd={() => setIsInteracting(false)}
            />
            {geom.hasD && (
              <DraggableLinePoint
                position={geom.D!}
                label="D"
                color={COLORS.D}
                lineCenter={line1Center}
                lineDir={line1Dir}
                onDragT={(t) => updatePointT("D", t)}
                onDragStart={() => setIsInteracting(true)}
                onDragEnd={() => setIsInteracting(false)}
              />
            )}

            {/* Projected Points */}
            <DraggableLinePoint
              position={geom.A_p}
              label="A'"
              color={COLORS.A}
              opacity={0.6}
              isInteractive={false}
            />
            <DraggableLinePoint
              position={geom.B_p}
              label="B'"
              color={COLORS.B}
              opacity={0.6}
              isInteractive={false}
            />
            <DraggableLinePoint
              position={geom.C_p}
              label="C'"
              color={COLORS.C}
              opacity={0.6}
              isInteractive={false}
            />
            {geom.hasD && (
              <DraggableLinePoint
                position={geom.D_p!}
                label="D'"
                color={COLORS.D}
                opacity={0.6}
                isInteractive={false}
              />
            )}

            {/* Length Badges */}
            <LengthBadge
              label={stats.ab}
              p1={geom.A}
              p2={geom.B}
              visible={showLengths}
            />
            <LengthBadge
              label={geom.hasD ? stats.cd : stats.bc}
              p1={geom.hasD ? geom.C : geom.B}
              p2={geom.hasD ? geom.D! : geom.C}
              visible={showLengths}
            />
            <LengthBadge
              label={stats.ab_p}
              p1={geom.A_p}
              p2={geom.B_p}
              visible={showLengths}
            />
            <LengthBadge
              label={geom.hasD ? stats.cd_p : stats.bc_p}
              p1={geom.hasD ? geom.C_p : geom.B_p}
              p2={geom.hasD ? geom.D_p! : geom.C_p}
              visible={showLengths}
            />

            {/* Infinite projection rays with direction cones */}
            <InfiniteProjectionRay
              center={geom.A}
              dir={deltaDir}
              color={COLORS.A}
              visible={showRays}
            />
            <InfiniteProjectionRay
              center={geom.B}
              dir={deltaDir}
              color={COLORS.B}
              visible={showRays}
            />
            <InfiniteProjectionRay
              center={geom.C}
              dir={deltaDir}
              color={COLORS.C}
              visible={showRays}
            />
            {geom.hasD && (
              <InfiniteProjectionRay
                center={geom.D!}
                dir={deltaDir}
                color={COLORS.D}
                visible={showRays}
              />
            )}
          </group>
        ) : (
          <group>
            <InfiniteLine
              center={line1Center}
              dir={line1Dir}
              color="#f8fafc"
              isSelected={selectedLine === "line1"}
              onSelectLine={(hitPoint) => {
                setSelectedLine("line1");
                setGizmoAnchor(hitPoint);
              }}
            />
            <InfiniteLine
              center={line2Center}
              dir={line1Dir}
              color="#94a3b8"
              isSelected={selectedLine === "line2"}
              onSelectLine={(hitPoint) => {
                setSelectedLine("line2");
                setGizmoAnchor(hitPoint);
              }}
            />

            {/* Projected Parallel Lines */}
            <InfiniteLine
              center={geom.A_p}
              dir={new THREE.Vector3()
                .subVectors(geom.B_p, geom.A_p)
                .normalize()}
              color="#64748b"
              opacity={0.8}
            />
            {geom.hasD && (
              <InfiniteLine
                center={geom.C_p}
                dir={new THREE.Vector3()
                  .subVectors(geom.D_p!, geom.C_p)
                  .normalize()}
                color="#475569"
                opacity={0.8}
              />
            )}

            {/* Draggable Points */}
            <DraggableLinePoint
              position={geom.A}
              label="A"
              color={COLORS.A}
              lineCenter={line1Center}
              lineDir={line1Dir}
              onDragT={(t) => updatePointT("A", t)}
              onDragStart={() => setIsInteracting(true)}
              onDragEnd={() => setIsInteracting(false)}
            />
            <DraggableLinePoint
              position={geom.B}
              label="B"
              color={COLORS.B}
              lineCenter={line1Center}
              lineDir={line1Dir}
              onDragT={(t) => updatePointT("B", t)}
              onDragStart={() => setIsInteracting(true)}
              onDragEnd={() => setIsInteracting(false)}
            />
            <DraggableLinePoint
              position={geom.C}
              label="C"
              color={COLORS.C}
              lineCenter={line2Center}
              lineDir={line1Dir}
              onDragT={(t) => updatePointT("C", t)}
              onDragStart={() => setIsInteracting(true)}
              onDragEnd={() => setIsInteracting(false)}
            />
            {geom.hasD && (
              <DraggableLinePoint
                position={geom.D!}
                label="D"
                color={COLORS.D}
                lineCenter={line2Center}
                lineDir={line1Dir}
                onDragT={(t) => updatePointT("D", t)}
                onDragStart={() => setIsInteracting(true)}
                onDragEnd={() => setIsInteracting(false)}
              />
            )}

            {/* Projected Points */}
            <DraggableLinePoint
              position={geom.A_p}
              label="A'"
              color={COLORS.A}
              opacity={0.6}
              isInteractive={false}
            />
            <DraggableLinePoint
              position={geom.B_p}
              label="B'"
              color={COLORS.B}
              opacity={0.6}
              isInteractive={false}
            />
            <DraggableLinePoint
              position={geom.C_p}
              label="C'"
              color={COLORS.C}
              opacity={0.6}
              isInteractive={false}
            />
            {geom.hasD && (
              <DraggableLinePoint
                position={geom.D_p!}
                label="D'"
                color={COLORS.D}
                opacity={0.6}
                isInteractive={false}
              />
            )}

            {/* Length Badges */}
            <LengthBadge
              label={stats.ab}
              p1={geom.A}
              p2={geom.B}
              visible={showLengths}
            />
            {geom.hasD && (
              <LengthBadge
                label={stats.cd}
                p1={geom.C}
                p2={geom.D!}
                visible={showLengths}
              />
            )}
            <LengthBadge
              label={stats.ab_p}
              p1={geom.A_p}
              p2={geom.B_p}
              visible={showLengths}
            />
            {geom.hasD && (
              <LengthBadge
                label={stats.cd_p}
                p1={geom.C_p}
                p2={geom.D_p!}
                visible={showLengths}
              />
            )}

            {/* Infinite projection rays with direction cones */}
            <InfiniteProjectionRay
              center={geom.A}
              dir={deltaDir}
              color={COLORS.A}
              visible={showRays}
            />
            <InfiniteProjectionRay
              center={geom.B}
              dir={deltaDir}
              color={COLORS.B}
              visible={showRays}
            />
            <InfiniteProjectionRay
              center={geom.C}
              dir={deltaDir}
              color={COLORS.C}
              visible={showRays}
            />
            {geom.hasD && (
              <InfiniteProjectionRay
                center={geom.D!}
                dir={deltaDir}
                color={COLORS.D}
                visible={showRays}
              />
            )}
          </group>
        )}

        {/* GIZMO */}
        <group ref={gizmoDummyRef} />
        {selectedLine && (
          <TransformControls
            object={gizmoDummyRef as React.RefObject<THREE.Object3D>}
            mode={gizmoMode}
            size={0.8}
            onMouseDown={() => {
              setIsInteracting(true);
              if (!gizmoDummyRef.current) return;
              const currentCenter =
                selectedLine === "delta"
                  ? deltaCenter
                  : selectedLine === "line1"
                    ? line1Center
                    : line2Center;
              const currentDir = selectedLine === "delta" ? deltaDir : line1Dir;
              dragStartState.current = {
                center: currentCenter.clone(),
                dir: currentDir.clone(),
                anchorOffset: currentCenter
                  .clone()
                  .sub(gizmoDummyRef.current.position),
                startQuat: gizmoDummyRef.current.quaternion.clone(),
              };
            }}
            onMouseUp={() => {
              setIsInteracting(false);
              if (gizmoDummyRef.current) {
                setGizmoAnchor(gizmoDummyRef.current.position.clone());
              }
              dragStartState.current = null;
            }}
            onObjectChange={() => {
              const obj = gizmoDummyRef.current;
              const snap = dragStartState.current;
              if (!obj || !snap) return;

              if (gizmoMode === "translate") {
                const newCenter = obj.position.clone().add(snap.anchorOffset);
                if (selectedLine === "delta") setDeltaCenter(newCenter);
                if (selectedLine === "line1") setLine1Center(newCenter);
                if (selectedLine === "line2") setLine2Center(newCenter);
              } else {
                const deltaQuat = obj.quaternion
                  .clone()
                  .multiply(snap.startQuat.clone().invert());
                const newDir = snap.dir
                  .clone()
                  .applyQuaternion(deltaQuat)
                  .normalize();
                const rotatedCenter = obj.position
                  .clone()
                  .add(snap.anchorOffset.clone().applyQuaternion(deltaQuat));

                if (selectedLine === "delta") {
                  if (newDir.y > -0.15) newDir.y = -0.15;
                  newDir.normalize();
                  setDeltaDir(newDir);
                  setDeltaCenter(rotatedCenter);
                } else {
                  setLine1Dir(newDir);
                  if (selectedLine === "line1") setLine1Center(rotatedCenter);
                  if (selectedLine === "line2") setLine2Center(rotatedCenter);
                }
              }
            }}
          />
        )}

        <OrbitControls
          ref={orbitRef}
          makeDefault
          enabled={!isInteracting}
          minDistance={4}
          maxDistance={100}
          minPolarAngle={0.1}
          maxPolarAngle={Math.PI / 2 - 0.05}
        />
      </Canvas>

      {/* TOP ACTION BAR */}
      <div className="fixed top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
          <div className="bg-neutral-950/90 backdrop-blur-md border border-neutral-800 p-1 rounded-2xl flex items-center gap-1 shadow-xl">
            <div className="px-2.5 py-1.5 text-white flex items-center gap-1.5 border-r border-neutral-800 mr-0.5">
              <Link href="/">
                <ArrowBigLeft className="w-4 h-4" />
              </Link>
            </div>
            {(
              [
                { id: "collinearity", label: "1. Thẳng hàng" },
                { id: "parallelism", label: "2. Song song" },
                { id: "ratio", label: "3. Tỉ số" },
              ] as { id: PropertyTab; label: string }[]
            ).map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSelectedLine(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    active
                      ? "bg-white text-black"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="bg-neutral-950/90 backdrop-blur-md border border-neutral-800 p-1 rounded-2xl flex items-center gap-1 shadow-xl">
            {projectionExamples.map((ex) => (
              <button
                key={ex.id}
                onClick={() => loadExample(ex)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition ${
                  selectedExample.id === ex.id
                    ? "bg-neutral-800 text-white border border-neutral-600"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                {ex.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
          {/* Ratio Box - Enlarged */}
          {activeTab === "ratio" && geom.hasD && (
            <div className="bg-neutral-950/90 backdrop-blur-md border-2 border-neutral-500 px-6 py-3 rounded-2xl text-sm md:text-base text-white shadow-2xl">
              <InlineMath
                math={`\\frac{A'B'}{C'D'} = \\frac{AB}{CD} = ${stats.ratio}`}
              />
            </div>
          )}

          {selectedLine && (
            <div className="bg-neutral-950/90 backdrop-blur-md border border-neutral-700 p-1 rounded-2xl flex items-center gap-1 shadow-xl">
              <button
                onClick={() => setGizmoMode("translate")}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1 transition ${
                  gizmoMode === "translate"
                    ? "bg-white text-black font-semibold"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                <Move className="w-3.5 h-3.5" />
                <span>Di chuyển</span>
              </button>
              <button
                onClick={() => setGizmoMode("rotate")}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1 transition ${
                  gizmoMode === "rotate"
                    ? "bg-white text-black font-semibold"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Xoay</span>
              </button>
            </div>
          )}

          <div className="bg-neutral-950/90 backdrop-blur-md border border-neutral-800 p-1 rounded-2xl flex items-center gap-1 shadow-xl">
            <button
              onClick={() => setShowRays((v) => !v)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition ${
                showRays
                  ? "bg-neutral-800 text-white"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Tia chiếu</span>
            </button>

            <button
              onClick={() => setShowLengths((v) => !v)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition ${
                showLengths
                  ? "bg-white text-black font-semibold"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Độ dài</span>
            </button>

            <button
              onClick={() => loadExample(selectedExample)}
              className="px-2.5 py-1.5 rounded-xl text-xs text-neutral-400 hover:text-white hover:bg-neutral-900 transition"
              title="Đặt lại ví dụ"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
