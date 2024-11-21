import { mat3, vec2 } from "gl-matrix";
import { makeDrawSystem } from "./gl/draw";
import {
  discoveryInitDialogue,
  discoveryScenes,
  introText,
} from "./bosses/discovery-scenes.tsx";
import {
  doFabrik,
  drawFabrikChain,
  drawFabrikChainSegments,
  FabrikPoint,
} from "./fabrik";
import { createRoot } from "react-dom/client";
import { TypedInTextSequence } from "./TypedInText.tsx";
import React from "react";
import { makeGame } from "./ecs/game.ts";
import { sequence, text } from "./ecs/entity.tsx";
import { repressionScenes } from "./bosses/repression-scenes.tsx";
import { intellectualizationScenes } from "./bosses/intellectualization-scenes.tsx";

// testing function not for release
export async function game() {
  const canvas = document.createElement("canvas");
  document.getElementById("root")!.appendChild(canvas);

  const textRoot = createRoot(document.getElementById("text-root")!);

  // introText.init(textRoot, () => {});

  const gl = canvas.getContext("webgl2", { preserveDrawingBuffer: true });
  if (!gl) throw new Error("no gl");

  const minDim = Math.min(window.innerWidth, window.innerHeight);
  canvas.width = minDim;
  canvas.height = minDim;

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  const ds = await makeDrawSystem(gl);
  if (!ds) throw new Error("no ds");

  const game = makeGame(ds, textRoot);

  const skip = new URLSearchParams(window.location.search).get("skip");

  const startAt = Number(skip) || 0;

  game.addEntity(
    sequence(
      [discoveryScenes, repressionScenes, intellectualizationScenes].slice(
        startAt
      )
    )
  );

  const loop = () => {
    game.iterEntities();
    game.drawEntities();
    ds.dispatch();
    requestAnimationFrame(loop);
  };

  loop();
}
