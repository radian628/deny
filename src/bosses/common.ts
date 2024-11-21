import { vec2 } from "gl-matrix";
import { Game } from "../ecs/game";

export function drawHealthBar(game: Game, hp: number, maxhp: number) {
  const pos1: vec2 = [-1.0, 1.0];
  const pos2: vec2 = [-1 + (2 * hp) / maxhp, 0.95];
  game.ds.rect(pos1, pos2, [0.5, 0.8, 1.0, 1.0]);
}
