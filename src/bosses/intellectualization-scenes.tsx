import { mat3 } from "gl-matrix";
import { allDone, drawOnly, iterOnly } from "../ecs/entity";
import { Game } from "../ecs/game";
import { drawPlayer, runPlayerIter } from "../ecs/player";
import { IntellectualizationBoss } from "./intellectualization-boss";
import { repressionBackground } from "./repression-scenes";

export const intellectualizationScenes = allDone(
  [new IntellectualizationBoss()],
  [
    iterOnly((game) => {
      runPlayerIter(game);
    }),
    drawOnly((game) => {
      intellectualizationBackground(game);
    }, -1),
    drawOnly((game) => drawPlayer(game), 3),
  ]
);

export function intellectualizationBackground(game: Game, black?: boolean) {
  const t2 = game.t * 0.05;
  const offsetX = Math.cos(t2) * 0.2;
  const offsetY = Math.sin(t2) * 0.2;
  game.ds.draw(
    8,
    2,
    mat3.create(),
    [0.64 + offsetX, -0.75 + offsetY, 8, 0.4],
    black ? [0, 0, 0, 0.2] : [0.15, 0.15, 0.15, 0.05]
  );
}
