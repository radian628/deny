import { mat3, vec2 } from "gl-matrix";
import { ATTACK_RADIUS, isPlayerAttacking, killPlayer } from "../ecs/player";
import { DrawSystem } from "../gl/draw";
import { doFabrik, drawFabrikChainSegments, FabrikPoint } from "../fabrik";
import { range } from "../util";
import { playSound } from "../sound";
import { ease, keyframes, lerp, smoothstep } from "../animation";
import { Game } from "../ecs/game";
import { Entity, interval, multiTimer, text, timer } from "../ecs/entity";
import React from "react";
import { SlowText } from "../TypedInText";

const DISCOVERY_MAX_HP = 16;
const DISCOVERY_SIZE = 0.3;
const DAMAGE_INDICATOR_COOLDOWN = 15;

interface StopAttackable {
  stopAttacking: boolean;
}

class DiscoveryTendril implements Entity {
  speed: number;
  timeToDelete: number;
  timeToAttack: number;
  dir: vec2;
  target: vec2;
  points: FabrikPoint[];
  startTime = 0;
  angleOffset: number;
  isDead = false;
  absAngle: boolean;
  creator: StopAttackable;

  constructor(params: {
    creator: StopAttackable;
    speed: number;
    timeToDelete: number;
    timeToAttack: number;
    startPos: vec2;
    angleOffset: number;
    absAngle?: boolean;
  }) {
    this.speed = params.speed;
    this.timeToDelete = params.timeToDelete;
    this.timeToAttack = params.timeToAttack;
    this.dir = vec2.clone(params.startPos);
    this.points = range(30).map((i) => ({
      pos: [params.startPos[0], params.startPos[1] + (i % 2) * 0.1],
      length: 0.1,
    }));
    this.angleOffset = params.angleOffset;
    this.target = vec2.clone(params.startPos);
    this.creator = params.creator;
    this.absAngle = params.absAngle ?? false;
  }

  init(game: Game) {
    this.startTime = game.t;

    game.onPlayerDead(this, () => {
      this.isDead = true;
    });

    // target the player, offset by an angle
    if (this.absAngle) {
      this.dir = [1, 0];
    } else {
      vec2.sub(this.dir, game.player.pos, this.dir);
      vec2.normalize(this.dir, this.dir);
    }
    vec2.scale(this.dir, this.dir, this.speed);
    vec2.rotate(this.dir, this.dir, [0, 0], this.angleOffset);

    game.addEntity(
      timer(this.timeToAttack, () => {
        vec2.sub(this.dir, game.player.pos, this.target);
        vec2.normalize(this.dir, this.dir);
        vec2.scale(this.dir, this.dir, this.speed);
      })
    );
    game.addEntity(
      timer(this.timeToDelete, () => {
        this.isDead = true;
      })
    );
  }

  iter(game: Game) {
    if (this.creator.stopAttacking) this.isDead = true;

    const t = game.t - this.startTime;

    doFabrik(this.points, this.target, 10);

    vec2.add(this.target, this.target, this.dir);

    for (const p of this.points) {
      const distToPlayer = vec2.dist(p.pos, game.player.pos);
      if (distToPlayer < 0.06) {
        killPlayer(game);
      }
    }
  }

  draw(game: Game) {
    drawFabrikChainSegments(this.points, (trans, pos, i) => {
      mat3.scale(trans, trans, [0.1, 0.1]);
      game.ds.img(1, trans, [
        0.5,
        1,
        1.6,
        ease((x) => x, vec2.dist(pos, this.points[0].pos), 0, 0.3, -1, 1),
      ]);
    });
  }
}

export type DiscoveryBossState =
  | {
      type: "zigzag";
      startTime: number;
      duration: number;
    }
  | {
      type: "teleport";
      startTime: number;
      duration: number;
    }
  | {
      type: "radial";
      startTime: number;
      duration: number;
    }
  | {
      type: "death-teleport";
      startTime: number;
      duration: number;
    }
  | {
      type: "idle";
      startTime: number;
      duration: number;
    }
  | {
      type: "slow-zigzag";
      startTime: number;
      duration: number;
    };

export class LineDamageIndicator implements Entity {
  isDead = false;
  start: vec2;
  end: vec2;
  lifetime: number;
  startTime: number = 0;

  constructor(start: vec2, end: vec2, lifetime: number) {
    this.start = start;
    this.end = end;
    this.lifetime = lifetime;
  }

  init(game: Game) {
    this.startTime = game.t;
  }

  iter(game: Game) {
    if (game.t > this.startTime + this.lifetime) {
      this.isDead = true;
    }
  }

  draw(game: Game) {
    const length = vec2.dist(this.start, this.end);
    const angle = Math.atan2(
      this.end[1] - this.start[1],
      this.end[0] - this.start[0]
    );
    const t = mat3.create();
    mat3.translate(t, t, this.start);
    mat3.rotate(t, t, angle);
    mat3.scale(t, t, [length * 0.5, 0.005]);
    mat3.translate(t, t, [1, 0]);
    game.ds.draw(0, 4, t, [0.4, 0.7, 1.0, 0.5]);
  }
}

export class DiscoveryBoss implements Entity, StopAttackable {
  isDead = false;
  pos = [0, 0.5] as vec2;
  hp = DISCOVERY_MAX_HP;
  state: DiscoveryBossState = {
    type: "teleport",
    startTime: 0,
    duration: 2,
  };
  isBeingDamaged = false;
  mainAttackSequence?: Entity;
  isRunningMainAttackSequence = true;
  stopAttacking = false;

  switchToTeleportState(game: Game, overrideDelay?: number) {
    const delay =
      overrideDelay ?? ease((x) => x, this.hp, DISCOVERY_MAX_HP, 0, 1, 0.5);
    this.state = {
      type: "teleport",
      startTime: game.t,
      duration: delay,
    };
    const boss = this;
    game.addEntity(
      timer(this.state.duration / 2, () => {
        if (this.state.type === "teleport") {
          const randAngle = Math.random() * Math.PI * 2;
          this.pos = [Math.cos(randAngle) * 0.4, Math.sin(randAngle) * 0.4];
        } else {
          this.pos = [0, 0];
        }
      })
    );
    game.generator(function* () {
      playSound("dialogue-noise.wav", 0.8);
      yield timer(boss.state.duration * 0.9);
      playSound("dialogue-noise.wav", 1.2);
    });
    return timer(delay);
  }

  switchToDeathTeleportState(game: Game) {
    const boss = this;
    this.state = {
      type: "death-teleport",
      startTime: game.t,
      duration: 2,
    };
    game.generator(function* () {
      playSound("dialogue-noise.wav", 0.8);
      yield timer(boss.state.duration * 0.9);
      playSound("dialogue-noise.wav", 1.2);
    });
    game.addEntity(
      text([<>Oh no.</>, <>Oh no oh no oh no oh no.</>], () => {
        game.generator(function* () {
          yield timer(1);
          boss.state = {
            type: "idle",
            startTime: game.t,
            duration: Infinity,
          };
          game.addEntity(
            text([
              <>Wait</>,
              <>What is this?</>,
              <>Oh.</>,
              <>So you never intended to destroy me.</>,
              <>Even if it appeared that way.</>,
              <>It was only... a merging.</>,
              <>...</>,
              <>Fascinating.</>,
              <>How incredibly fascinating.</>,
              <>
                Your permanence in the face of resistance surpassed even my
                expectations.
              </>,
              <>
                You are but a crude slick of oil on a puddle that comes back
                into our world seemingly by its own nature but.
              </>,
              <>The pattern you diffract.</>,
              <>Is</>,
              <>
                Nonetheless beautiful.<SlowText delay={1200}> </SlowText>
              </>,
              <>However...</>,
              <>
                I witness that the others are already reacting to your presence.
              </>,
              <>To, even, my seemingly altered presence.</>,
              <>Good luck.</>,
              <>
                You <em>will</em> prevail.
              </>,
              <>But the question is:</>,
              <>How long will it take?</>,
              <>How long will we drag our feet?</>,
              <>
                How long will we ignore what you have to offer to ease our pain?
              </>,
              <>...</>,
              <>I suppose that was more like three questions.</>,
              <>...</>,
              <>Now be on your way.</>,
              <>I have...</>,
              <>A lot... to mull over.</>,
            ])
          );
        });
      })
    );
    return timer(boss.state.duration);
  }

  switchToZigzagState(game: Game) {
    this.state = {
      type: "zigzag",
      startTime: game.t,
      duration: 2,
    };
    const boss = this;
    game.generator(function* () {
      yield timer(1.0);
      for (const i of range(8)) {
        if (boss.state.type !== "zigzag") return;
        playSound("fart.wav", i * 0.3 + 1);
        game.addEntity(
          new DiscoveryTendril({
            speed: 0.08,
            timeToDelete: 0.8,
            timeToAttack: 0.15,
            startPos: vec2.clone(boss.pos),
            angleOffset: (Math.PI / 2) * (2 * (i % 2) - 1),
            creator: boss,
          })
        );
        yield timer(0.07);
      }
    });

    return timer(2);
  }

  switchToSlowZigzagState(game: Game) {
    this.state = {
      type: "slow-zigzag",
      startTime: game.t,
      duration: 8,
    };
    const boss = this;
    game.generator(function* () {
      for (const i of range(10)) {
        for (const mul of [-1, 1]) {
          const angle =
            mul * 0.6 +
            Math.atan2(
              game.player.pos[1] - boss.pos[1],
              game.player.pos[0] - boss.pos[0]
            );
          const end: vec2 = [
            boss.pos[0] + Math.cos(angle) * 3,
            boss.pos[1] + Math.sin(angle) * 3,
          ];
          game.addEntity(
            new LineDamageIndicator(vec2.clone(boss.pos), end, 0.1)
          );
        }
        yield timer(0.1);
      }
      const angleBase = Math.atan2(
        game.player.pos[1] - boss.pos[1],
        game.player.pos[0] - boss.pos[0]
      );
      let angleAllowance = 0.6;
      const createBoundaries = () => {
        for (const mul of [-1, 1]) {
          game.addEntity(
            new DiscoveryTendril({
              speed: 0.07,
              timeToDelete: 1.0,
              timeToAttack: Infinity,
              startPos: vec2.clone(boss.pos),
              angleOffset: angleBase + mul * angleAllowance,
              creator: boss,
              absAngle: true,
            })
          );
        }
      };
      createBoundaries();
      yield timer(0.5);
      for (const i of range(5)) {
        if (boss.state.type !== "slow-zigzag") return;
        playSound("fart.wav", i * 0.3 + 1);
        game.addEntity(
          new DiscoveryTendril({
            speed: 0.12,
            timeToDelete: 0.6,
            timeToAttack: 0.2,
            startPos: vec2.clone(boss.pos),
            angleOffset: (Math.PI / 2) * ((i % 2) * 2 - 1),
            creator: boss,
          })
        );
        createBoundaries();
        angleAllowance -= 0.07;
        yield timer(1.0);
      }
    });
    return timer(8);
  }

  switchToRadialState(game: Game) {
    this.state = {
      type: "radial",
      startTime: game.t,
      duration: 4,
    };
    const boss = this;
    game.generator(function* () {
      yield timer(1.0);
      for (const i of range(31)) {
        if (boss.state.type !== "radial") return;
        playSound("fart.wav", i * 0.06 + 1);
        const angle = 5 * (Math.PI / 31) * 2 * i;
        game.addEntity(
          new LineDamageIndicator(
            vec2.clone(boss.pos),
            [
              boss.pos[0] + Math.cos(angle) * 2,
              boss.pos[1] + Math.sin(angle) * 2,
            ],
            1
          )
        );
        game.addEntity(
          timer(0.25, () => {
            game.addEntity(
              new DiscoveryTendril({
                speed: 0.05,
                timeToDelete: 1,
                timeToAttack: 2,
                startPos: vec2.clone(boss.pos),
                angleOffset: angle,
                absAngle: true,
                creator: boss,
              })
            );
          })
        );
        yield timer(0.035);
      }
    });
    return timer(4);
  }

  resetMainAttackSequence() {
    const boss = this;
    this.mainAttackSequence = multiTimer(function* (game) {
      let firstIter = true;
      while (true) {
        yield boss.switchToTeleportState(game, firstIter ? 2 : undefined);
        yield boss.switchToZigzagState(game);
        yield boss.switchToTeleportState(game);
        yield boss.switchToSlowZigzagState(game);
        yield boss.switchToTeleportState(game);
        yield boss.switchToRadialState(game);
        firstIter = false;
      }
    });
  }

  constructor() {
    this.resetMainAttackSequence();
  }

  init(game: Game) {
    this.mainAttackSequence!.init(game);

    this.state.startTime = game.t;

    game.onPlayerDead(this, () => {
      this.hp = DISCOVERY_MAX_HP;
      this.resetMainAttackSequence();
      this.mainAttackSequence!.init(game);
    });
  }

  iter(game: Game) {
    if (this.isRunningMainAttackSequence) this.mainAttackSequence?.iter(game);

    if (
      isPlayerAttacking(game) &&
      vec2.dist(game.player.pos, this.pos) < ATTACK_RADIUS + 0.3 &&
      this.state.type !== "death-teleport" &&
      this.state.type !== "idle" &&
      this.state.type !== "teleport"
    ) {
      this.hp--;
      this.isBeingDamaged = true;
      game.addEntity(
        timer(0.1, () => {
          this.isBeingDamaged = false;
        })
      );
      playSound("click.wav", Math.random() * 0.2 + 0.9);
    }

    if (this.hp === 0) {
      this.isRunningMainAttackSequence = false;
      this.switchToDeathTeleportState(game);
      this.stopAttacking = true;
      this.hp = -0.00001;
    }
  }

  draw(game: Game) {
    this.displayDiscoveryHealthBar(game.ds);

    const bossT = mat3.create();
    mat3.translate(bossT, bossT, this.pos);
    if (
      this.state.type === "teleport" ||
      this.state.type === "death-teleport"
    ) {
      const teleportTime =
        (game.t - this.state.startTime) / this.state.duration;
      mat3.scale(bossT, bossT, [
        keyframes([
          [0, 1],
          [0.1, 0],
          [0.9, 0],
          [1, 1],
        ])(teleportTime),
        1,
      ]);
    }
    drawDiscoveryBody(
      bossT,
      game,
      this.isBeingDamaged || this.state.type === "death-teleport",
      this.state.type === "idle" ? 0.4 : 1,
      this.isBeingDamaged || this.state.type === "idle" ? 5 : 1
    );
  }

  displayDiscoveryHealthBar(ds: DrawSystem) {
    const pos1: vec2 = [-1.0, 1.0];
    const pos2: vec2 = [-1 + (2 * this.hp) / DISCOVERY_MAX_HP, 0.95];

    ds.rect(pos1, pos2, [0.5, 0.8, 1.0, 1.0]);
  }
}

export function discoveryBackground(game: Game, black?: boolean) {
  const t2 = game.t * 0.1;
  const offsetX = Math.cos(t2) * 0.1;
  const offsetY = Math.sin(t2) * 0.1;
  game.ds.draw(
    0,
    2,
    mat3.create(),
    [0.64 + offsetX, -0.75 + offsetY, 20, 0.4],
    black ? [0, 0, 0, 0.2] : [0.2, 0.1, 0.1, 0.2]
  );
}

export function drawDiscoveryBody(
  transform: mat3,
  game: Game,
  isBeingDamaged?: boolean,
  speed?: number,
  texture?: number
) {
  const x = mat3.clone(transform);
  mat3.scale(x, x, vec2.fromValues(0.3, 0.3));
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10 + Math.random() * 0.1) * Math.PI * 2;
    const transform = mat3.clone(x);
    mat3.rotate(transform, transform, angle);
    game.ds.draw(texture ?? 1, 0, transform, [1, 1, 1, 0.1]);
  }
  const s = 0.75;
  game.ds.draw(
    texture ?? 1,
    3,
    x,
    [
      -0.25,
      -0.25,
      0.8 +
        (game.t * Math.PI * 2 * (speed ?? 1) +
          (isBeingDamaged ? Math.random() : 0)) /
          2.0,
      2.0,
    ],
    [-s, -s, s, s]
  );
}
