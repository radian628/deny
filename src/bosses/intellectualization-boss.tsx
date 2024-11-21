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
import { polar, range } from "../util";
import { ATTACK_RADIUS, isPlayerAttacking, killPlayer } from "../ecs/player";
import { ease, kf, smoothstep } from "../animation";
import { drawHealthBar } from "./common";

export class SimpleProjectile implements Entity {
  isDead = false;

  start: vec2;
  direction: number;
  speed: number;
  lifetime: number;
  size: number;
  startTime = 0;

  constructor(
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
  }

  init(game: Game) {
    this.startTime = game.t;
    game.onPlayerDead(this, () => {
      this.isDead = true;
    });
  }

  iter(game: Game) {
    if (game.t > this.startTime + this.lifetime) this.isDead = true;
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

export class IntellectualizationBoss implements Entity {
  isDead = false;
  drawLayer = 2;
  hp = 5;

  pos: vec2 = [0, 0.5];

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
    game.addEntity(
      multiTimer(function* () {
        yield timer(8);
        boss.movement = {
          type: "move",
          start: game.t,
          duration: 1,
          target: [-0.75, -0.3],
        };
        yield timer(1);
        boss.pos = [-0.75, -0.3];
      })
    );
    let x = 0;
    while (true) {
      const angle = x * Math.PI * (3 - Math.sqrt(5));
      game.addEntity(new SimpleProjectile([0, 0.5], angle, 0.2, 10, 0.05));
      x++;
      yield timer(0.05);
    }
  }

  doPhaseInit(game: Game) {
    const phase = this.phase.data;
    const boss = this;
    if (phase.type === "intro") {
      game.addEntity(
        multiTimer(function* (game) {
          yield timer(2);
          yield text([
            <>Just FYI the game is unfinished past this point.</>,
            <>So all the content after this point is buggy as hell.</>,
            <>OKAY RESUMING NORMAL GAME</>,
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
            <code>self:~$ Enabling multithreaded assault mode.</code>,
          ]);
          boss.phase = oneTime({ type: "boss" });
        })
      );
    }

    if (phase.type === "boss") {
      this.mainAttackSequence = multiTimer(
        this.newMainAttackSequence.bind(this)
      );
      this.mainAttackSequence.init(game);
    }

    if (phase.type === "defeat") {
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
            <code>It will be assimilated on its own terms.</code>,
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
  }

  doPhaseIter(game: Game) {
    if (this.phase.data.type === "boss") {
      this.mainAttackSequence?.iter(game);
    }
  }

  init(game: Game) {
    game.onPlayerDead(this, () => {
      this.phase = oneTime({ type: "boss" });
    });
  }

  hasBeenDefeated = false;
  iter(game: Game) {
    this.phase.do((phase) => {
      this.doPhaseInit(game);
    });
    this.doPhaseIter(game);

    if (
      isPlayerAttacking(game) &&
      vec2.dist(this.getCurrentPos(game), game.player.pos) < ATTACK_RADIUS + 0.2
    ) {
      this.hp--;
    }

    if (this.hp <= 0 && !this.hasBeenDefeated) {
      this.hasBeenDefeated = true;
      this.phase = oneTime({ type: "defeat" });
    }
  }
  draw(game: Game) {
    const t = mat3.create();
    mat3.translate(t, t, this.getCurrentPos(game));
    mat3.scale(t, t, [0.2, 0.2]);
    const s = 1.8;

    const t2 = mat3.create();
    mat3.translate(t2, t2, [0, 0.5]);
    mat3.scale(t2, t2, [0.2, 0.2]);

    // game.ds.draw(9, 3, t, [-0.5, -0.5, 0.8 + game.t, 4.0], [-s, -s, s, s]);
    game.ds.draw(9, 3, t2, [-0.5, -0.5, 0.8 + game.t, 2.0], [-s, -s, s, s]);
    game.ds.img(9, t, [1.0, 1.0, 1.0, 1.0]);

    drawHealthBar(game, this.hp, 5);
  }
}
