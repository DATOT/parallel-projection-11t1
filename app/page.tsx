"use client";

import React, { useRef, useState, useMemo } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Line, Grid, Html } from "@react-three/drei";
import {
  MoveRight,
  Spline,
  Scaling,
  BookOpen,
  ChevronDown,
  Move,
  SlidersHorizontal,
} from "lucide-react";

// --- 3D Math Helper ---
function projectPoint(p: THREE.Vector3, dir: THREE.Vector3): THREE.Vector3 {
  const safeY = Math.abs(dir.y) < 0.08 ? (dir.y >= 0 ? 0.08 : -0.08) : dir.y;
  const t = -p.y / safeY;
  return new THREE.Vector3(p.x + t * dir.x, 0.015, p.z + t * dir.z);
}

// --- Helper for 3D Length Labels ---
const LengthLabel = ({
  start,
  end,
  label,
}: {
  start: THREE.Vector3;
  end: THREE.Vector3;
  label: string;
}) => {
  const mid = start.clone().add(end).multiplyScalar(0.5);
  return (
    <Html position={[mid.x, mid.y + 0.4, mid.z]} center zIndexRange={[100, 0]}>
      <div className="px-2 py-1 rounded bg-blue-600 opacity-25 border border-blue-400 text-white font-mono text-[11px] font-bold whitespace-nowrap shadow-lg pointer-events-none">
        {label}
      </div>
    </Html>
  );
};

// --- Interactive 3D Mini Scene ---
type MiniSceneType = "collinear" | "parallel" | "ratio";

const MiniInteractiveScene = ({ type }: { type: MiniSceneType }) => {
  // Controls for projection direction
  const [dirX, setDirX] = useState(0.2);
  const [dirZ, setDirZ] = useState(0.2);

  // Controls for Ratio Mode
  const [distAB, setDistAB] = useState(4);
  const [distCD, setDistCD] = useState(4);
  const [showLengths, setShowLengths] = useState(false);

  // Projection Direction Vector
  const dir = useMemo(
    () => new THREE.Vector3(dirX, -1, dirZ).normalize(),
    [dirX, dirZ],
  );

  // Geometry Setup
  const { points, lines, projectedPoints, projectedLines } = useMemo(() => {
    let pts: { pos: THREE.Vector3; color: string; label: string }[] = [];
    let lns: { start: THREE.Vector3; end: THREE.Vector3; color: string }[] = [];

    if (type === "collinear") {
      const A = new THREE.Vector3(-2, 3, 0);
      const B = new THREE.Vector3(0, 3, 0);
      const C = new THREE.Vector3(2, 3, 0);

      pts = [
        { pos: A, color: "#f87171", label: "A" },
        { pos: B, color: "#4ade80", label: "B" },
        { pos: C, color: "#60a5fa", label: "C" },
      ];
      lns = [
        {
          start: A.clone().sub(new THREE.Vector3(2, 0, 0)),
          end: C.clone().add(new THREE.Vector3(2, 0, 0)),
          color: "#fff",
        },
      ];
    } else if (type === "parallel") {
      const D1 = new THREE.Vector3(-2, 4, 1);
      const D2 = new THREE.Vector3(2, 4, 1);
      const E1 = new THREE.Vector3(-1, 2.5, -1);
      const E2 = new THREE.Vector3(3, 2.5, -1);

      pts = [
        { pos: D1, color: "#f87171", label: "A" },
        { pos: D2, color: "#4ade80", label: "B" },
        { pos: E1, color: "#60a5fa", label: "C" },
        { pos: E2, color: "#facc15", label: "D" },
      ];
      lns = [
        {
          start: D1.clone().sub(new THREE.Vector3(1, 0, 0)),
          end: D2.clone().add(new THREE.Vector3(1, 0, 0)),
          color: "#fff",
        },
        {
          start: E1.clone().sub(new THREE.Vector3(1, 0, 0)),
          end: E2.clone().add(new THREE.Vector3(1, 0, 0)),
          color: "#a3a3a3",
        },
      ];
    } else {
      // Ratio Mode
      const A = new THREE.Vector3(-2, 4, 1);
      const B = new THREE.Vector3(-2 + distAB, 4, 1);
      const C = new THREE.Vector3(-1, 2.5, -1);
      const D = new THREE.Vector3(-1 + distCD, 2.5, -1);

      pts = [
        { pos: A, color: "#f87171", label: "A" },
        { pos: B, color: "#4ade80", label: "B" },
        { pos: C, color: "#60a5fa", label: "C" },
        { pos: D, color: "#facc15", label: "D" },
      ];
      lns = [
        {
          start: A.clone().sub(new THREE.Vector3(1, 0, 0)),
          end: B.clone().add(new THREE.Vector3(1, 0, 0)),
          color: "#fff",
        },
        {
          start: C.clone().sub(new THREE.Vector3(1, 0, 0)),
          end: D.clone().add(new THREE.Vector3(1, 0, 0)),
          color: "#a3a3a3",
        },
      ];
    }

    // Calculate projected points
    const proj = pts.map((pt) => ({
      ...pt,
      pos: projectPoint(pt.pos, dir),
      label: pt.label + "'",
    }));

    // Calculate projected lines
    const projLns: {
      start: THREE.Vector3;
      end: THREE.Vector3;
      color: string;
    }[] = [];
    if (type === "collinear") {
      projLns.push({ start: proj[0].pos, end: proj[2].pos, color: "#fff" });
    } else {
      projLns.push(
        { start: proj[0].pos, end: proj[1].pos, color: "#fff" },
        { start: proj[2].pos, end: proj[3].pos, color: "#a3a3a3" },
      );
    }

    return {
      points: pts,
      lines: lns,
      projectedPoints: proj,
      projectedLines: projLns,
    };
  }, [type, dir, distAB, distCD]);

  // Helper to format lengths for display
  const formatLength = (p1: THREE.Vector3, p2: THREE.Vector3) =>
    p1.distanceTo(p2).toFixed(1);

  return (
    <div className="w-full h-full min-h-[500px] flex flex-col">
      {/* 3D Viewport */}
      <div className="relative w-full h-[420px] lg:h-[480px] shrink-0">
        <Canvas
          className="!w-full !h-full"
          style={{ width: "100%", height: "100%", display: "block" }}
          camera={{
            position: [8, 7, 12],
            fov: 45,
            near: 0.1,
            far: 100,
          }}
        >
          <color attach="background" args={["#0f0f0f"]} />
          <ambientLight intensity={0.8} />
          <directionalLight position={[5, 10, 5]} intensity={1} />

          {/* Plane */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[20, 20]} />
            <meshStandardMaterial
              color="#1a1a1a"
              transparent
              opacity={0.6}
              depthWrite={false}
            />
          </mesh>
          <Grid
            args={[20, 20]}
            cellSize={1}
            cellColor="#333"
            sectionSize={5}
            sectionColor="#555"
            position={[0, 0.01, 0]}
          />

          {/* Original Lines - Added dynamic keys to prevent geometry loss */}
          {lines.map((ln, i) => (
            <Line
              key={`l-${i}-${ln.start.x.toFixed(2)}-${ln.end.x.toFixed(2)}`}
              points={[ln.start, ln.end]}
              color={ln.color}
              lineWidth={2}
            />
          ))}

          {/* Projection Rays - Added dynamic keys */}
          {points.map((pt, i) => (
            <Line
              key={`ray-${i}-${pt.pos.x.toFixed(2)}-${projectedPoints[i].pos.x.toFixed(2)}`}
              points={[pt.pos, projectedPoints[i].pos]}
              color="#555"
              lineWidth={1}
              dashed
              dashSize={0.2}
              gapSize={0.1}
            />
          ))}

          {/* Original Points & Labels */}
          {points.map((pt, i) => (
            <group key={`p-${i}`} position={pt.pos}>
              <mesh>
                <sphereGeometry args={[0.12, 16, 16]} />
                <meshStandardMaterial
                  color={pt.color}
                  emissive={pt.color}
                  emissiveIntensity={0.4}
                />
              </mesh>
              <Html position={[0, 0.25, 0]} center zIndexRange={[10, 0]}>
                <div className="px-1.5 py-0.5 rounded bg-black/60 border border-white/20 text-[10px] font-mono text-neutral-400 pointer-events-none">
                  {pt.label}
                </div>
              </Html>
            </group>
          ))}

          {/* Projected Points & Labels */}
          {projectedPoints.map((pt, i) => (
            <group key={`pp-${i}`} position={pt.pos}>
              <mesh>
                <sphereGeometry args={[0.1, 16, 16]} />
                <meshStandardMaterial
                  color={pt.color}
                  opacity={0.6}
                  transparent
                />
              </mesh>

              <Html position={[0, 0.25, 0]} center zIndexRange={[10, 0]}>
                <div className="px-1.5 py-0.5 rounded bg-black/60 border border-white/20 text-[10px] font-mono text-neutral-400 pointer-events-none">
                  {pt.label}
                </div>
              </Html>
            </group>
          ))}

          {/* Projected Lines - Added dynamic keys */}
          {projectedLines.map((ln, i) => (
            <Line
              key={`pl-${i}-${ln.start.x.toFixed(2)}-${ln.end.x.toFixed(2)}`}
              points={[ln.start, ln.end]}
              color={ln.color}
              lineWidth={2}
              opacity={0.5}
              transparent
            />
          ))}

          {/* Dynamic Length Labels (Ratio Mode Only) */}
          {type === "ratio" && showLengths && (
            <>
              <LengthLabel
                start={points[0].pos}
                end={points[1].pos}
                label={`AB = ${formatLength(points[0].pos, points[1].pos)}`}
              />
              <LengthLabel
                start={points[2].pos}
                end={points[3].pos}
                label={`CD = ${formatLength(points[2].pos, points[3].pos)}`}
              />
              <LengthLabel
                start={projectedPoints[0].pos}
                end={projectedPoints[1].pos}
                label={`A'B' = ${formatLength(projectedPoints[0].pos, projectedPoints[1].pos)}`}
              />
              <LengthLabel
                start={projectedPoints[2].pos}
                end={projectedPoints[3].pos}
                label={`C'D' = ${formatLength(projectedPoints[2].pos, projectedPoints[3].pos)}`}
              />
            </>
          )}

          <OrbitControls
            enableZoom={false}
            enablePan={false}
            autoRotate
            autoRotateSpeed={0.5}
            maxPolarAngle={Math.PI / 2 - 0.05}
            target={[0, 3, 0]} // Centered view to prevent label clipping
          />
        </Canvas>
      </div>

      {/* Controls Area (Outside Canvas) */}
      <div className="p-4 bg-neutral-950 border-t border-white/10 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <SlidersHorizontal className="w-4 h-4 text-neutral-500" />
          <span className="text-xs font-sans uppercase tracking-widest text-neutral-400 w-16">
            Trục X
          </span>
          <input
            type="range"
            min="-1.5"
            max="1.5"
            step="0.05"
            value={dirX}
            onChange={(e) => setDirX(parseFloat(e.target.value))}
            className="flex-1 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-white"
          />
          <span className="text-xs font-mono text-neutral-400 w-12 text-right">
            {dirX.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <SlidersHorizontal className="w-4 h-4 text-neutral-500" />
          <span className="text-xs font-sans uppercase tracking-widest text-neutral-400 w-16">
            Trục Z
          </span>
          <input
            type="range"
            min="-1.5"
            max="1.5"
            step="0.05"
            value={dirZ}
            onChange={(e) => setDirZ(parseFloat(e.target.value))}
            className="flex-1 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-white"
          />
          <span className="text-xs font-mono text-neutral-400 w-12 text-right">
            {dirZ.toFixed(2)}
          </span>
        </div>

        {/* Ratio Mode Specific Controls */}
        {type === "ratio" && (
          <>
            <div className="w-full h-[1px] bg-white/10 my-1" />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showLengths}
                  onChange={(e) => setShowLengths(e.target.checked)}
                  className="w-4 h-4 accent-white cursor-pointer"
                />
                <span className="text-xs font-sans uppercase tracking-widest text-neutral-400">
                  Hiển thị độ dài
                </span>
              </label>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-sans uppercase tracking-widest text-neutral-400 w-16">
                Độ dài AB
              </span>
              <input
                type="range"
                min="1"
                max="5"
                step="0.1"
                value={distAB}
                onChange={(e) => setDistAB(parseFloat(e.target.value))}
                className="flex-1 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-white"
              />
              <span className="text-xs font-mono text-neutral-400 w-12 text-right">
                {distAB.toFixed(1)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-sans uppercase tracking-widest text-neutral-400 w-16">
                Độ dài CD
              </span>
              <input
                type="range"
                min="1"
                max="5"
                step="0.1"
                value={distCD}
                onChange={(e) => setDistCD(parseFloat(e.target.value))}
                className="flex-1 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-white"
              />
              <span className="text-xs font-mono text-neutral-400 w-12 text-right">
                {distCD.toFixed(1)}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// --- Helper Components for Animations ---

const RevealText = ({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-100px" }}
    transition={{ duration: 0.8, ease: "easeOut", delay }}
  >
    {children}
  </motion.div>
);

const PropertyCard = ({
  number,
  title,
  icon,
  description,
  math,
  visual,
  reverse = false,
}: {
  number: string;
  title: string;
  icon: React.ReactNode;
  description: React.ReactNode;
  math: React.ReactNode;
  visual: React.ReactNode;
  reverse?: boolean;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 50 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-100px" }}
    transition={{ duration: 0.7, ease: "easeOut" }}
    className={`flex flex-col ${
      reverse ? "lg:flex-row-reverse" : "lg:flex-row"
    } gap-12 items-center justify-between py-24 border-b border-white/10 last:border-0`}
  >
    <div className="flex-1 space-y-6">
      <div className="flex items-center gap-4 text-neutral-400 font-sans text-sm tracking-widest uppercase">
        <span className="flex items-center justify-center w-8 h-8 rounded-full border border-white/20 bg-white/5">
          {number}
        </span>
        {icon}
        <span>{title}</span>
      </div>
      <h2 className="text-3xl md:text-4xl font-serif leading-tight text-white/90">
        {description}
      </h2>
      <div className="p-6 bg-white/5 border border-white/10 rounded-2xl font-serif text-xl text-neutral-200 shadow-2xl">
        {math}
      </div>
    </div>
    <div
      className="
    flex-1 w-full min-w-0
    min-h-[500px]
    lg:min-h-[600px]
    flex flex-col
    bg-neutral-950
    border border-white/10
    rounded-3xl
    shadow-2xl
    overflow-hidden
    relative group
  "
    >
      <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-10" />

      <div className="flex-1 min-h-0">{visual}</div>
    </div>
  </motion.div>
);

// --- Main Page Component ---

export default function TheoryPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll Progress for the top bar
  const { scrollYProgress } = useScroll();
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <div
      ref={containerRef}
      className="relative min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-white selection:text-black"
    >
      {/* Scroll Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-white origin-left z-50"
        style={{ scaleX }}
      />

      {/* Top Navbar */}
      <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-40 px-6 py-3 bg-neutral-900/80 backdrop-blur-md border border-white/10 rounded-full flex items-center gap-6 shadow-2xl">
        <div className="flex items-center gap-2 text-sm font-semibold tracking-wide">
          <BookOpen className="w-4 h-4" />
          <span className="hidden md:block">Hình học 11</span>
        </div>
        <div className="h-4 w-[1px] bg-white/20" />
        <div className="flex gap-4 text-xs font-medium text-neutral-400">
          <a href="#property-1" className="hover:text-white transition-colors">
            Thẳng hàng
          </a>
          <a href="#property-2" className="hover:text-white transition-colors">
            Song song
          </a>
          <a href="#property-3" className="hover:text-white transition-colors">
            Tỉ số
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative h-screen flex flex-col items-center justify-center px-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="max-w-4xl space-y-8 flex flex-col items-center"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-neutral-300">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            Chương IV: Quan hệ song song trong không gian
          </div>
          <h1 className="text-5xl md:text-7xl font-serif leading-tight">
            Tính chất của <br />
            <span className="italic text-transparent bg-clip-text bg-gradient-to-r from-white via-neutral-200 to-neutral-500">
              Phép chiếu song song
            </span>
          </h1>
          <p className="text-lg md:text-xl text-neutral-400 max-w-2xl mx-auto font-light leading-relaxed">
            Phép chiếu song song là công cụ đắc lực giúp biểu diễn các hình
            không gian lên mặt phẳng, bảo toàn những tính chất hình học quan
            trọng. Hãy cùng khám phá 3 tính chất cốt lõi dưới đây.
          </p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="pt-6"
          >
            <Link href="/simulation">
              <button className="group relative flex items-center gap-3 px-8 py-4 bg-white text-black font-semibold rounded-full shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95 transition-all duration-300 ease-out">
                <span>Mô phỏng 3D</span>
              </button>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-6 md:px-12 pb-32">
        <div className="space-y-12">
          {/* Property 1 */}
          <div id="property-1">
            <PropertyCard
              number="1"
              title="Tính chất bảo toàn sự thẳng hàng"
              icon={<MoveRight className="w-5 h-5 text-blue-400" />}
              description={
                <>
                  Phép chiếu song song biến ba điểm <strong>thẳng hàng</strong>{" "}
                  thành ba điểm thẳng hàng và{" "}
                  <strong>không làm thay đổi thứ tự</strong> của ba điểm đó.
                </>
              }
              math={
                <div className="space-y-4 text-center">
                  <p className="text-sm text-neutral-400 font-sans uppercase tracking-widest">
                    Hệ quả
                  </p>
                  <div className="text-2xl">
                    <InlineMath math="A, B, C" /> thẳng hàng{" "}
                    <InlineMath math="\Rightarrow" />{" "}
                    <InlineMath math="A', B', C'" /> thẳng hàng
                  </div>
                </div>
              }
              visual={<MiniInteractiveScene type="collinear" />}
              reverse={false}
            />
          </div>

          {/* Property 2 */}
          <div id="property-2">
            <PropertyCard
              number="2"
              title="Tính chất bảo toàn sự song song"
              icon={<Spline className="w-5 h-5 text-green-400" />}
              description={
                <>
                  Phép chiếu song song biến hai đường thẳng{" "}
                  <strong>song song</strong> thành hai đường thẳng song song
                  hoặc <strong>trùng nhau</strong>.
                </>
              }
              math={
                <div className="space-y-4 text-center">
                  <p className="text-sm text-neutral-400 font-sans uppercase tracking-widest">
                    Hệ quả
                  </p>
                  <div className="text-2xl flex items-center justify-center gap-4">
                    <span>
                      <InlineMath math="a \parallel b" />
                    </span>
                    <MoveRight className="w-6 h-6 text-neutral-500" />
                    <span>
                      <InlineMath math="a' \parallel b' \text{ hoặc } a' \equiv b'" />
                    </span>
                  </div>
                </div>
              }
              visual={<MiniInteractiveScene type="parallel" />}
              reverse={true}
            />
          </div>

          {/* Property 3 */}
          <div id="property-3">
            <PropertyCard
              number="3"
              title="Tính chất bảo toàn tỉ số"
              icon={<Scaling className="w-5 h-5 text-purple-400" />}
              description={
                <>
                  Phép chiếu song song <strong>giữ nguyên tỉ số độ dài</strong>{" "}
                  của hai đoạn thẳng cùng nằm trên một đường thẳng hoặc nằm trên
                  hai đường thẳng song song.
                </>
              }
              math={
                <div className="space-y-4 text-center">
                  <p className="text-sm text-neutral-400 font-sans uppercase tracking-widest">
                    Công thức
                  </p>
                  <div className="text-3xl">
                    <BlockMath math="\frac{AB}{CD} = \frac{A'B'}{C'D'}" />
                  </div>
                </div>
              }
              visual={<MiniInteractiveScene type="ratio" />}
              reverse={false}
            />
          </div>
        </div>

        {/* Summary Table */}
        <section className="py-24">
          <RevealText>
            <div className="text-center mb-12">
              <h2 className="text-4xl font-serif mb-4">Tổng kết lý thuyết</h2>
              <p className="text-neutral-400">
                Bảng tóm tắt các tính chất của phép chiếu song song
              </p>
            </div>
          </RevealText>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="w-full overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/50 backdrop-blur-sm"
          >
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="p-6 text-sm font-sans uppercase tracking-widest text-neutral-400 font-medium">
                    Đối tượng ban đầu
                  </th>
                  <th className="p-6 text-sm font-sans uppercase tracking-widest text-neutral-400 font-medium">
                    Phép chiếu song song
                  </th>
                  <th className="p-6 text-sm font-sans uppercase tracking-widest text-neutral-400 font-medium">
                    Hình ảnh chiếu
                  </th>
                </tr>
              </thead>
              <tbody className="text-lg font-serif">
                <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-6 text-neutral-200">Ba điểm thẳng hàng</td>
                  <td className="p-6 flex items-center justify-center">
                    <MoveRight className="w-5 h-5 text-neutral-600" />
                  </td>
                  <td className="p-6 text-neutral-200">
                    Ba điểm thẳng hàng (giữ nguyên thứ tự)
                  </td>
                </tr>
                <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-6 text-neutral-200">
                    Hai đường thẳng song song
                  </td>
                  <td className="p-6 flex items-center justify-center">
                    <MoveRight className="w-5 h-5 text-neutral-600" />
                  </td>
                  <td className="p-6 text-neutral-200">
                    Hai đường thẳng song song hoặc trùng nhau
                  </td>
                </tr>
                <tr className="hover:bg-white/5 transition-colors">
                  <td className="p-6 text-neutral-200">
                    Đoạn thẳng <InlineMath math="AB, CD" />
                  </td>
                  <td className="p-6 flex items-center justify-center">
                    <MoveRight className="w-5 h-5 text-neutral-600" />
                  </td>
                  <td className="p-6 text-neutral-200">
                    Giữ nguyên tỉ số{" "}
                    <InlineMath math="\frac{AB}{CD} = \frac{A'B'}{C'D'}" />
                  </td>
                </tr>
              </tbody>
            </table>
          </motion.div>
        </section>
      </main>
    </div>
  );
}
