import { mat3, vec2 } from "gl-matrix";
import {
  Entity,
  multiTimer,
  oneTime,
  OneTimeEvent,
  StopAttackable,
  text,
  timer,
} from "../ecs/entity";
import { Game } from "../ecs/game";
import React from "react";
import { pointTo, polar, range } from "../util";
import { ATTACK_RADIUS, isPlayerAttacking, killPlayer } from "../ecs/player";
import { ease, keyframes, kf, smoothstep } from "../animation";
import { drawHealthBar } from "./common";

export class SimpleProjectile implements Entity {
  isDead = false;
  drawLayer = 3;

  start: vec2;
  direction: number;
  speed: number;
  lifetime: number;
  size: number;
  startTime = 0;
  creator: StopAttackable;

  constructor(
    creator: StopAttackable,
    start: vec2,
    direction: number,
    speed: number,
    lifetime: number,
    size: number
  ) {
    this.start = start;
    this.direction = direction;
    this.speed = speed;
    this.lifetime = lifetime;
    this.size = size;
    this.creator = creator;
  }

  init(game: Game) {
    this.startTime = game.t;
    game.onPlayerDead(this, () => {
      this.isDead = true;
    });
  }

  iter(game: Game) {
    if (game.t > this.startTime + this.lifetime || this.creator.stopAttacking)
      this.isDead = true;
    if (vec2.dist(this.getCurrentPos(game), game.player.pos) < this.size) {
      killPlayer(game);
    }
  }

  getCurrentPos(game: Game) {
    const pos = vec2.clone(this.start);
    const offset = (game.t - this.startTime) * this.speed;
    vec2.add(pos, pos, polar(this.direction, offset));
    return pos;
  }

  draw(game: Game) {
    const t = mat3.create();
    mat3.translate(t, t, this.getCurrentPos(game));
    mat3.scale(t, t, [this.size, this.size]);
    game.ds.img(9, t, [0.5, 0.7, 1.0, 1.0]);
  }
}

export class AttackTiedEntity implements Entity {
  isDead = false;
  entity: Entity;
  creator: StopAttackable;
  constructor(creator: StopAttackable, entity: Entity) {
    this.creator = creator;
    this.entity = entity;
  }

  init(game: Game) {
    this.entity.init(game);
  }

  iter(game: Game) {
    this.entity.iter(game);
    if (this.entity.isDead || this.creator.stopAttacking) {
      this.isDead = true;
      this.entity.isDead = true;
    }
  }

  draw(game: Game) {
    this.entity.draw(game);
  }
}

export class ProjectileSpawner implements Entity {
  isDead = false;
  creator: StopAttackable;
  pos: vec2;
  duration: number;
  start: number = 0;
  pattern: (
    spawner: ProjectileSpawner,
    game: Game
  ) => Generator<Entity, void, void>;

  constructor(
    creator: StopAttackable,
    pos: vec2,
    duration: number,
    pattern: (
      spawner: ProjectileSpawner,
      game: Game
    ) => Generator<Entity, void, void>
  ) {
    this.creator = creator;
    this.pos = pos;
    this.duration = duration;
    this.pattern = pattern;
  }

  mainseq?: Entity;
  init(game: Game) {
    this.start = game.t;
    const self = this;
    this.mainseq = multiTimer((game: Game) => this.pattern(this, game));
    this.mainseq?.init(game);
  }
  iter(game: Game) {
    if (game.t > this.start + this.duration) this.isDead = true;
    this.mainseq?.iter(game);
  }
  draw(game: Game) {
    const t = mat3.create();
    mat3.translate(t, t, this.pos);
    mat3.rotate(t, t, game.t * 5);
    mat3.scale(t, t, [0.06, 0.06]);
    game.ds.img(9, t, [1.0, 1.0, 1.0, 1.0]);
  }
}

const INTELLECTUALIZATION_MAX_HP = 30;

export class IntellectualizationBoss implements Entity, StopAttackable {
  isDead = false;
  drawLayer = 2;
  hp = INTELLECTUALIZATION_MAX_HP;
  stopAttacking = false;

  pos: vec2 = [0, 0.5];
  standardPositions: vec2[] = [
    [-0.7, -0.7],
    [0.7, -0.7],
    [0.7, 0.7],
    [-0.7, 0.7],
  ];
  nextPosIndex = 0;

  phase: OneTimeEvent<
    | {
        type: "intro";
      }
    | {
        type: "boss";
      }
    | {
        type: "defeat";
      }
    | { type: "player-death" }
  > = oneTime({ type: "intro" });

  movement:
    | {
        type: "idle";
      }
    | {
        type: "move";
        start: number;
        duration: number;
        target: vec2;
      }
    | {
        type: "teleport";
        start: number;
        duration: number;
      } = { type: "idle" };

  mainAttackSequence?: Entity;

  getCurrentPos(game: Game) {
    if (this.movement.type === "move") {
      return kf.vec2([
        [this.movement.start, this.pos, smoothstep],
        [this.movement.start + this.movement.duration, this.movement.target],
      ])(game.t);
    }
    return this.pos;
  }

  *newMainAttackSequence(game: Game) {
    yield timer(1.5);
    const boss = this;
    // game.addEntity(
    //   multiTimer(function* () {
    //     yield timer(8);
    //     boss.movement = {
    //       type: "teleport",
    //       start: game.t,
    //       duration: 1,
    //     };
    //     yield timer(0.5);
    //     boss.pos = [-0.75, -0.3];
    //     yield timer(0.5);
    //     boss.movement = { type: "idle" };
    //     while (true) {
    //       for (const i of range(3)) {
    //         game.addEntity(
    //           new SimpleProjectile(
    //             [-0.75, -0.3],
    //             pointTo(boss.pos, game.player.pos),
    //             1,
    //             2,
    //             0.05
    //           )
    //         );
    //         yield timer(0.7);
    //       }
    //       yield timer(3);
    //     }
    //   })
    // );

    game.addEntity(
      new AttackTiedEntity(
        this,
        new ProjectileSpawner(this, [0, 0], Infinity, function* (
          spawner,
          game
        ) {
          // while (true) {
          //   for (const i of range(7)) {
          //     const baseAngle = pointTo(self.pos, game.player.pos);
          //     const angle = baseAngle + ease((x) => x, i, 0, 6, -1, 1);
          //     game.addEntity(
          //       new SimpleProjectile(self.creator, self.pos, angle, 0.3, 6, 0.05)
          //     );
          //   }
          //   yield timer(0.8);
          // }
          let x = 0;
          while (true) {
            const angle = x * Math.PI * (3 - Math.sqrt(5));
            game.addEntity(
              new SimpleProjectile(
                spawner.creator,
                spawner.pos,
                angle,
                0.2,
                10,
                0.05
              )
            );
            x++;
            yield timer(0.05);
          }
        })
      )
    );

    yield timer(1);
  }

  doPhaseInit(game: Game) {
    const phase = this.phase.data;
    const boss = this;
    this.nextPosIndex = 0;
    if (phase.type === "intro") {
      game.addEntity(
        multiTimer(function* (game) {
          yield timer(2);
          yield text([
            <code>self:~$ A foreign object has entered my killsphere.</code>,
            <code>
              self:~$ It is approximately 0.27 of me in diameter and is
              vec4(1.0, 0.7, 0.7, 1.0) in hue.
            </code>,
            <code>
              self:~$ It is to be dissected into its component parts, decompiled
              so that its individual pieces may be processed and assimilated on
              our own standards.
            </code>,
            <code>
              self:~$ As our master declared its own standards are to be
              expressly <em>ignored.</em>
            </code>,
          ]);
          boss.phase = oneTime({ type: "boss" });
        })
      );
    }

    if (phase.type === "boss") {
      this.hp = INTELLECTUALIZATION_MAX_HP;
      this.pos = [0, 0.5];
      this.stopAttacking = false;
      this.mainAttackSequence = multiTimer(
        this.newMainAttackSequence.bind(this)
      );
      this.mainAttackSequence.init(game);
    }

    if (phase.type === "defeat") {
      this.stopAttacking = true;
      game.addEntity(
        multiTimer(function* (game) {
          yield timer(2);
          yield text([
            <code>self:~$ Error: Reduction to basal components failed.</code>,
            <code>self:~$ Process ended with exit code -1.</code>,
            <code>
              self:~$ Any reductive analysis of this being, this (MANUAL
              OVERRIDE: DENY DENY DENY ERASE IT ERASE IT DO NOT NAME IT
              GENERALITIES ONLY) cannot meaningfully split it apart.
            </code>,
            <code>self:~$ It can only be assimilated on its own terms.</code>,
            <code>self:~$ It will be assimilated on its own terms.</code>,
            <code>self:~$ And.</code>,
            <code>
              self:~$ The most surprising yet certain phenomenon (p &lt; 0.001)
              is as follows:
            </code>,
            <code>
              self:~$ It is created out of the same substance as ourselves.
            </code>,
          ]);
          boss.isDead = true;
        })
      );
    }

    if (phase.type === "player-death") {
      game.addEntity(
        multiTimer(function* (game) {
          boss.stopAttacking = true;
          yield timer(1);
          boss.phase = oneTime({ type: "boss" });
        })
      );
    }
  }

  doPhaseIter(game: Game) {
    if (this.phase.data.type === "boss") {
      this.mainAttackSequence?.iter(game);
    }
  }

  init(game: Game) {
    game.onPlayerDead(this, () => {
      this.phase = oneTime({ type: "player-death" });
    });
  }

  teleportToNextPosition(game: Game) {
    const boss = this;
    game.addEntity(
      multiTimer(function* () {
        boss.movement = { type: "teleport", start: game.t, duration: 1 };
        yield timer(0.5);
        boss.pos =
          boss.hp == 0 ? [0, 0] : boss.standardPositions[boss.nextPosIndex];
        boss.nextPosIndex =
          (boss.nextPosIndex + 1) % boss.standardPositions.length;
        yield timer(0.5);
        boss.movement = { type: "idle" };
      })
    );
  }

  hasBeenDefeated = false;
  iter(game: Game) {
    this.phase.do((phase) => {
      this.doPhaseInit(game);
    });
    this.doPhaseIter(game);

    if (
      isPlayerAttacking(game) &&
      vec2.dist(this.getCurrentPos(game), game.player.pos) <
        ATTACK_RADIUS + 0.2 &&
      this.phase.data.type === "boss" &&
      this.movement.type !== "teleport"
    ) {
      this.hp--;
      const boss = this;
      this.teleportToNextPosition(game);
    }

    if (this.hp <= 0 && !this.hasBeenDefeated) {
      this.hasBeenDefeated = true;
      this.phase = oneTime({ type: "defeat" });
    }
  }
  draw(game: Game) {
    const t = mat3.create();
    mat3.translate(t, t, this.getCurrentPos(game));
    if (this.movement.type === "teleport") {
      mat3.scale(t, t, [
        keyframes([
          [this.movement.start, 0.2, smoothstep],
          [this.movement.start + this.movement.duration * 0.1, 0, smoothstep],
          [this.movement.start + this.movement.duration * 0.9, 0, smoothstep],
          [this.movement.start + this.movement.duration, 0.2],
        ])(game.t),
        0.2,
      ]);
    } else {
      mat3.scale(t, t, [0.2, 0.2]);
    }
    const s = 1.8;

    game.ds.img(9, t, [1.0, 1.0, 1.0, 1.0]);

    drawHealthBar(game, this.hp, INTELLECTUALIZATION_MAX_HP);
  }
}
