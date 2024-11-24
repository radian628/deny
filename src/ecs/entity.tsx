import { mat3, vec2 } from "gl-matrix";
import { DrawSystem } from "../gl/draw";
import { Game } from "./game";
import { TextSeq } from "../TypedInText";
import React from "react";
import { ease } from "../animation";

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
  let prevgen;
  return {
    isDead: false,
    init(game) {
      gen = f(game);
      prevgen = gen;
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

export function allDone(
  shouldBeDone: Entity[],
  killWhenDone: Entity[]
): Entity {
  return {
    isDead: false,
    init(game) {
      for (const e of shouldBeDone) game.addEntity(e);
      for (const e of killWhenDone) game.addEntity(e);
    },
    iter(game) {
      if (shouldBeDone.every((e) => e.isDead)) {
        this.isDead = true;
        for (const e of killWhenDone) {
          e.isDead = true;
        }
      }
    },
    draw(game) {},
  };
}

export function drawOnly(
  draw: (game: Game) => void,
  drawLayer?: number
): Entity {
  return {
    isDead: false,
    drawLayer,
    init(game) {},
    iter(game) {},
    draw,
  };
}

export function iterOnly(iter: (game: Game) => void): Entity {
  return {
    isDead: false,
    init(game) {},
    iter,
    draw(game) {},
  };
}

export interface StopAttackable {
  stopAttacking: boolean;
}

export class LineDamageIndicator implements Entity {
  isDead = false;
  start: vec2;
  end: vec2;
  lifetime: number;
  startTime: number = 0;
  width: number;

  constructor(start: vec2, end: vec2, lifetime: number, width?: number) {
    this.start = start;
    this.end = end;
    this.lifetime = lifetime;
    this.width = width ?? 0.005;
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
    mat3.scale(t, t, [
      length * 0.5,
      ease(
        (x) => x,
        game.t,
        this.startTime,
        this.startTime + this.lifetime,
        this.width,
        0
      ),
    ]);
    mat3.translate(t, t, [1, 0]);
    game.ds.draw(0, 4, t, [0.4, 0.7, 1.0, 0.15]);
  }
}

export type OneTimeEvent<T> = {
  happened: boolean;
  data: T;
  do: (f: (data: T) => void) => void;
};

export function oneTime<T>(data: T): OneTimeEvent<T> {
  return {
    happened: false,
    data,
    do(f) {
      if (!this.happened) f(this.data);
      this.happened = true;
    },
  };
}
