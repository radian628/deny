import { vec2 } from "gl-matrix";
import { DrawSystem } from "../gl/draw";

export type Game = {
  entities: Entity[];
  player: {
    pos: vec2;
    vel: vec2;
  };
};

export interface Entity {
  isDead: boolean;
  iter(t: number, entities: Entity[]): void;
  draw(ds: DrawSystem, t: number): void;
}

export function iterEntities(t: number, entities: Entity[]) {
  for (const e of entities) {
    e.iter(t, entities);
  }
}

export function drawEntities(ds: DrawSystem, t: number, entities: Entity[]) {
  for (const e of entities) {
    e.draw(ds, t);
  }
}
