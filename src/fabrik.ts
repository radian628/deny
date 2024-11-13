import { mat3, vec2 } from "gl-matrix";

export type FabrikPoint = {
  pos: vec2;
  length: number;
};

export function doFabrik(
  points: FabrikPoint[],
  target: vec2,
  iterations: number
) {
  const doFabrikOnVectorPair = (
    lastPoint: FabrikPoint,
    thisPoint: FabrikPoint
  ) => {
    // create unit vector from one point to the next
    const dirToLastPoint = vec2.create();
    vec2.sub(dirToLastPoint, thisPoint.pos, lastPoint.pos);
    vec2.normalize(dirToLastPoint, dirToLastPoint);

    // fix the vector's size properly
    vec2.copy(thisPoint.pos, dirToLastPoint);
    vec2.scale(thisPoint.pos, thisPoint.pos, lastPoint.length);
    vec2.add(thisPoint.pos, thisPoint.pos, lastPoint.pos);
  };

  const oldStartPos = vec2.clone(points[0].pos);

  for (let i = 0; i < iterations; i++) {
    // fix end vector
    vec2.copy(points[points.length - 1].pos, target);

    // back to front
    for (let j = points.length - 2; j >= 0; j--) {
      const lastPoint = points[j + 1];
      const thisPoint = points[j];
      doFabrikOnVectorPair(lastPoint, thisPoint);
    }

    // fix start vector
    vec2.copy(points[0].pos, oldStartPos);

    // front to back
    for (let j = 0; j < points.length - 1; j++) {
      const lastPoint = points[j];
      const thisPoint = points[j + 1];
      doFabrikOnVectorPair(lastPoint, thisPoint);
    }
  }
}

export function drawFabrikChain(
  points: FabrikPoint[],
  draw: (trans: mat3) => void
) {
  let i = 0;
  for (const p of points) {
    const p2 = points[i + 1] ?? points[i - 1];

    const angle = Math.atan2(p2.pos[1] - p.pos[1], p2.pos[0] - p.pos[0]);
    const trans = mat3.create();
    mat3.translate(trans, trans, p.pos);
    mat3.rotate(trans, trans, angle);
    draw(trans);
    i++;
  }
}

export function drawFabrikChainSegments(
  points: FabrikPoint[],
  draw: (trans: mat3, pos: vec2, i: number) => void
) {
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];

    const avg = vec2.clone(p1.pos);
    vec2.add(avg, avg, p2.pos);
    vec2.scale(avg, avg, 1 / 2);

    const angle = Math.atan2(p2.pos[1] - p1.pos[1], p2.pos[0] - p1.pos[0]);
    const trans = mat3.create();
    mat3.translate(trans, trans, avg);
    mat3.rotate(trans, trans, angle);
    draw(trans, avg, i);
  }
}
