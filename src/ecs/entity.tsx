import { vec2 } from "gl-matrix";
import { DrawSystem } from "../gl/draw";
import { Game } from "./game";
import { TextSeq } from "../TypedInText";
import React from "react";

export interface Entity {
  isDead: boolean;
  drawLayer?: number;
  init(game: Game): void;
  iter(game: Game): void;
  draw(game: Game): void;
  [others: string]: any;
}

export function timer(time: number, f?: () => void): Entity {
  let startTime = 0;
  return {
    isDead: false,
    init(game) {
      startTime = game.t;
    },
    iter(game) {
      if (game.t > startTime + time) {
        f?.();
        this.isDead = true;
      }
    },
    draw() {},
  };
}

export function interval(
  delay: number,
  count: number,
  f: (i: number) => void
): Entity {
  let startTime = 0;
  let i = 0;
  return {
    isDead: false,
    init(game) {
      startTime = game.t;
    },
    iter(game) {
      if (game.t > startTime + delay) {
        f(i);
        startTime = game.t;
        i++;
        if (i === count) this.isDead = true;
      }
    },
    draw() {},
  };
}

export function multiTimer(
  f: (game: Game) => Generator<Entity, void, void>
): Entity {
  let gen: ReturnType<typeof f>;
  let currEntity: Entity;
  return {
    isDead: false,
    init(game) {
      gen = f(game);
    },
    iter(game) {
      if (!currEntity || currEntity.isDead) {
        const iter = gen.next();
        if (iter.done) {
          this.isDead = true;
        } else {
          currEntity = iter.value;
          game.addEntity(currEntity);
        }
      }
    },
    draw(game) {},
  };
}

export function directMultiTimer(gen: Generator<Entity, void, void>): Entity {
  let currEntity: Entity;
  return {
    isDead: false,
    init(game) {},
    iter(game) {
      if (!currEntity || currEntity.isDead) {
        const iter = gen.next();
        if (iter.done) {
          this.isDead = true;
        } else {
          currEntity = iter.value;
          game.addEntity(currEntity);
        }
      }
    },
    draw(game) {},
  };
}

export function sequence(entities: Entity[]): Entity {
  let entityIndex = 0;
  return {
    isDead: false,
    init(game: Game) {
      entities[0].init(game);
    },
    iter(game: Game) {
      if (!entities[entityIndex].isDead) {
        entities[entityIndex].iter(game);
      } else if (entityIndex === entities.length - 1) {
        this.isDead = true;
      } else {
        entityIndex++;
        entities[entityIndex].init(game);
      }
    },
    draw(game: Game) {
      entities[entityIndex].draw(game);
    },
  };
}

export function text(text: JSX.Element[], onDone?: () => void): Entity {
  return {
    isDead: false,
    init(game: Game) {
      game.text.render(<></>);
      setTimeout(() => {
        game.text.render(
          <TextSeq
            done={() => {
              this.isDead = true;
              game.text.render(<></>);
              if (onDone) onDone();
            }}
            seq={text}
          ></TextSeq>
        );
      });
    },
    iter(game) {},
    draw(game) {},
  };
}

export function drawWithLayer(
  layer: number,
  draw: (game: Game) => void
): Entity {
  let hasDrawn = false;
  return {
    drawLayer: layer,
    isDead: false,
    init(game) {},
    iter(game) {
      if (hasDrawn) {
        this.isDead = true;
      }
    },
    draw(game) {
      draw(game);
      hasDrawn = true;
    },
  };
}
