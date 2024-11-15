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

  game.addEntity(discoveryScenes);

  let loopCount = 0;
  let drawLoopCount = 0;

  const loop = () => {
    loopCount++;
    game.iterEntities();
    // setTimeout(loop, 1000 / 60);
  };

  const drawLoop = () => {
    drawLoopCount++;
    game.drawEntities();
    ds.dispatch();
    requestAnimationFrame(drawLoop);
  };

  setInterval(loop, 1000 / 60);
  drawLoop();
}
