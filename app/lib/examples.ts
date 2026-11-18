import * as THREE from "three";

export type PropertyTab = "collinearity" | "parallelism" | "ratio";

export interface ProjectionExample {
  id: string;
  name: string;
  type: PropertyTab;
  deltaCenter: [number, number, number];
  deltaDir: [number, number, number];
  line1Center: [number, number, number];
  line1Dir: [number, number, number];
  line2Center?: [number, number, number];
  // Scalar positions (t) along each line: P(t) = center + t * dir
  tValues: {
    A: number;
    B: number;
    C: number;
    D?: number;
  };
}

export function getCollinearStandardExample(): ProjectionExample {
  return {
    id: "collinear-3pts",
    name: "VD 1: Thẳng hàng (3 điểm)",
    type: "collinearity",
    deltaCenter: [-6.0, 2.5, -3.5],
    deltaDir: [0.35, -1.0, 0.25],
    line1Center: [0.0, 2.8, 0.0],
    line1Dir: [0.92, 0.14, 0.36],
    tValues: { A: -3.5, B: 0.0, C: 3.5 },
  };
}

export function getParallelDoorsExample(): ProjectionExample {
  return {
    id: "parallel-lines",
    name: "VD 2: Hai đường song song",
    type: "parallelism",
    deltaCenter: [-6.0, 2.5, -3.5],
    deltaDir: [0.3, -1.0, 0.2],
    line1Center: [-0.5, 3.0, -1.5],
    line1Dir: [0.95, 0.12, 0.28],
    line2Center: [0.5, 2.0, 1.8],
    tValues: { A: -2.8, B: 2.6, C: -2.4, D: 2.2 },
  };
}

export function getParallelogramExample(): ProjectionExample {
  return {
    id: "parallelogram",
    name: "VD 3: Hình bình hành",
    type: "parallelism",
    deltaCenter: [-6.0, 2.5, -3.5],
    deltaDir: [0.3, -1.0, 0.25],
    line1Center: [-1.0, 2.5, -1.0],
    line1Dir: [0.8, 0.2, 0.5],
    line2Center: [1.0, 2.5, 1.0],
    tValues: { A: -2.0, B: 2.0, C: -2.0, D: 2.0 },
  };
}

export function getRatioOneLineExample(): ProjectionExample {
  return {
    id: "ratio-one-line",
    name: "VD 4: Tỉ số (1 đường)",
    type: "ratio",
    deltaCenter: [-6.0, 2.5, -3.5],
    deltaDir: [0.4, -1.0, -0.2],
    line1Center: [-0.5, 3.2, -1.4],
    line1Dir: [0.94, 0.15, 0.3],
    tValues: { A: -3.0, B: -1.0, C: 1.0, D: 3.0 },
  };
}

export function getRatioTwoLinesExample(): ProjectionExample {
  return {
    id: "ratio-two-lines",
    name: "VD 5: Tỉ số (2 đường //)",
    type: "ratio",
    deltaCenter: [-6.0, 2.5, -3.5],
    deltaDir: [0.4, -1.0, -0.2],
    line1Center: [-0.5, 3.2, -1.4],
    line1Dir: [0.94, 0.15, 0.3],
    line2Center: [0.2, 1.8, 1.6],
    tValues: { A: -3.0, B: -1.0, C: 1.0, D: 3.0 },
  };
}

export const projectionExamples: ProjectionExample[] = [
  getCollinearStandardExample(),
  getParallelDoorsExample(),
  getParallelogramExample(),
  getRatioOneLineExample(),
  getRatioTwoLinesExample(),
];

export function cloneVector3(tuple: [number, number, number]): THREE.Vector3 {
  return new THREE.Vector3(tuple[0], tuple[1], tuple[2]);
}
