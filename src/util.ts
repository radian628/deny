import { vec2 } from "gl-matrix";
import { lerp } from "./animation";

export function range(n: number) {
  let arr: number[] = [];
  for (let i = 0; i < n; i++) {
    arr.push(i);
  }
  return arr;
}

export function pointTo(a: vec2, b: vec2) {
  return Math.atan2(b[1] - a[1], b[0] - a[0]);
}

export function polar(angle: number, magnitude: number): vec2 {
  return [Math.cos(angle) * magnitude, Math.sin(angle) * magnitude];
}

// lines are (a, b) + (c, d) t
export function lineIntersectLineT(s1: vec2, d1: vec2, s2: vec2, d2: vec2) {
  return (
    (d1[0] * (s1[1] - s2[1]) + d1[1] * (s2[0] - s1[0])) /
    (d1[0] * d2[1] - d1[1] * d2[0])
  );
}

export function lineIntersectLinePos(
  s1: vec2,
  d1: vec2,
  s2: vec2,
  d2: vec2
): vec2 {
  const t2 = lineIntersectLineT(s1, d1, s2, d2);
  return [t2 * d2[0] + s2[0], t2 * d2[1] + s2[1]];
}

export function findClosestIntersectionWithMultipleLines(
  s1: vec2,
  d1: vec2,
  lines: [vec2, vec2][]
) {
  let closestPoint: vec2 = [Infinity, Infinity];
  let closestDist = Infinity;

  for (const [s2, d2] of lines) {
    const pt = lineIntersectLinePos(s1, d1, s2, d2);
    const dist = vec2.dist(pt, s1);
    if (dist < closestDist && vec2.dot(d1, pt) > 0) {
      closestDist = dist;
      closestPoint = pt;
    }
  }

  return { point: closestPoint, dist: closestDist };
}

export function lerpv2(t: number, a: vec2, b: vec2): vec2 {
  return [lerp(t, a[0], b[0]), lerp(t, a[1], b[1])];
}

export function pickRandomly<T>(choices: T[]): T {
  return choices[Math.floor(Math.random() * choices.length)];
}
