import { mat3, vec2 } from "gl-matrix";
import { ATTACK_RADIUS, isPlayerAttacking, killPlayer } from "../ecs/player";
import { DrawSystem } from "../gl/draw";
import { doFabrik, drawFabrikChainSegments, FabrikPoint } from "../fabrik";
import { range } from "../util";
import { playSound } from "../sound";
import { lerp, smoothstep } from "../animation";
import { Game } from "../ecs/game";
import { Entity } from "../ecs/entity";

const DISCOVERY_MAX_HP = 25;
const DISCOVERY_SIZE = 0.3;
const DAMAGE_INDICATOR_COOLDOWN = 15;

// interface DiscoveryTendril implements Entity {

// }

// export function discoveryTendril(): Entity {
//   return {
//     isDead: false,
//     segments:
//   }
// }

export function discoveryBoss(): Entity {
  return {
    isDead: false,
    pos: [0, 0.5] as vec2,
    hp: DISCOVERY_MAX_HP,
    init(game: Game) {},
    iter(game: Game) {},
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
