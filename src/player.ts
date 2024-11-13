import { vec2 } from "gl-matrix";
import { DrawSystem } from "./gl/draw";
import { range } from "./util";
import { playSound } from "./sound";

const keysPressed: Record<string, boolean> = {};

document.addEventListener("keydown", (e) => {
  keysPressed[e.key] = true;
});
document.addEventListener("keyup", (e) => {
  keysPressed[e.key] = false;
});

export const player = {
  pos: vec2.fromValues(0, 0),
  vel: vec2.fromValues(0, 0),
  deathAnimationTimer: 0,
  deathParticles: [] as {
    pos: vec2;
    vel: vec2;
  }[],
};

const DEATH_ANIMATION_LENGTH = 100;
const PLAYER_VEL = 0.01;
const PLAYER_DAMPEN = 0.5;
export const ATTACK_RADIUS = 0.2;
const ATTACK_INTERVAL = 20;

let attackCooldown = 0;

export function runPlayerIter() {
  if (player.deathAnimationTimer === 1) {
    player.pos = [0, 0];
    player.vel = [0, 0];
    player.deathParticles = [];
  }
  player.deathAnimationTimer--;

  if (attackCooldown > 0) attackCooldown--;
  player.pos[0] += player.vel[0];
  player.pos[1] += player.vel[1];

  player.vel[0] *= PLAYER_DAMPEN;
  player.vel[1] *= PLAYER_DAMPEN;

  if (keysPressed.w) player.vel[1] += PLAYER_VEL;
  if (keysPressed.a) player.vel[0] -= PLAYER_VEL;
  if (keysPressed.s) player.vel[1] -= PLAYER_VEL;
  if (keysPressed.d) player.vel[0] += PLAYER_VEL;
  if (keysPressed[" "] && attackCooldown == 0) {
    attackCooldown = ATTACK_INTERVAL;
    player.vel[0] *= -1;
    player.vel[1] *= -1;
  }
}

export function drawPlayer(ds: DrawSystem, gt: number) {
  if (player.deathAnimationTimer > 0) {
    for (const p of player.deathParticles) {
      vec2.add(p.pos, p.pos, p.vel);
      vec2.scale(p.vel, p.vel, 0.8);
      if (player.deathAnimationTimer < DEATH_ANIMATION_LENGTH / 2) {
        vec2.add(p.vel, p.vel, [-p.pos[0] / 30, -p.pos[1] / 30]);
      }
      ds.circle(p.pos, 0.005, [1, 0.7, 0.7, 1]);
    }
    return;
  }

  const playerSize = Math.sin(gt * 10 * Math.PI * 2) * 0.005 + 0.02;
  ds.circle(player.pos, playerSize, [1, 0.7, 0.7, 1]);

  if (isPlayerAttacking()) {
    ds.circle(player.pos, ATTACK_RADIUS, [1, 0.7, 0.7, 1], 0.1, 0.99);
  } else {
    ds.circle(player.pos, ATTACK_RADIUS, [1, 0.7, 0.7, 0.3], 0.01, 0.99);
  }
}

export function isPlayerAttacking() {
  return attackCooldown >= ATTACK_INTERVAL;
}

export function killPlayer() {
  if (player.deathAnimationTimer > 0) return;
  playSound("click.wav", 2, 1);
  playSound("player-death.wav", 0.7, 5);
  player.deathAnimationTimer = DEATH_ANIMATION_LENGTH;
  for (let i of range(100)) {
    player.deathParticles.push({
      pos: vec2.clone(player.pos),
      vel: [Math.random() * 0.2 - 0.1, Math.random() * 0.2 - 0.1],
    });
  }
}
