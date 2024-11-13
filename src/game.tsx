import { mat3, vec2 } from "gl-matrix";
import { makeDrawSystem } from "./gl/draw";
import {
  discoveryInitDialogue,
  discoveryScenes,
  drawDiscoveryBody,
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

  let t = 0;

  let player = {
    x: 0,
    y: 0,
    dx: 0,
    dy: 0,
  };

  const keysPressed: Record<string, boolean> = {};

  document.addEventListener("keydown", (e) => {
    keysPressed[e.key] = true;
  });
  document.addEventListener("keyup", (e) => {
    keysPressed[e.key] = false;
  });

  const ATTACK_INTERVAL = 20;
  let attackCooldown = 0;
  const ATTACK_RADIUS = 0.2;

  const fabrikTest: FabrikPoint[] = [];
  for (let i = 0; i < 10; i++) {
    fabrikTest.push({
      pos: vec2.fromValues(-1 + 0.1 * i, -1 + 0.1 * i),
      length: Math.sqrt(2) * 0.1,
    });
  }

  const loop = () => {
    let x: mat3 = mat3.create();
    // gl.clearColor(0, 0, 0, 0.1);
    // gl.clear(gl.COLOR_BUFFER_BIT);

    let prevPlayer = { ...player };

    if (Math.abs(player.x) >= 1.0) {
      player.dx = Math.abs(player.dx) * -Math.sign(player.x);
    }
    if (Math.abs(player.y) >= 1.0) {
      player.dy = Math.abs(player.dy) * -Math.sign(player.y);
    }
    player.x += player.dx;
    player.y += player.dy;
    player.dx *= 0.5;
    player.dy *= 0.5;
    if (keysPressed.w) player.dy += 0.01;
    if (keysPressed.s) player.dy -= 0.01;
    if (keysPressed.a) player.dx -= 0.01;
    if (keysPressed.d) player.dx += 0.01;
    if (attackCooldown > 0) attackCooldown--;
    if (keysPressed[" "] && attackCooldown == 0) {
      attackCooldown = ATTACK_INTERVAL;
      player.dx *= -1;
      player.dy *= -1;
    }

    // introCutscene.loop?.(ds, t / 60, () => {});
    discoveryScenes.loop?.(textRoot, ds, t / 60, t / 60, false, () => {});

    ds.dispatch();
    t++;
    requestAnimationFrame(loop);
  };

  loop();
}
