"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { Grid, Html, Line, OrbitControls } from "@react-three/drei";
import { BookOpen, MoveRight, Scaling, SlidersHorizontal, Spline } from "lucide-react";

function projectPoint(point: THREE.Vector3, direction: THREE.Vector3) {
  const safeY = Math.abs(direction.y) < 0.08
    ? (direction.y >= 0 ? 0.08 : -0.08)
    : direction.y;
  const t = -point.y / safeY;
  return new THREE.Vector3(point.x + t * direction.x, 0.015, point.z + t * direction.z);
}

type MiniSceneType = "collinear" | "parallel" | "ratio";
type ScenePoint = { pos: THREE.Vector3; color: string; label: string };
type SceneLine = { start: THREE.Vector3; end: THREE.Vector3; color: string };

function MiniInteractiveScene({ type }: { type: MiniSceneType }) {
  const [dirX, setDirX] = useState(0.2);
  const [dirZ, setDirZ] = useState(0.2);
  const [distAB, setDistAB] = useState(4);
  const [distCD, setDistCD] = useState(4);
  const [slopeDegrees, setSlopeDegrees] = useState(0);
  const [showLengths, setShowLengths] = useState(false);
  const direction = useMemo(() => new THREE.Vector3(dirX, -1, dirZ).normalize(), [dirX, dirZ]);

  const { points, lines, projectedPoints, projectedLines } = useMemo(() => {
    let pts: ScenePoint[] = [];
    let lns: SceneLine[] = [];
    const angle = THREE.MathUtils.degToRad(slopeDegrees);
    // Rotate both real segments together in the vertical (x-y) plane. Their
    // lengths and parallelism are preserved while the slope changes.
    const segment = new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0);

    if (type === "collinear") {
      const A = new THREE.Vector3(-2, 3, 0);
      const B = new THREE.Vector3(0, 3, 0);
      const C = new THREE.Vector3(2, 3, 0);
      pts = [
        { pos: A, color: "#f87171", label: "A" },
        { pos: B, color: "#4ade80", label: "B" },
        { pos: C, color: "#60a5fa", label: "C" },
      ];
      lns = [{ start: A.clone().add(new THREE.Vector3(-2, 0, 0)), end: C.clone().add(new THREE.Vector3(2, 0, 0)), color: "#fff" }];
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
        { start: D1.clone().add(new THREE.Vector3(-1, 0, 0)), end: D2.clone().add(new THREE.Vector3(1, 0, 0)), color: "#fff" },
        { start: E1.clone().add(new THREE.Vector3(-1, 0, 0)), end: E2.clone().add(new THREE.Vector3(1, 0, 0)), color: "#a3a3a3" },
      ];
    } else {
      const A = new THREE.Vector3(-2, 4, 1);
      const B = A.clone().addScaledVector(segment, distAB);
      const C = new THREE.Vector3(-1, 2.5, -1);
      const D = C.clone().addScaledVector(segment, distCD);
      pts = [
        { pos: A, color: "#f87171", label: "A" },
        { pos: B, color: "#4ade80", label: "B" },
        { pos: C, color: "#60a5fa", label: "C" },
        { pos: D, color: "#facc15", label: "D" },
      ];
      lns = [
        { start: A.clone().addScaledVector(segment, -1), end: B.clone().addScaledVector(segment, 1), color: "#fff" },
        { start: C.clone().addScaledVector(segment, -1), end: D.clone().addScaledVector(segment, 1), color: "#a3a3a3" },
      ];
    }

    const projected = pts.map((pt) => ({ ...pt, pos: projectPoint(pt.pos, direction), label: `${pt.label}'` }));
    const projectedLineSegments: SceneLine[] = type === "collinear"
      ? [{ start: projected[0].pos, end: projected[2].pos, color: "#fff" }]
      : [
          { start: projected[0].pos, end: projected[1].pos, color: "#fff" },
          { start: projected[2].pos, end: projected[3].pos, color: "#a3a3a3" },
        ];
    return { points: pts, lines: lns, projectedPoints: projected, projectedLines: projectedLineSegments };
  }, [type, direction, distAB, distCD, slopeDegrees]);

  const formatLength = (a: THREE.Vector3, b: THREE.Vector3) => a.distanceTo(b).toFixed(1);
  const label = (text: string) => (
    <div className="rounded border border-white/40 bg-neutral-950 px-2 py-1 font-mono text-xs font-bold text-white shadow-xl whitespace-nowrap">
      {text}
    </div>
  );
  const rangeClass = "flex-1 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-white";

  return (
    <div className="flex h-full min-h-[500px] flex-col">
      <div className="relative h-[420px] w-full shrink-0 lg:h-[480px]">
        <Canvas camera={{ position: [8, 7, 12], fov: 45, near: 0.1, far: 100 }}>
          <color attach="background" args={["#0f0f0f"]} />
          <ambientLight intensity={0.8} />
          <directionalLight position={[5, 10, 5]} intensity={1} />
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[20, 20]} />
            <meshStandardMaterial color="#1a1a1a" transparent opacity={0.6} depthWrite={false} />
          </mesh>
          <Grid args={[20, 20]} cellSize={1} cellColor="#333" sectionSize={5} sectionColor="#555" position={[0, 0.01, 0]} />
          {lines.map((line, i) => <Line key={`line-${i}`} points={[line.start, line.end]} color={line.color} lineWidth={2} />)}
          {points.map((point, i) => (
            <Line key={`ray-${i}`} points={[point.pos, projectedPoints[i].pos]} color="#555" lineWidth={1} dashed dashSize={0.2} gapSize={0.1} />
          ))}
          {points.map((point, i) => (
            <group key={`point-${i}`} position={point.pos}>
              <mesh>
                <sphereGeometry args={[0.12, 16, 16]} />
                <meshStandardMaterial color={point.color} emissive={point.color} emissiveIntensity={0.4} />
              </mesh>
              {/* Keep labels in the DOM overlay above the scene; do not let depth testing hide A. */}
              <Html position={[0, 0.38, 0]} center occlude={false} zIndexRange={[1000, 0]}>{label(point.label)}</Html>
            </group>
          ))}
          {projectedPoints.map((point, i) => (
            <group key={`projected-${i}`} position={point.pos}>
              <mesh>
                <sphereGeometry args={[0.1, 16, 16]} />
                <meshStandardMaterial color={point.color} opacity={0.75} transparent />
              </mesh>
              <Html position={[0, 0.38, 0]} center occlude={false} zIndexRange={[1000, 0]}>{label(point.label)}</Html>
            </group>
          ))}
          {projectedLines.map((line, i) => (
            <Line key={`projected-line-${i}`} points={[line.start, line.end]} color={line.color} lineWidth={2} opacity={0.5} transparent />
          ))}
          {type === "ratio" && showLengths && (
            <>
              <Html position={points[0].pos.clone().add(points[1].pos).multiplyScalar(0.5)} center occlude={false}>{label(`AB = ${formatLength(points[0].pos, points[1].pos)}`)}</Html>
              <Html position={points[2].pos.clone().add(points[3].pos).multiplyScalar(0.5)} center occlude={false}>{label(`CD = ${formatLength(points[2].pos, points[3].pos)}`)}</Html>
              <Html position={projectedPoints[0].pos.clone().add(projectedPoints[1].pos).multiplyScalar(0.5)} center occlude={false}>{label(`A'B' = ${formatLength(projectedPoints[0].pos, projectedPoints[1].pos)}`)}</Html>
              <Html position={projectedPoints[2].pos.clone().add(projectedPoints[3].pos).multiplyScalar(0.5)} center occlude={false}>{label(`C'D' = ${formatLength(projectedPoints[2].pos, projectedPoints[3].pos)}`)}</Html>
            </>
          )}
          <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} maxPolarAngle={Math.PI / 2 - 0.05} target={[0, 3, 0]} />
        </Canvas>
      </div>

      <div className="flex flex-col gap-3 border-t border-white/10 bg-neutral-950 p-4">
        {[
          { title: "Trục X", value: dirX, update: setDirX },
          { title: "Trục Z", value: dirZ, update: setDirZ },
        ].map((control) => (
          <div className="flex items-center gap-3" key={control.title}>
            <SlidersHorizontal className="h-4 w-4 text-neutral-500" />
            <span className="w-16 text-xs uppercase tracking-widest text-neutral-400">{control.title}</span>
            <input aria-label={control.title} type="range" min="-1.5" max="1.5" step="0.05" value={control.value} onChange={(e) => control.update(parseFloat(e.target.value))} className={rangeClass} />
            <span className="w-12 text-right font-mono text-xs text-neutral-400">{control.value.toFixed(2)}</span>
          </div>
        ))}
        {type === "ratio" && (
          <>
            <div className="my-1 h-px w-full bg-white/10" />
            <label className="flex cursor-pointer items-center gap-2 text-xs uppercase tracking-widest text-neutral-400">
              <input type="checkbox" checked={showLengths} onChange={(e) => setShowLengths(e.target.checked)} className="h-4 w-4 cursor-pointer accent-white" />
              Hiển thị độ dài
            </label>
            <div className="flex items-center gap-3">
              <span className="w-16 text-xs uppercase tracking-widest text-neutral-400">Độ nghiêng</span>
              <input aria-label="Độ nghiêng của các đoạn thẳng" type="range" min="-60" max="60" step="1" value={slopeDegrees} onChange={(e) => setSlopeDegrees(parseFloat(e.target.value))} className={rangeClass} />
              <span className="w-12 text-right font-mono text-xs text-neutral-400">{slopeDegrees}°</span>
            </div>
            {[
              { title: "Độ dài AB", value: distAB, update: setDistAB },
              { title: "Độ dài CD", value: distCD, update: setDistCD },
            ].map((control) => (
              <div className="flex items-center gap-3" key={control.title}>
                <span className="w-16 text-xs uppercase tracking-widest text-neutral-400">{control.title}</span>
                <input aria-label={control.title} type="range" min="1" max="5" step="0.1" value={control.value} onChange={(e) => control.update(parseFloat(e.target.value))} className={rangeClass} />
                <span className="w-12 text-right font-mono text-xs text-neutral-400">{control.value.toFixed(1)}</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function PropertyCard({ number, title, icon, description, math, visual, reverse = false }: {
  number: string; title: string; icon: React.ReactNode; description: React.ReactNode;
  math: React.ReactNode; visual: React.ReactNode; reverse?: boolean;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.7 }} className={`flex flex-col items-center justify-between gap-12 border-b border-white/10 py-24 ${reverse ? "lg:flex-row-reverse" : "lg:flex-row"}`}>
      <div className="flex-1 space-y-6">
        <div className="flex items-center gap-4 text-sm uppercase tracking-widest text-neutral-400"><span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/5">{number}</span>{icon}<span>{title}</span></div>
        <h2 className="font-serif text-3xl leading-tight text-white/90 md:text-4xl">{description}</h2>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-xl text-neutral-200 shadow-2xl">{math}</div>
      </div>
      <div className="relative min-h-[500px] w-full flex-1 overflow-hidden rounded-3xl border border-white/10 bg-neutral-950 shadow-2xl lg:min-h-[600px]">{visual}</div>
    </motion.div>
  );
}

export default function TheoryPage() {
  const { scrollYProgress } = useScroll();
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);
  return (
    <div className="min-h-screen bg-[#0A0A0A] font-sans text-white selection:bg-white selection:text-black">
      <motion.div className="fixed left-0 right-0 top-0 z-50 h-1 origin-left bg-white" style={{ scaleX }} />
      <nav className="fixed left-1/2 top-4 z-40 flex -translate-x-1/2 items-center gap-6 rounded-full border border-white/10 bg-neutral-900/80 px-6 py-3 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-2 text-sm font-semibold tracking-wide"><BookOpen className="h-4 w-4" /><span className="hidden md:block">Hình học 11</span></div>
        <div className="h-4 w-px bg-white/20" />
        <div className="flex gap-4 text-xs font-medium text-neutral-400"><a href="#property-1" className="hover:text-white">Thẳng hàng</a><a href="#property-2" className="hover:text-white">Song song</a><a href="#property-3" className="hover:text-white">Tỉ số</a></div>
      </nav>
      <section className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1 }} className="flex max-w-4xl flex-col items-center space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-neutral-300"><span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />Chương IV: Quan hệ song song trong không gian</div>
          <h1 className="font-serif text-5xl leading-tight md:text-7xl">Tính chất của<br /><span className="bg-gradient-to-r from-white via-neutral-200 to-neutral-500 bg-clip-text italic text-transparent">Phép chiếu song song</span></h1>
          <p className="max-w-2xl text-lg font-light leading-relaxed text-neutral-400 md:text-xl">Phép chiếu song song là công cụ đắc lực giúp biểu diễn các hình không gian lên mặt phẳng, bảo toàn những tính chất hình học quan trọng. Hãy cùng khám phá 3 tính chất cốt lõi dưới đây.</p>
          <Link href="/simulation" className="rounded-full bg-white px-8 py-4 font-semibold text-black shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(255,255,255,0.25)]">Mô phỏng 3D <MoveRight className="ml-2 inline h-4 w-4" /></Link>
        </motion.div>
      </section>
      <main className="mx-auto max-w-7xl px-6 pb-32 md:px-12">
        <div id="property-1"><PropertyCard number="1" title="Tính chất bảo toàn sự thẳng hàng" icon={<MoveRight className="h-5 w-5 text-blue-400" />} description={<>Phép chiếu song song biến ba điểm <strong>thẳng hàng</strong> thành ba điểm thẳng hàng và <strong>không làm thay đổi thứ tự</strong> của ba điểm đó.</>} math={<div className="space-y-4 text-center"><p className="font-sans text-sm uppercase tracking-widest text-neutral-400">Hệ quả</p><div className="text-2xl"><InlineMath math="A, B, C" /> thẳng hàng <InlineMath math="\Rightarrow" /> <InlineMath math="A', B', C'" /> thẳng hàng</div></div>} visual={<MiniInteractiveScene type="collinear" />} /></div>
        <div id="property-2"><PropertyCard number="2" title="Tính chất bảo toàn sự song song" icon={<Spline className="h-5 w-5 text-green-400" />} description={<>Phép chiếu song song biến hai đường thẳng <strong>song song</strong> thành hai đường thẳng song song hoặc <strong>trùng nhau</strong>.</>} math={<div className="space-y-4 text-center"><p className="font-sans text-sm uppercase tracking-widest text-neutral-400">Hệ quả</p><div className="flex items-center justify-center gap-4 text-2xl"><InlineMath math="a \parallel b" /><MoveRight className="h-6 w-6 text-neutral-500" /><InlineMath math="a' \parallel b' \text{ hoặc } a' \equiv b'" /></div></div>} visual={<MiniInteractiveScene type="parallel" />} reverse /></div>
        <div id="property-3"><PropertyCard number="3" title="Tính chất bảo toàn tỉ số" icon={<Scaling className="h-5 w-5 text-purple-400" />} description={<>Phép chiếu song song <strong>giữ nguyên tỉ số độ dài</strong> của hai đoạn thẳng cùng nằm trên một đường thẳng hoặc nằm trên hai đường thẳng song song.</>} math={<div className="space-y-4 text-center"><p className="font-sans text-sm uppercase tracking-widest text-neutral-400">Công thức</p><div className="text-3xl"><BlockMath math="\frac{AB}{CD} = \frac{A'B'}{C'D'}" /></div></div>} visual={<MiniInteractiveScene type="ratio" />} /></div>
      </main>
    </div>
  );
}
