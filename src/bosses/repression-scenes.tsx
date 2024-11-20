import React from "react";
import {
  allDone,
  drawOnly,
  drawWithLayer,
  Entity,
  iterOnly,
  multiTimer,
  sequence,
  text,
  timer,
} from "../ecs/entity";
import { Game } from "../ecs/game";
import { drawPlayer, runPlayerIter } from "../ecs/player";
import { discoveryBackground } from "./discovery-boss";
import { mat3 } from "gl-matrix";
import { RepressionBoss } from "./repression-boss";

function emptyGameEntity(): Entity {
  return {
    isDead: false,
    init(game) {},
    iter(game) {
      runPlayerIter(game);
      game.addEntity(
        drawWithLayer(-1, (game) => {
          repressionBackground(game);
        })
      );
    },
    draw(game) {
      drawPlayer(game);
    },
  };
}

const repressionIntro = multiTimer(function* (game: Game) {
  yield allDone(
    [
      multiTimer(function* (game: Game) {
        yield timer(2);
        yield text([
          <>Sup</>,
          <>You son of a bitch.</>,
          <>You pansy ass piece of shit.</>,
          <>I'm going to fucking kill you.</>,
          <>
            I'm going to tear you limb-from-limb into limbs and tear those limbs
            piece-by-piece into pieces and then tear those pieces shred-by-shred
            into shreds and tear those shreds bit-by-bit into bits and tear
            those bits...
          </>,
          <>oh wait you DON'T HAVE LIMBS</>,
          <>Featureless fucking pink fucking blob.</>,
          <>Regardless.</>,
          <>I will annihilate you.</>,
          <>I want you gone.</>,
          <>I WANT YOU GONE.</>,
          <>I WANT YOU GONE I WANT YOU GONE I WANT YOU GONE</>,
          <>YOU ARE AN ANATHEMA TO EVERYTHING I STAND FOR.</>,
        ]);
      }),
    ],
    [
      emptyGameEntity(),

      drawOnly((game) => {
        const t = mat3.create();
        mat3.translate(t, t, [
          0.0 + Math.random() * 0.01 - 0.005,
          0.5 + Math.random() * 0.01 - 0.005 + Math.sin(game.t) * 0.05,
        ]);
        mat3.scale(t, t, [0.2, 0.2]);
        mat3.rotate(t, t, Math.PI);
        game.ds.img(6, t, [1.0, 1.5, 2.0, 1.0]);
      }),
    ]
  );

  yield allDone(
    [new RepressionBoss()],
    [
      iterOnly((game) => {
        runPlayerIter(game);
      }),
      drawOnly((game) => {
        repressionBackground(game);
      }, -1),
      drawOnly((game) => drawPlayer(game), 3),
    ]
  );
});

export function repressionBackground(game: Game, black?: boolean) {
  const t2 = game.t * 0.2;
  const offsetX = Math.cos(t2) * 0.1;
  const offsetY = Math.sin(t2) * 0.1;
  game.ds.draw(
    7,
    2,
    mat3.create(),
    [0.64 + offsetX, -0.75 + offsetY, 20, 0.4],
    black ? [0, 0, 0, 0.2] : [0.2, 0.1, 0.1, 0.2]
  );
}
export const repressionScenes = sequence([repressionIntro]);
