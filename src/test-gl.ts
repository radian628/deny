import { mat3, vec2 } from "gl-matrix";
import { makeDrawSystem } from "./gl/draw";
import { drawDiscoveryBody } from "./bosses/discovery-scenes.tsx";
import {
  doFabrik,
  drawFabrikChain,
  drawFabrikChainSegments,
  FabrikPoint,
} from "./fabrik";

// testing function not for release
export async function testGL(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext("webgl2", { preserveDrawingBuffer: true });
  if (!gl) throw new Error("no gl");

  const minDim = Math.min(window.innerWidth, window.innerHeight);
  canvas.width = minDim;
  canvas.height = minDim;
  document.body.style.display = "flex";
  document.body.style.margin = "0";
  document.body.style.justifyContent = "center";
  document.body.style.alignItems = "center";
  document.body.style.backgroundColor = "black";

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.enable(gl.BLEND);
  // gl.blendFunc(gl.ONE_MINUS_DST_ALPHA, gl.DST_ALPHA);
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
    // gl.clearColor(1.0, 1.0, 1.0, 1.0);
    // gl.clear(gl.COLOR_BUFFER_BIT);
    t++;

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

    // draw background
    const t2 = t * 0.002;
    const offsetX = Math.cos(t2) * 0.1;
    const offsetY = Math.sin(t2) * 0.1;
    ds.draw(
      0,
      2,
      x,
      [0.64 + offsetX, -0.75 + offsetY, 20, 0.4],
      [0.35, 0.21, 0.21, 0.2]
    );

    // draw first boss
    const bossTransform = mat3.create();
    const bossPos = vec2.fromValues(
      Math.cos(t * 0.01) * 0.5,
      Math.sin(t * 0.01) * 0.5
    );
    mat3.translate(bossTransform, bossTransform, bossPos);
    drawDiscoveryBody(ds, bossTransform, t);

    // draw projectiles

    // draw player attack
    {
      const transform = mat3.create();
      const playerPos: vec2 = [player.x, player.y];
      if (attackCooldown == ATTACK_INTERVAL) {
        ds.circle(playerPos, ATTACK_RADIUS, [1, 0.7, 0.7, 1], 0.1, 0.9);
      } else {
        ds.circle(playerPos, ATTACK_RADIUS, [1, 0.7, 0.7, 0.3], 0.01, 0.9);
      }
    }

    // testing fabrik
    fabrikTest[0].pos = bossPos;
    doFabrik(fabrikTest, vec2.fromValues(player.x, player.y), 10);
    drawFabrikChainSegments(fabrikTest, (t) => {
      mat3.scale(t, t, vec2.fromValues(0.1, 0.1));
      ds.img(1, t);
    });

    // draw player
    const playerTrailCount = Math.max(
      Math.hypot(player.x - prevPlayer.x, player.y - prevPlayer.y) * 400,
      2
    );
    for (let i = 0; i < playerTrailCount; i++) {
      const fac = i / (playerTrailCount - 1);
      const posX = player.x * (1 - fac) + prevPlayer.x * fac;
      const posY = player.y * (1 - fac) + prevPlayer.y * fac;
      let playerScaleFac = 0.02 - (attackCooldown / ATTACK_INTERVAL) * 0.01;
      if (attackCooldown == 0) playerScaleFac += Math.sin(t * 0.6) * 0.005;
      ds.circle([player.x, player.y], playerScaleFac, [1, 0.7, 0.7, 1]);
    }

    ds.dispatch();
    requestAnimationFrame(loop);
  };

  loop();
}
