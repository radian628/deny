import { mat3, vec2 } from "gl-matrix";
import { DrawSystem } from "../gl/draw";
import { range } from "../util";
import { playSound } from "../sound";
import { Game } from "./game";
import { ease, keyframes, smoothstep } from "../animation";

const keysPressed: Record<string, boolean> = {};

document.addEventListener("keydown", (e) => {
  keysPressed[e.key.toLowerCase()] = true;
});
document.addEventListener("keyup", (e) => {
  keysPressed[e.key.toLowerCase()] = false;
});

const DEATH_ANIMATION_LENGTH = 1.8;
const PLAYER_ACCEL = 60;
const PLAYER_DAMPEN = 8.67e-19;
export const ATTACK_RADIUS = 0.2;
const ATTACK_INTERVAL = 0.33333;
let isPlayerDying = true;

let avgVel = 0;

export function runPlayerIter(game: Game) {
  const player = game.player;

  if (player.deathAnimationTimer <= 0 && isPlayerDying) {
    player.pos = [0, 0];
    player.vel = [0, 0];
    player.deathParticles = [];
    isPlayerDying = false;
  }
  player.deathAnimationTimer -= game.dt;

  if (player.attackCooldown > 0) player.attackCooldown -= game.dt;
  player.pos[0] += player.vel[0] * game.dt;
  player.pos[1] += player.vel[1] * game.dt;

  player.vel[0] *= 0; //PLAYER_DAMPEN ** game.dt;
  player.vel[1] *= 0; // PLAYER_DAMPEN ** game.dt;

  const playerStepSize = (PLAYER_ACCEL * 1) / 60;

  // console.log(keysPressed);
  if (keysPressed.arrowup) player.vel[1] += playerStepSize;
  if (keysPressed.arrowleft) player.vel[0] -= playerStepSize;
  if (keysPressed.arrowdown) player.vel[1] -= playerStepSize;
  if (keysPressed.arrowright) player.vel[0] += playerStepSize;
  if (keysPressed[" "] && player.attackCooldown <= 0) {
    player.attackCooldown = ATTACK_INTERVAL;
    player.vel[0] *= -1;
    player.vel[1] *= -1;
  }

  const spd = vec2.length(player.vel);
  avgVel = 0.95 * avgVel + 0.05 * spd;

  for (let i = 0; i < 2; i++) {
    if (player.pos[i] > 1.0) {
      player.vel[i] = Math.abs(player.vel[i]) * -1;
    }
    if (player.pos[i] < -1.0) {
      player.vel[i] = Math.abs(player.vel[i]);
    }
  }
}

export function drawPlayer(game: Game) {
  const player = game.player;
  if (player.deathAnimationTimer > 0) {
    const factor = 1 - player.deathAnimationTimer / DEATH_ANIMATION_LENGTH;
    const trans = mat3.create();
    game.ds.draw(
      0,
      5,
      trans,
      [1.0, 0.6, 0.6, 0.1],
      [
        keyframes([
          [0, 0],
          [0.8, 0],
          [1, Math.sqrt(2) - 0],
        ])(factor),
        0.01,
        0,
        0,
      ]
    );
    game.ds.draw(
      0,
      5,
      trans,
      [0, 0, 0, 1],
      [
        keyframes([
          [0, 0],
          [0.8, 0],
          [1, Math.sqrt(2) + 0.5],
        ])(factor),
        0.01,
        0,
        0,
      ]
    );

    for (const p of player.deathParticles) {
      vec2.add(p.pos, p.pos, p.vel);
      vec2.scale(p.vel, p.vel, 0.8);
      if (player.deathAnimationTimer < DEATH_ANIMATION_LENGTH / 2) {
        vec2.add(p.vel, p.vel, [-p.pos[0] / 30, -p.pos[1] / 30]);
      }
      game.ds.circle(p.pos, 0.005, [1, 0.7, 0.7, 1]);
    }
    return;
  }

  const playerSize = Math.sin(game.t * 10 * Math.PI * 2) * 0.005 + 0.02;
  game.ds.circle(player.pos, playerSize, [1, 0.7, 0.7, 1]);

  if (isPlayerAttacking(game)) {
    game.ds.circle(player.pos, ATTACK_RADIUS, [1, 0.7, 0.7, 1], 0.1, 0.99);
  } else {
    game.ds.circle(player.pos, ATTACK_RADIUS, [1, 0.7, 0.7, 0.3], 0.01, 0.99);
  }
}

export function isPlayerAttacking(game: Game) {
  return game.player.attackCooldown >= ATTACK_INTERVAL;
}

export function killPlayer(game: Game) {
  const player = game.player;
  if (player.deathAnimationTimer > 0) return;
  player.justDied = true;
  isPlayerDying = true;
  playSound("click.wav", 1, 4);
  playSound("player-death.wav", 0.25, 1);
  player.deathAnimationTimer = DEATH_ANIMATION_LENGTH;
  for (let i of range(100)) {
    player.deathParticles.push({
      pos: vec2.clone(player.pos),
      vel: [Math.random() * 0.2 - 0.1, Math.random() * 0.2 - 0.1],
    });
  }
}
