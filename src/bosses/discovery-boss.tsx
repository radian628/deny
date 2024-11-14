import { mat3, vec2 } from "gl-matrix";
import { ATTACK_RADIUS, isPlayerAttacking, killPlayer } from "../ecs/player";
import { DrawSystem } from "../gl/draw";
import { doFabrik, drawFabrikChainSegments, FabrikPoint } from "../fabrik";
import { range } from "../util";
import { playSound } from "../sound";
import { lerp, smoothstep } from "../animation";
import { Game } from "../ecs/game";
import { Entity, interval, timer } from "../ecs/entity";

const DISCOVERY_MAX_HP = 25;
const DISCOVERY_SIZE = 0.3;
const DAMAGE_INDICATOR_COOLDOWN = 15;

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

  constructor(params: {
    speed: number;
    timeToDelete: number;
    timeToAttack: number;
    startPos: vec2;
    angleOffset: number;
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
  }

  init(game: Game) {
    this.startTime = game.t;

    // target the player, offset by an angle
    vec2.sub(this.dir, game.player.pos, this.dir);
    vec2.normalize(this.dir, this.dir);
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
    const t = game.t - this.startTime;

    doFabrik(this.points, this.target, 10);

    vec2.add(this.target, this.target, this.dir);
  }

  draw(game: Game) {
    drawFabrikChainSegments(this.points, (trans, pos, i) => {
      mat3.scale(trans, trans, [0.1, 0.1]);
      game.ds.img(1, trans);
    });
  }
}

export function discoveryBoss(): Entity {
  let framesUntilAttack = 0;
  return {
    isDead: false,
    pos: [0, 0.5] as vec2,
    hp: DISCOVERY_MAX_HP,

    init(game: Game) {},
    iter(game: Game) {
      framesUntilAttack--;
      if (framesUntilAttack <= 0) {
        framesUntilAttack = 300;
        game.addEntity(
          interval(0.07, 16, (i) => {
            game.addEntity(
              new DiscoveryTendril({
                speed: 0.08,
                timeToDelete: 0.8,
                timeToAttack: 0.15,
                startPos: vec2.clone(this.pos),
                angleOffset: (Math.PI / 2) * (2 * (i % 2) - 1),
              })
            );
          })
        );
      }
    },
    draw(game: Game) {
      this.displayDiscoveryHealthBar(game.ds);

      const bossT = mat3.create();
      mat3.translate(bossT, bossT, this.pos);
      drawDiscoveryBody(bossT, game);
    },

    displayDiscoveryHealthBar(ds: DrawSystem) {
      const pos1: vec2 = [-1.0, 1.0];
      const pos2: vec2 = [-1 + (2 * this.hp) / DISCOVERY_MAX_HP, 0.95];

      ds.rect(pos1, pos2, [0.5, 0.8, 1.0, 1.0]);
    },
  };
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

// export function tendril(): Entity {}

export function drawDiscoveryBody(transform: mat3, game: Game) {
  const x = mat3.clone(transform);
  mat3.scale(x, x, vec2.fromValues(0.3, 0.3));
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10 + Math.random() * 0.1) * Math.PI * 2;
    const transform = mat3.clone(x);
    mat3.rotate(transform, transform, angle);
    game.ds.draw(1, 0, transform, [1, 1, 1, 0.1]);
  }
  const s = 0.75;
  game.ds.draw(
    1,
    3,
    x,
    [-0.25, -0.25, 0.8 + (game.t * Math.PI * 2) / 2.0, 2.0],
    [-s, -s, s, s]
  );
}
