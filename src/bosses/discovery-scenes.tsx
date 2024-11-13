import { mat3, vec2 } from "gl-matrix";
import { DrawSystem, makeDrawSystem } from "../gl/draw";
import React from "react";
import {
  ease,
  easeIn,
  easeOut,
  sampleCatmullRom,
  sampleFullCatmullRom,
  Scene,
  sceneSequence,
  smoothstep,
  tlerp,
} from "../animation";
import { Root } from "react-dom/client";
import {
  SlowText,
  TextSeq,
  TypedInText,
  TypedInTextSequence,
} from "../TypedInText";
import { doFabrik, drawFabrikChainSegments, FabrikPoint } from "../fabrik";
import { range } from "../util";
import {
  ATTACK_RADIUS,
  drawPlayer,
  isPlayerAttacking,
  player,
  runPlayerIter,
} from "../player";
import {
  discoveryBackground,
  displayDiscovery,
  displayDiscoveryHealthBar,
  runDiscoveryIter,
} from "./discovery-boss";
import { playSound } from "../sound";

export function drawDiscoveryBody(ds: DrawSystem, transform: mat3, t: number) {
  const x = mat3.clone(transform);
  mat3.scale(x, x, vec2.fromValues(0.3, 0.3));
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10 + Math.random() * 0.1) * Math.PI * 2;
    const transform = mat3.clone(x);
    mat3.rotate(transform, transform, angle);
    ds.draw(1, 0, transform, [1, 1, 1, 0.1]);
  }
  const s = 0.75;
  ds.draw(
    1,
    3,
    x,
    [-0.25, -0.25, 0.8 + (t * Math.PI * 2) / 2.0, 2.0],
    [-s, -s, s, s]
  );
}

export const discoveryInitDialogue = [
  <>It seems very. Peculiar. Odd. Interesting. Enticing. Strange. Weird.</>,
  <>Perhaps if I...</>,
];

export type DiscoveryState = {
  phase: "init-text";
};

const introText: Scene = {
  loop(root, ds, t, gt, f, done) {
    discoveryBackground(ds, t, true);
    if (f)
      setTimeout(() => {
        root.render(
          <TextSeq
            done={done}
            seq={[<>A thing!</>, <>In our domain!</>, <>In the periphery!</>]}
          ></TextSeq>
        );
      }, 3000);

    const playerSize = Math.sin(t * 10 * Math.PI * 2) * 0.005 + 0.02;
    ds.circle([0, 0], playerSize, [1, 0.7, 0.7, 1]);
  },
};

const introCutscene: Scene = {
  loop(root, ds, t, gt, f, done) {
    discoveryBackground(ds, t, true);
    if (f) {
      root.render(<></>);
    }

    const playerSize = Math.sin(gt * 10 * Math.PI * 2) * 0.005 + 0.02;
    ds.circle([0, 0], playerSize, [1, 0.7, 0.7, 1]);

    const bossT = mat3.create();
    mat3.translate(
      bossT,
      bossT,
      vec2.fromValues(0, ease(easeOut, t, 3, 8, 1.5, 0.5))
    );

    drawDiscoveryBody(ds, bossT, gt);

    if (f) {
      setTimeout(() => {
        root.render(
          <TextSeq
            done={done}
            seq={[
              <>
                It seems very. Peculiar. Odd. Interesting. Enticing. Strange.
                Weird.
              </>,
              <>Perhaps if I...</>,
            ]}
          ></TextSeq>
        );
      }, 8000);
    }
  },
};

let discoveryArm: FabrikPoint[] = range(10).map((i) => ({
  length: 0.1,
  pos: vec2.fromValues(0, 0.5 + 0.1 * (i % 2)),
}));
let playerPieces: { pos: vec2; vel: vec2 }[] = range(50).map((i) => ({
  pos: [0, 0],
  vel: [0, 0],
}));
let playerExploded = false;
function drawExplodedPlayer(ds: DrawSystem) {
  for (const pp of playerPieces) {
    const t = mat3.create();
    ds.circle(pp.pos, 0.004 + Math.random() * 0.003, [1, 0.7, 0.7, 1]);
  }
}
function drawDiscoveryArm(ds: DrawSystem) {
  for (const { length, pos } of discoveryArm.slice(1, -1)) {
    vec2.add(pos, pos, [
      Math.random() * 0.01 - 0.005,
      Math.random() * 0.01 - 0.005,
    ]);
  }
  drawFabrikChainSegments(discoveryArm, (t) => {
    mat3.scale(t, t, [0.1, 0.1]);
    ds.img(1, t);
  });
}
const attackCutscene: Scene = {
  loop(root, ds, t, gt, f, done) {
    discoveryBackground(ds, t, true);
    if (f) {
      root.render(<></>);
    }

    const bossT = mat3.create();
    mat3.translate(bossT, bossT, vec2.fromValues(0, 0.5));
    drawDiscoveryBody(ds, bossT, gt);

    if (t < 4) {
      const playerSize = Math.sin(gt * 10 * Math.PI * 2) * 0.005 + 0.02;
      ds.circle([0, 0], playerSize, [1, 0.7, 0.7, 1]);
    }

    if (t > 0 && t < 4)
      doFabrik(
        discoveryArm,
        sampleFullCatmullRom(
          [0, 0.5],
          [0.5, 0.6],
          [0.3, -0.2],
          [0.0, 0.0],
          ease(easeIn, t, 0, 4, 0, 1)
        ),
        10
      );
    if (t > 4 && t < 5)
      doFabrik(
        discoveryArm,
        sampleFullCatmullRom(
          [0, 0.0],
          [0.3, 0.1],
          [0.4, 0.4],
          [0.0, 0.5],
          ease(smoothstep, t, 4, 5, 0, 1)
        ),
        10
      );
    if (t > 5) {
      for (const da of discoveryArm) {
        vec2.sub(da.pos, da.pos, [0, 0.5]);
        vec2.mul(da.pos, da.pos, [0.9, 0.9]);
        vec2.add(da.pos, da.pos, [0, 0.5]);
      }
    }
    drawDiscoveryArm(ds);

    if (t > 4) {
      if (!playerExploded) {
        playerExploded = true;
        for (const pp of playerPieces) {
          pp.vel = [Math.random() * 0.2 - 0.1, Math.random() * 0.2 - 0.1];
        }
      }

      drawExplodedPlayer(ds);

      for (const pp of playerPieces) {
        vec2.add(pp.pos, pp.pos, pp.vel);
        vec2.mul(pp.vel, pp.vel, [0.9, 0.9]);
      }
    }

    if (t > 6) {
      done();
    }
  },
};

const attack2Cutscene: Scene = {
  loop(root, ds, t, gt, first, done) {
    discoveryBackground(ds, t, true);
    const bossT = mat3.create();
    mat3.translate(bossT, bossT, vec2.fromValues(0, 0.5));
    drawDiscoveryBody(ds, bossT, gt);
    drawExplodedPlayer(ds);

    if (first) {
      setTimeout(() => {
        root.render(
          <TextSeq
            done={done}
            seq={[
              <>Oh...</>,
              <>I appear to have.</>,
              <>Exploded it!</>,
              <>That is rather unfortunate.</>,
              <>
                I was quite excited to sample the flesh of this strange,
                nondescript, quivering blob.
              </>,
            ]}
          ></TextSeq>
        );
      }, 0);
    }
  },
};

const playerRegenerateCutscene: Scene = {
  loop(root, ds, t, gt, first, done) {
    discoveryBackground(ds, t, true);
    if (first) {
      root.render(<></>);

      setTimeout(() => {
        root.render(
          <TextSeq
            done={done}
            seq={[
              <>...</>,
              <>How utterly scrumptuous!</>,
              <>
                Most of this type of creature disappear much akin to a transient
                froth of bubbles upon being prodded with my appendages!
              </>,
              <>But this one...</>,
              <>
                Perhaps it is more similar to the bubbles of oil dancing atop a
                bowl of water, its recoalescence inevitable following its
                dispersal into an unstable emulsion!
              </>,
              <>It is.</>,
              <>Rather.</>,
              <>
                Strange? Unusual? <em>Concerning?</em>
              </>,
            ]}
          ></TextSeq>
        );
      }, 5000);
    }

    for (const pp of playerPieces) {
      vec2.add(pp.pos, pp.pos, pp.vel);
      vec2.mul(pp.vel, pp.vel, [0.9, 0.9]);
    }

    if (t > 1) {
      for (const pp of playerPieces) {
        vec2.mul(pp.pos, pp.pos, [0.97, 0.97]);
      }
    }

    if (t > 3) {
      const playerSize = Math.sin(gt * 10 * Math.PI * 2) * 0.005 + 0.02;
      ds.circle([0, 0], playerSize, [1, 0.7, 0.7, 1]);
    }

    const bossT = mat3.create();
    mat3.translate(bossT, bossT, vec2.fromValues(0, 0.5));
    drawDiscoveryBody(ds, bossT, gt);
    drawExplodedPlayer(ds);
  },
};

let playerHasntMovedYet = true;
let showWASDTutorial = true;
let showAttackTutorial = false;
const playerMoveCutscene: Scene = {
  loop(root, ds, t, gt, first, done) {
    discoveryBackground(ds, t, true);
    if (first) {
      root.render(<></>);
    }

    const bossT = mat3.create();
    mat3.translate(bossT, bossT, vec2.fromValues(0, 0.5));
    drawDiscoveryBody(ds, bossT, gt);

    const tutorialBrightness = Math.sin(gt * 10) * 0.3 + 0.7;
    if (showWASDTutorial) {
      const wasdTutorialScale = mat3.create();
      mat3.translate(wasdTutorialScale, wasdTutorialScale, [0.0, -0.2]);
      mat3.scale(wasdTutorialScale, wasdTutorialScale, [0.2, 0.2]);
      ds.img(2, wasdTutorialScale, [1, 1, 1, tutorialBrightness]);
    }
    if (showAttackTutorial) {
      const attackTutorialScale = mat3.create();
      mat3.translate(attackTutorialScale, attackTutorialScale, [0.0, -0.2]);
      mat3.scale(attackTutorialScale, attackTutorialScale, [0.2, 0.2]);
      ds.img(3, attackTutorialScale, [1, 1, 1, tutorialBrightness]);
      const arrowTransform = mat3.create();
      mat3.translate(arrowTransform, arrowTransform, [0.0, 0.1]);
      mat3.scale(arrowTransform, arrowTransform, [0.1, 0.1]);
      mat3.rotate(arrowTransform, arrowTransform, Math.PI / 2);
      ds.img(4, arrowTransform, [1, 1, 1, tutorialBrightness]);
    }

    runPlayerIter();
    drawPlayer(ds, gt);

    if (
      isPlayerAttacking() &&
      showAttackTutorial &&
      vec2.dist(player.pos, [0.0, 0.5]) < ATTACK_RADIUS + 0.3
    ) {
      playSound("discovery-hurt.wav", Math.random() * 0.1 + 0.2);
      done();
    }

    if ((player.pos[0] !== 0 || player.pos[1] !== 0) && playerHasntMovedYet) {
      playerHasntMovedYet = false;
      root.render(<></>);
      setTimeout(() => {
        showWASDTutorial = false;
      }, 1500);
      setTimeout(() => {
        root.render(
          <TextSeq
            done={() => {
              root.render(<></>);
              showAttackTutorial = true;
            }}
            seq={[
              <>...</>,
              <>It moves!</>,
              <>Even after I destroyed it with my appendage!</>,
            ]}
          ></TextSeq>
        );
      }, 3000);
    }
  },
};

const playerAttackCutscene: Scene = {
  loop(root, ds, t, gt, first, done) {
    discoveryBackground(ds, t, true);

    const bossT = mat3.create();
    mat3.translate(
      bossT,
      bossT,
      vec2.fromValues(
        0 + Math.random() * 0.01 - 0.005,
        0.5 + Math.random() * 0.01 - 0.005
      )
    );
    drawDiscoveryBody(ds, bossT, 0.1);

    runPlayerIter();
    drawPlayer(ds, gt);

    if (first) {
      root.render(<></>);

      setTimeout(() => {
        root.render(
          <TextSeq
            done={done}
            seq={[
              <>Oh...</>,
              <>It... intersected me.</>,
              <>It was rather...</>,
              <>
                Well, it entered my corpuscule and intermixed with my organelles
                and I felt it coil and twist and tear into a system of roots
                plunging its needle-like tips into every facet of every caked on
                layer of my tender flesh and
              </>,
              <>Hm.</>,
              <>That is.</>,
              <>Quite.</>,
              <>Questionable. Unsettling.</>,
              <>Enticing.</>,
              <SlowText delay={300}>
                <em>Dangerous. . .</em>
              </SlowText>,
              <SlowText delay={200}>
                I cannot allow such a being to live.
              </SlowText>,
            ]}
          ></TextSeq>
        );
      });
    }
  },
};

const bossPhase: Scene = {
  loop(root, ds, t, gt, first, done) {
    if (first) root.render(<></>);
    discoveryBackground(ds, t);

    runDiscoveryIter(gt, first);
    displayDiscovery(ds, gt);

    runPlayerIter();
    drawPlayer(ds, gt);
    displayDiscoveryHealthBar(ds);
  },
};

export const discoveryScenes = sceneSequence([
  // introText,
  // introCutscene,
  // attackCutscene,
  // attack2Cutscene,
  // playerRegenerateCutscene,
  // playerMoveCutscene,
  playerAttackCutscene,
  bossPhase,
  {},
]);
