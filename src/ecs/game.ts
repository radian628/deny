import { vec2 } from "gl-matrix";
import { directMultiTimer, Entity, multiTimer } from "./entity";
import { DrawSystem } from "../gl/draw";
import { Root } from "react-dom/client";
import { mutuallyExclusiveSound, MutuallyExlusiveSound } from "../sound";

export type Game = {
  entities: Entity[];
  player: {
    pos: vec2;
    vel: vec2;
    deathAnimationTimer: number;
    deathParticles: { pos: vec2; vel: vec2 }[];
    attackCooldown: number;
    justDied: boolean;
  };
  t: number;
  dt: number;
  ds: DrawSystem;
  addEntity(entity: Entity): Entity;
  text: Root;
  onKill(entity: Entity, fn: () => void): void;
  iterEntities(): void;
  drawEntities(): void;
  generator(gen: Generator<Entity, void, void>): void;
  onPlayerDead(entity: Entity, fn: () => void): void;
  backingTrack: MutuallyExlusiveSound;
  eventDrivenSound: MutuallyExlusiveSound;
  eventDrivenSound2: MutuallyExlusiveSound;
};

export function makeGame(ds: DrawSystem, text: Root): Game {
  const killHandlers = new Map<Entity, (() => void)[]>();
  let initT = performance.now() / 1000;
  let pt = 0;
  const playerDeadHandlers = new Map<Entity, (() => void)[]>();
  return {
    backingTrack: mutuallyExclusiveSound(),
    eventDrivenSound: mutuallyExclusiveSound(),
    eventDrivenSound2: mutuallyExclusiveSound(),
    entities: [],
    player: {
      pos: [0, 0],
      vel: [0, 0],
      deathAnimationTimer: 0,
      deathParticles: [],
      attackCooldown: 0,
      justDied: false,
    },
    t: 0,
    dt: 0,
    ds,
    addEntity(entity) {
      entity.init(this);
      this.entities.push(entity);
      return entity;
    },
    text,
    onKill(entity: Entity, fn: () => void) {
      let handlers = killHandlers.get(entity);
      if (!handlers) {
        handlers = [];
        killHandlers.set(entity, handlers);
      }
      handlers.push(fn);
    },
    onPlayerDead(entity: Entity, fn: () => void) {
      let handlers = playerDeadHandlers.get(entity);
      if (!handlers) {
        handlers = [];
        playerDeadHandlers.set(entity, handlers);
      }
      handlers.push(fn);
    },
    iterEntities() {
      const lastPT = pt;
      this.t = performance.now() / 1000 - initT;
      pt = this.t;
      this.dt = Math.min(1 / 25, pt - lastPT);
      for (const e of this.entities) {
        e.iter(this);
      }
      if (this.player.justDied) {
        for (const [_, handlers] of playerDeadHandlers.entries()) {
          for (const h of handlers) h();
        }
        this.player.justDied = false;
      }
      for (const e of this.entities) {
        if (e.isDead) {
          const handlers = killHandlers.get(e);
          for (const h of handlers ?? []) {
            h();
          }
          killHandlers.delete(e);
          playerDeadHandlers.delete(e);
        }
      }
      this.entities = this.entities.filter((e) => !e.isDead);
    },
    drawEntities() {
      // if (Math.abs(pt - this.t) < 0.04) {
      //   console.log("desync!");
      //   initT += pt - this.t;
      // }
      for (const e of this.entities.sort(
        (a, b) => (a.drawLayer ?? 0) - (b.drawLayer ?? 0)
      ))
        e.draw(this);
    },
    generator(gen) {
      this.addEntity(directMultiTimer(gen));
    },
  };
}
