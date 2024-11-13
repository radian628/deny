import { mat3, vec2 } from "gl-matrix";
import {
  ATTACK_RADIUS,
  isPlayerAttacking,
  killPlayer,
  player,
} from "../player";
import { drawDiscoveryBody } from "./discovery-scenes";
import { DrawSystem } from "../gl/draw";
import { doFabrik, drawFabrikChainSegments, FabrikPoint } from "../fabrik";
import { range } from "../util";
import { playSound } from "../sound";
import { lerp, smoothstep } from "../animation";

const DISCOVERY_MAX_HP = 25;
const DISCOVERY_SIZE = 0.3;
const DAMAGE_INDICATOR_COOLDOWN = 15;

type DiscoveryTendril = {
  points: FabrikPoint[];
  target: vec2;
  vel: vec2;
  initVel: vec2;
  attackAt: number;
  retractAt: number;
  deleteAt: number;
  hasLockedOn: boolean;
};

export const discoveryBoss = {
  pos: vec2.fromValues(0, 0.5),
  health: DISCOVERY_MAX_HP,
  damageIndicatorTimer: 0,
  animationTime: 0,
  tendrils: [] as DiscoveryTendril[],
  nextTendril: 0,
  tendrilIndex: 0,
  phase: "teleport" as "teleport" | "tendrils",
  nextPhaseTime: 0,
};

function tendrilPhase(gt: number, first: boolean) {
  const hpFraction = discoveryBoss.health / DISCOVERY_MAX_HP;
  // fire tendrils
  if (gt > discoveryBoss.nextTendril) {
    playSound(
      "fart.wav",
      Math.random() * 0.2 + 0.75 + discoveryBoss.tendrilIndex * 0.3
    );
    if (discoveryBoss.tendrilIndex <= 10) {
      discoveryBoss.nextTendril += 0.05;
      discoveryBoss.tendrilIndex++;
    } else {
      discoveryBoss.nextTendril += lerp(hpFraction, 1, 3);
      discoveryBoss.tendrilIndex = 0;
      switchToTeleportPhase(gt);
    }
    const vel = vec2.clone(player.pos);
    vec2.sub(vel, vel, discoveryBoss.pos);
    vec2.normalize(vel, vel);
    vec2.scale(vel, vel, 0.07);
    const initVel = vec2.clone(vel);
    vec2.scale(initVel, initVel, 1.5);
    vec2.rotate(
      initVel,
      initVel,
      [0, 0],
      discoveryBoss.tendrilIndex % 2 ? Math.PI / 2 : -Math.PI / 2
    );
    discoveryBoss.tendrils.push({
      points: range(30).map(
        (i) =>
          ({
            length: 0.1,
            pos: [discoveryBoss.pos[0], discoveryBoss.pos[1] + (i % 2) * 0.1],
          } as FabrikPoint)
      ),
      target: vec2.clone(discoveryBoss.pos),
      vel,
      initVel,
      attackAt: gt + 0.15,
      retractAt: gt + 0.7,
      deleteAt: gt + 2,
      hasLockedOn: false,
    });
  }

  // kill old tendrils
  discoveryBoss.tendrils = discoveryBoss.tendrils.filter(
    (t) => t.deleteAt > gt
  );
  // if (discoveryBoss.nextPhaseTime < gt) {
  //   switchToTeleportPhase(gt);
  // }
}
function switchToTendrilPhase(gt: number) {
  discoveryBoss.nextPhaseTime = gt + 10;
  discoveryBoss.phase = "tendrils";
  discoveryBoss.nextTendril = gt + 1;
  discoveryBoss.tendrilIndex = 0;
}

let nextPos: vec2 = [0, 0];
let hasTeleported = false;
function teleportPhase(gt: number, first: boolean) {
  if (discoveryBoss.nextPhaseTime - gt < 1) {
    discoveryBoss.pos = nextPos;
  }
  if (discoveryBoss.nextPhaseTime < gt) {
    switchToTendrilPhase(gt);
  }
}
function switchToTeleportPhase(gt: number) {
  hasTeleported = false;
  nextPos = [Math.random() - 0.5, Math.random() - 0.5];
  discoveryBoss.nextPhaseTime = gt + 2;
  discoveryBoss.phase = "teleport";
}

function handleTendrils(gt: number, first: boolean) {
  // handle tendril movement
  for (const t of discoveryBoss.tendrils) {
    t.points[0].pos = vec2.clone(discoveryBoss.pos);
    doFabrik(t.points, t.target, 10);
    if (gt > t.attackAt) {
      if (!t.hasLockedOn) {
        t.hasLockedOn = true;
        const vel = vec2.clone(player.pos);
        vec2.sub(vel, vel, t.target);
        vec2.normalize(vel, vel);
        vec2.scale(vel, vel, 0.07);
        t.vel = vel;
      }
      vec2.add(t.target, t.target, t.vel);
      const rvel = vec2.clone(t.vel);
      vec2.rotate(rvel, rvel, [0, 0], Math.PI / 2);
      vec2.scale(rvel, rvel, Math.sin(15 * gt) * 0);
      vec2.add(t.target, t.target, rvel);
    } else {
      vec2.add(t.target, t.target, t.initVel);
    }

    for (const pt of t.points) {
      if (gt < t.retractAt && vec2.dist(player.pos, pt.pos) < 0.04) {
        killPlayer();
      }
    }
  }
}

export function runDiscoveryIter(gt: number, first: boolean) {
  const hpFraction = discoveryBoss.health / DISCOVERY_MAX_HP;

  if (first) {
    switchToTeleportPhase(gt);
  }

  // move boss
  // discoveryBoss.pos = [0, 0]; // [Math.cos(gt) * 0.6, 0.5];

  // damage from player
  if (
    isPlayerAttacking() &&
    vec2.dist(player.pos, discoveryBoss.pos) < ATTACK_RADIUS + DISCOVERY_SIZE
  ) {
    discoveryBoss.health--;
    playSound(
      "discovery-hurt.wav",
      (Math.random() * 0.1 + 0.2) * lerp(hpFraction, 5, 1),
      0.3
    );
    discoveryBoss.damageIndicatorTimer = DAMAGE_INDICATOR_COOLDOWN;
  }
  discoveryBoss.damageIndicatorTimer--;
  if (discoveryBoss.damageIndicatorTimer <= 0) {
    discoveryBoss.animationTime += 1 / 60;
  } else {
    discoveryBoss.animationTime += Math.random() * 0.2 - 0.1;
  }

  if (discoveryBoss.phase === "tendrils") {
    tendrilPhase(gt, first);
  } else if (discoveryBoss.phase === "teleport") {
    teleportPhase(gt, first);
  }

  handleTendrils(gt, first);
}

export function displayDiscovery(ds: DrawSystem, gt: number) {
  const trans = mat3.create();
  mat3.translate(trans, trans, discoveryBoss.pos);
  mat3.translate(
    trans,
    trans,
    discoveryBoss.damageIndicatorTimer > 0
      ? [Math.random() * 0.02 - 0.01, Math.random() * 0.02 - 0.01]
      : [0, 0]
  );
  mat3.scale(trans, trans, [
    discoveryBoss.phase === "teleport"
      ? smoothstep(
          Math.max(
            Math.min(1, 8 * Math.abs(discoveryBoss.nextPhaseTime - gt - 1) - 7),
            0
          )
        )
      : 1,
    1,
  ]);
  drawDiscoveryBody(ds, trans, discoveryBoss.animationTime);
  if (discoveryBoss.phase !== "teleport")
    ds.circle(
      discoveryBoss.pos,
      DISCOVERY_SIZE,
      [0.7, 0.7, 1, 0.3],
      0.01,
      0.99
    );

  for (const t of discoveryBoss.tendrils) {
    drawFabrikChainSegments(t.points, (trans, pointPos, i) => {
      mat3.scale(trans, trans, [0.1, 0.1]);
      let alpha = 4 * vec2.dist(pointPos, discoveryBoss.pos) - 1;

      if (gt > t.retractAt) {
        const timeSinceRetraction = gt - t.retractAt;
        alpha = Math.min(
          alpha,
          1 - Math.max(0, timeSinceRetraction * 30 - i * 0.1)
        );
      }

      ds.img(1, trans, [1, 1, 1, alpha]);
    });
  }
}

export function displayDiscoveryHealthBar(ds: DrawSystem) {
  const pos1: vec2 = [-1.0, 1.0];
  const pos2: vec2 = [-1 + (2 * discoveryBoss.health) / DISCOVERY_MAX_HP, 0.95];

  ds.rect(pos1, pos2, [0.5, 0.8, 1.0, 1.0]);
}

export function discoveryBackground(
  ds: DrawSystem,
  t: number,
  black?: boolean
) {
  const t2 = t * 0.1;
  const offsetX = Math.cos(t2) * 0.1;
  const offsetY = Math.sin(t2) * 0.1;
  ds.draw(
    0,
    2,
    mat3.create(),
    [0.64 + offsetX, -0.75 + offsetY, 20, 0.4],
    black ? [0, 0, 0, 0.2] : [0.2, 0.1, 0.1, 0.2]
  );
}
