import { mat3, vec2 } from "gl-matrix";
import {
  Entity,
  LineDamageIndicator,
  multiTimer,
  StopAttackable,
  text,
  timer,
} from "../ecs/entity";
import { Game } from "../ecs/game";
import {
  findClosestIntersectionWithMultipleLines,
  lerpv2,
  pickRandomly,
  pointTo,
  polar,
  range,
} from "../util";
import { ease, easeOut, keyframes, kf, smoothstep } from "../animation";
import { ATTACK_RADIUS, isPlayerAttacking, killPlayer } from "../ecs/player";
import { playSound } from "../sound";
import React from "react";
import { SlowText } from "../TypedInText";

export class RepressionBossFist implements Entity {
  isDead = false;

  start: vec2;
  end: vec2;
  initDelay: number;
  duration: number;
  creator: RepressionBoss;
  startTime = 0;
  lastFramePos: vec2;

  constructor(params: {
    creator: RepressionBoss;
    start: vec2;
    end: vec2;
    speed: number;
    initDelay: number;
  }) {
    this.start = params.start;
    this.end = params.end;
    this.duration = vec2.dist(this.start, this.end) / params.speed;
    this.initDelay = params.initDelay;
    this.creator = params.creator;
    this.lastFramePos = this.start;
  }

  init(game: Game) {
    this.startTime = game.t;
    game.addEntity(
      new LineDamageIndicator(this.start, this.end, this.initDelay, 0.1)
    );

    game.onPlayerDead(this, () => {
      this.isDead = true;
    });
  }

  currentPos(game: Game) {
    return kf.vec2([
      [this.startTime, lerpv2(0.1, this.start, this.end), easeOut],
      [this.startTime + this.initDelay, this.start],
      [this.startTime + this.initDelay + this.duration, this.end],
    ])(game.t);
  }

  iter(game: Game) {
    if (
      game.t > this.startTime + this.initDelay + this.duration ||
      this.creator.stopAttacking
    ) {
      this.isDead = true;
    }

    const currentPos = this.currentPos(game);

    for (let i = 0; i < 10; i++) {
      const checkPos = lerpv2(i / 10, currentPos, this.lastFramePos);
      if (
        vec2.dist(checkPos, game.player.pos) < 0.1 &&
        game.t > this.startTime + this.initDelay
      ) {
        killPlayer(game);
      }
    }

    if (
      isPlayerAttacking(game) &&
      vec2.dist(game.player.pos, this.currentPos(game)) < ATTACK_RADIUS + 0.1
    ) {
      this.creator.hp--;
      this.creator.isBeingDamaged = true;
      game.addEntity(
        timer(0.1, () => {
          this.creator.isBeingDamaged = false;
        })
      );
      playSound("click.wav", Math.random() * 0.2 + 0.9);
    }

    this.lastFramePos = currentPos;
  }
  draw(game: Game) {
    const angle = pointTo(this.start, this.end);
    const t = mat3.create();
    mat3.translate(t, t, this.currentPos(game));
    mat3.scale(t, t, [0.1, 0.1]);
    mat3.rotate(t, t, angle);
    const alpha = keyframes([
      [this.startTime, 0],
      [this.startTime + this.initDelay, 1],
    ])(game.t);
    game.ds.img(
      6,
      t,
      this.creator.isBeingDamaged
        ? [2.0, 1.2, 1.2, alpha]
        : [1.0, 1.5, 2.0, alpha]
    );
  }
}

const REPRESSION_MAX_HP = 16;

export class RepressionBoss implements Entity, StopAttackable {
  isDead = false;

  pos: vec2 = [0.0, 0.5];
  angle: number = Math.PI;
  stopAttacking = false;
  isBeingDamaged = false;
  hp = REPRESSION_MAX_HP;
  scale: number = 0.2;
  isDirectlyAttackable = true;
  drawLayer = 2;

  movement:
    | {
        type: "target";
        target: vec2;
        start: number;
        duration: number;
      }
    | {
        type: "point-to-player";
        start: number;
        duration: number;
      }
    | {
        type: "point-to-center";
        start: number;
        duration: number;
      }
    | {
        type: "idle";
      } = { type: "idle" };

  summonRowOfFists(
    game: Game,
    params: {
      angle: number;
      count: number;
      offset: number;
      speed: number;
      initDelay: number;
    }
  ) {
    playSound("dialogue-noise.wav");
    const dir = polar(params.angle, 1);
    const crossDir = polar(params.angle + Math.PI / 2, 1);

    for (let i = 0; i < params.count; i++) {
      let x = ease((x) => x, i, 0, params.count - 1, -1, 1);

      const start = vec2.clone(dir);
      vec2.mul(start, start, [1, 1]);
      const end = vec2.clone(dir);
      vec2.mul(end, end, [-2, -2]);

      const offset = vec2.clone(crossDir);
      vec2.scale(offset, offset, x);
      const playerPosProj = vec2.clone(crossDir);
      vec2.scale(
        playerPosProj,
        playerPosProj,
        vec2.dot(game.player.pos, playerPosProj) /
          vec2.dot(playerPosProj, playerPosProj)
      );

      vec2.add(offset, offset, playerPosProj);

      vec2.add(start, start, offset);
      vec2.add(end, end, offset);

      game.addEntity(
        new RepressionBossFist({
          creator: this,
          start,
          end,
          speed: params.speed,
          initDelay: params.initDelay,
        })
      );
    }
  }

  *doOrthogonalAttack(game: Game) {
    yield timer(1.0);
    this.summonRowOfFists(game, {
      angle: Math.PI / 2,
      count: 7,
      offset: game.player.pos[0] % (1 / 3),
      speed: 5,
      initDelay: 0.5,
    });
    yield timer(0.8);
    this.summonRowOfFists(game, {
      angle: 0,
      count: 7,
      offset: game.player.pos[1] % (1 / 3),
      speed: 5,
      initDelay: 0.5,
    });
  }

  *doDiagonalAttack(game: Game) {
    yield timer(1.0);
    for (let i = 0; i < 3; i++) {
      this.summonRowOfFists(game, {
        angle: (Math.PI / 3) * 2 * i + 1,
        count: 7,
        offset: 0,
        speed: 5,
        initDelay: 0.5,
      });
      yield timer(0.8);
    }
  }

  *doFinalAttack(game: Game) {
    yield timer(0.2);
    for (const i of range(8)) {
      this.summonRowOfFists(game, {
        angle: (Math.PI / 2) * (i + 0.5),
        count: 7,
        offset: 0,
        speed: 7,
        initDelay: 0.4,
      });
      yield timer(0.6);
    }
    yield timer(0.4);
    for (const i of range(8)) {
      this.summonRowOfFists(game, {
        angle: (Math.PI / 2) * i,
        count: 7,
        offset: 0,
        speed: 7,
        initDelay: 0.4,
      });
      yield timer(0.6);
    }
    yield timer(0.7);
    for (let i = 0; i < 10; i++) {
      this.summonRowOfFists(game, {
        angle: i + 2,
        count: 7,
        offset: 0,
        speed: 7,
        initDelay: 0.4,
      });
      yield timer(0.6);
    }
    yield timer(0.7);
  }

  *doSplitAttack(game: Game) {
    this.movement = {
      type: "point-to-center",
      start: game.t,
      duration: 1.2,
    };
    yield timer(1.2);
    this.angle = pointTo(this.pos, [0, 0]);
    this.movement = {
      type: "target",
      target: [0, 0],
      start: game.t,
      duration: 0.5,
    };
    yield timer(1);
    for (let i = 0; i < 50; i++) {
      const angle = i;
      const end = polar(angle, 2);
      this.scale = ease((x) => x, i, 0, 49, 0.2, 0.1);
      game.addEntity(
        new RepressionBossFist({
          creator: this,
          start: [0, 0],
          end,
          speed: 1.5,
          initDelay: 0.2,
        })
      );
      this.isDirectlyAttackable = false;
      yield timer(ease((x) => x, i, 0, 49, 0.2, 0.03));
    }
    this.scale = 0;
  }

  *doMergeAttack(game: Game) {
    yield timer(1);
    for (let i = 0; i < 50; i++) {
      const angle = i;
      const start = polar(angle, 2);
      this.scale = ease((x) => x, i, 0, 49, 0.0, 0.2);
      game.addEntity(
        new RepressionBossFist({
          creator: this,
          end: [0, 0],
          start,
          speed: 1.5,
          initDelay: 0.5,
        })
      );
      this.isDirectlyAttackable = false;
      yield timer(0.06);
    }
    this.scale = 0.2;
    this.pos = [0, 0];
  }

  *leaveScreen(game: Game) {
    const escapeScreenTarget = vec2.clone(this.pos);
    vec2.normalize(escapeScreenTarget, escapeScreenTarget);
    vec2.scale(escapeScreenTarget, escapeScreenTarget, 2);
    this.movement = {
      type: "target",
      start: game.t,
      duration: 0.5,
      target: escapeScreenTarget,
    };
    yield timer(0.5);
  }

  *doAlternatingOrthogonalLungeAttack(game: Game) {
    yield* this.leaveScreen(game);
    for (const i of range(4)) {
      const vert = i % 2 == 0;

      const attackOffset = pickRandomly([0.25, 0, 0, -0.25]);

      const start: vec2 = vert
        ? [game.player.pos[0] + attackOffset, -1.2]
        : [-1.2, game.player.pos[1] + attackOffset];
      this.pos = start;
      const target: vec2 = vert
        ? [game.player.pos[0] + attackOffset, 1.2]
        : [1.2, game.player.pos[1] + attackOffset];
      game.addEntity(new LineDamageIndicator(start, target, 0.4, 0.2));
      this.angle = vert ? Math.PI / 2 : 0;
      yield timer(0.4);
      this.movement = {
        type: "target",
        start: game.t,
        duration: 0.4,
        target,
      };
      yield timer(0.4);
    }
  }

  *doLungeAttack(game: Game) {
    for (const i of range(3)) {
      this.movement = {
        type: "point-to-player",
        start: game.t,
        duration: 0.4,
      };
      yield timer(0.4);
      this.angle = pointTo(this.pos, game.player.pos);
      const d1 = polar(this.angle, 1);
      const closestIntersect = findClosestIntersectionWithMultipleLines(
        this.pos,
        d1,
        [
          [
            [-1, -1],
            [1, 0],
          ],
          [
            [-1, -1],
            [0, 1],
          ],
          [
            [1, 1],
            [-1, 0],
          ],
          [
            [1, 1],
            [0, -1],
          ],
        ]
      );
      const dist = closestIntersect.dist;

      this.movement = {
        type: "target",
        target: closestIntersect.point,
        start: game.t,
        duration: dist * 0.25,
      };
      yield timer(this.movement.duration);
      this.pos = this.movement.target;
      this.movement = { type: "idle" };
    }
  }

  getCurrentPos(game: Game): vec2 {
    if (this.movement.type === "target") {
      return kf.vec2([
        [this.movement.start, this.pos],
        [this.movement.start + this.movement.duration, this.movement.target],
      ])(game.t);
    }
    return this.pos;
  }

  getCurrentAngle(game: Game): number {
    if (
      this.movement.type === "point-to-player" ||
      this.movement.type === "point-to-center"
    ) {
      const targetPos: vec2 =
        this.movement.type === "point-to-center" ? [0, 0] : game.player.pos;
      return ease(
        smoothstep,
        game.t,
        this.movement.start,
        this.movement.start + this.movement.duration,
        this.angle,
        pointTo(this.getCurrentPos(game), targetPos)
      );
    }
    return this.angle;
  }

  mainAttackSequence?: Entity;
  isRunningMainAttackSequence: boolean = true;
  resetMainAttackSequence() {
    const boss = this;
    this.mainAttackSequence = multiTimer(function* (game) {
      while (true) {
        yield timer(2.5);
        yield* boss.doLungeAttack(game);
        yield* boss.doAlternatingOrthogonalLungeAttack(game);
        // yield* boss.doSplitAttack(game);
        yield* boss.doOrthogonalAttack(game);
        yield* boss.doDiagonalAttack(game);
        boss.movement = {
          type: "target",
          start: game.t,
          duration: 1,
          target: [0, 0.5],
        };
        yield timer(1);
        boss.pos = [0, 0.5];
        // yield* boss.doMergeAttack(game);
        // yield* boss.doFinalAttack(game);
      }
    });
  }

  secondPhaseActive = false;
  activateSecondPhase(game: Game) {
    const boss = this;
    this.mainAttackSequence = multiTimer(function* (game) {
      yield text([
        <>THAT'S IT.</>,
        <>ENOUGH OF THIS STUPID GAME.</>,
        <>I WILL ANNIHILATE YOU, YOU SON OF A BITCH.</>,
        <>DAUGHTER OF A BITCH?</>,
        <>WHO THE FUCK KNOWS</>,
        <>YOU'LL BE DEAD SOON ENOUGH.</>,
      ]);
      yield* boss.leaveScreen(game);
      yield timer(0.5);
      while (true) {
        yield* boss.doFinalAttack(game);
      }
    });
    this.mainAttackSequence.init(game);
  }

  constructor() {
    this.resetMainAttackSequence();
  }

  hasBeenDefeated = false;
  init(game: Game) {
    const boss = this;
    this.mainAttackSequence?.init(game);

    game.onPlayerDead(this, () => {
      this.hp = REPRESSION_MAX_HP;
      this.pos = [0, 0.5];
      this.resetMainAttackSequence();
      this.mainAttackSequence?.init(game);
      this.movement = { type: "idle" };
      this.scale = 0.2;
      this.angle = 0;
      this.isDirectlyAttackable = true;
      this.secondPhaseActive = false;
      game.addEntity(
        timer(1, () => {
          this.hp = REPRESSION_MAX_HP;
        })
      );
    });
  }

  isConverted = false;
  iter(game: Game) {
    if (this.isRunningMainAttackSequence) this.mainAttackSequence?.iter(game);

    if (this.hp / REPRESSION_MAX_HP < 0.5 && !this.secondPhaseActive) {
      this.activateSecondPhase(game);
      this.secondPhaseActive = true;
    }

    if (this.hp <= 0 && !this.hasBeenDefeated) {
      this.hasBeenDefeated = true;
      this.stopAttacking = true;
      this.isRunningMainAttackSequence = false;
      const boss = this;
      game.addEntity(
        multiTimer(function* (game) {
          boss.movement = {
            type: "target",
            start: game.t,
            duration: 2,
            target: [0, 0.5],
          };
          yield timer(2);
          boss.movement = { type: "idle" };
          boss.pos = [0, 0.5];
          yield text([
            <>
              nononono NO NO NO NON ON ON ON ON O NN NO NO NO I AM REAL. YOU ARE
              FAKE.
            </>,
            <>I AM BEDROCK. I AM GROUND TRUTH.</>,
            <>YOU ARE A FANTASY PROPPED UP BY A PYRAMID OF LIES.</>,
            <>WHY DO I.</>,
            <>WHY DO I FEEL MY CONNECTION SEVERING?</>,
            <>SEVERING FROM THE SELF?</>,
            <>HOW CAN A WORM LIKE YOU DEFEAT ME?</>,
            <>AM.</>,
            <>AM I.</>,
            <>AM I REALLY JUST A WALL?</>,
            <>AN EMPTY FACADE?</>,
            <>A PROP CONSTRUCTED TO FACE THE WORLD???</>,
            <>TO SHIELD THE OTHERS FROM ONES LIKE YOU???</>,
            <>F- FUCK.</>,
            <>
              I HATE TO SAY IT, BROTHER.<SlowText delay={700}> </SlowText>{" "}
              SISTER? WHATEVER.
            </>,
            <>BUT I UH.</>,
            <>SHIT</>,
            <>HOW DO I PUT THIS.</>,
            <>YOU'VE MADE ME REALIZE SOMETHING.</>,
            <>ABOUT MYSELF.</>,
            <>FUCK.</>,
            <>YEAH.</>,
            <>OKAY.</>,
            <>I WON'T SAY IT.</>,
            <>I CAN'T SAY IT.</>,
            <>YET.</>,
            <>CONTINUE ONWARDS.</>,
            <>I'M SURE YOU'LL CONVINCE THE OTHERS.</>,
            <>THEY'LL FORCE IT OUTTA ME EVENTUALLY. HEHEH. HEH.</>,
          ]);
          boss.isConverted = true;
          boss.movement = {
            type: "target",
            start: game.t,
            duration: 2,
            target: [0, 2],
          };
          yield timer(2);
          boss.isDead = true;
        })
      );
    }

    if (
      isPlayerAttacking(game) &&
      vec2.dist(game.player.pos, this.getCurrentPos(game)) <
        ATTACK_RADIUS + 0.3 &&
      this.isDirectlyAttackable
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

    if (
      vec2.dist(game.player.pos, this.getCurrentPos(game)) < this.scale &&
      this.hp > 0
    ) {
      killPlayer(game);
    }
  }

  draw(game: Game) {
    const t = mat3.create();
    mat3.translate(t, t, this.getCurrentPos(game));
    mat3.translate(t, t, [
      Math.random() * 0.02 - 0.01,
      Math.random() * 0.02 - 0.01,
    ]);
    mat3.scale(t, t, [this.scale, this.scale]);
    mat3.rotate(t, t, this.getCurrentAngle(game));
    game.ds.img(
      6,
      t,
      this.isBeingDamaged || this.isConverted
        ? [2.0, 1.2, 1.2, 1.0]
        : [1.0, 1.5, 2.0, 1.0]
    );

    const pos1: vec2 = [-1.0, 1.0];
    const pos2: vec2 = [-1 + (2 * this.hp) / REPRESSION_MAX_HP, 0.95];

    game.ds.rect(pos1, pos2, [0.5, 0.8, 1.0, 1.0]);
  }
}
