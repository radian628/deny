import { Root } from "react-dom/client";
import { DrawSystem } from "./gl/draw";
import { vec2 } from "gl-matrix";

export function tlerp(
  t: number,
  from: number,
  to: number,
  a: number,
  b: number
) {
  const t2 = Math.min(Math.max((t - from) / (to - from), 0), 1);
  return a * (1 - t2) + b * t2;
}

export function lerp(t: number, a: number, b: number) {
  return a * (1 - t) + b * t;
}

export function ease(
  fn: (x: number) => number,
  t: number,
  from: number,
  to: number,
  a: number,
  b: number
) {
  const t2 = Math.min(Math.max((t - from) / (to - from), 0), 1);
  const t3 = fn(t2);
  return a * (1 - t3) + b * t3;
}

export function smoothstep(x: number) {
  return 3 * x * x - 2 * x * x * x;
}

export function easeIn(x: number) {
  return x * x;
}

export function easeOut(x: number) {
  return 1 - (x - 1) * (x - 1);
}

export function sampleCatmullRom(
  p0: vec2,
  p1: vec2,
  p2: vec2,
  p3: vec2,
  t: number
): vec2 {
  return [
    0.5 *
      (2 * p1[0] +
        t * (-p0[0] + p2[0]) +
        t * t * (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) +
        t * t * t * (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0])),
    0.5 *
      (2 * p1[1] +
        t * (-p0[1] + p2[1]) +
        t * t * (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) +
        t * t * t * (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1])),
  ];
}

export function sampleFullCatmullRom(
  p0: vec2,
  p1: vec2,
  p2: vec2,
  p3: vec2,
  t: number
): vec2 {
  if (t < 1 / 3) {
    return sampleCatmullRom(p0, p0, p1, p2, t * 3);
  } else if (t < 2 / 3) {
    return sampleCatmullRom(p0, p1, p2, p3, t * 3 - 1);
  } else {
    return sampleCatmullRom(p1, p2, p3, p3, t * 3 - 2);
  }
}

export interface Scene {
  loop?: (
    textRoot: Root,
    ds: DrawSystem,
    t: number,
    gt: number,
    first: boolean,
    done: () => void
  ) => void;
}

export function keyframes(
  values: ([number, number] | [number, number, (x: number) => number])[]
) {
  return (x: number): number => {
    if (x < values[0][0]) return values[0][1];
    for (let i = 0; i < values.length - 1; i++) {
      let currValue = values[i];
      let nextValue = values[i + 1];

      if (x >= currValue[0] && x < nextValue[0]) {
        return ease(
          currValue[2] ?? smoothstep,
          x,
          currValue[0],
          nextValue[0],
          currValue[1],
          nextValue[1]
        );
      }
    }
    return values[values.length - 1][1];
  };
}
