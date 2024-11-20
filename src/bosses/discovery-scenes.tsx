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
  runPlayerIter,
} from "../ecs/player";
import {
  discoveryBackground,
  DiscoveryBoss,
  drawDiscoveryBody,
} from "./discovery-boss";
import { playSound } from "../sound";
import { Game } from "../ecs/game";
import {
  allDone,
  drawOnly,
  drawWithLayer,
  Entity,
  multiTimer,
  sequence,
  text,
  timer,
} from "../ecs/entity";

export const discoveryInitDialogue = [
  <>It seems very. Peculiar. Odd. Interesting. Enticing. Strange. Weird.</>,
  <>Perhaps if I...</>,
];

export type DiscoveryState = {
  phase: "init-text";
};

function drawPlayerAtOrigin(game: Game) {
  const playerSize = Math.sin(game.t * 10 * Math.PI * 2) * 0.005 + 0.02;
  game.ds.circle([0, 0], playerSize, [1, 0.7, 0.7, 1]);
}

export const introText: Entity = multiTimer(function* (game: Game) {
  yield allDone(
    [text([<>A thing!</>, <>In our domain!</>, <>In the periphery!</>])],
    [
      drawOnly((game) => {
        discoveryBackground(game, true);
        drawPlayerAtOrigin(game);
      }),
    ]
  );

  let start = game.t;
  yield allDone(
    [
      multiTimer(function* (game: Game) {
        yield timer(8);
        yield text([
          <>
            It seems very. Peculiar. Odd. Interesting. Enticing. Strange. Weird.
          </>,
          <>Perhaps if I...</>,
        ]);
      }),
    ],
    [
      drawOnly((game) => {
        discoveryBackground(game, true);

        const lt = game.t - start;
        const bossT = mat3.create();
        mat3.translate(
          bossT,
          bossT,
          vec2.fromValues(0, ease(easeOut, lt, 3, 8, 1.5, 0.5))
        );
        drawDiscoveryBody(bossT, game);

        drawPlayerAtOrigin(game);
      }),
    ]
  );

  const playerPieces = range(50).map((i) => ({
    pos: [0, 0] as vec2,
    vel: [0, 0] as vec2,
  }));
  const discoveryArm = range(10).map((i) => ({
    length: 0.1,
    pos: vec2.fromValues(0, 0.5 + 0.1 * (i % 2)),
  }));
  start = game.t;
  let playerExploded = false;
  function drawExplodedPlayer() {
    for (const pp of playerPieces) {
      const t = mat3.create();
      game.ds.circle(pp.pos, 0.004 + Math.random() * 0.003, [1, 0.7, 0.7, 1]);
    }
  }

  yield allDone(
    [
      multiTimer(function* (game) {
        yield timer(6);
        yield text([
          <>Oh...</>,
          <>I appear to have.</>,
          <>Exploded it!</>,
          <>That is rather unfortunate.</>,
          <>
            I was quite excited to sample the flesh of this strange,
            nondescript, quivering blob.
          </>,
        ]);
      }),
    ],
    [
      drawOnly((game) => {
        const t = game.t - start;
        const gt = game.t;

        discoveryBackground(game, true);
        const bossT = mat3.create();
        mat3.translate(bossT, bossT, vec2.fromValues(0, 0.5));
        drawDiscoveryBody(bossT, game);

        if (t < 4) {
          drawPlayerAtOrigin(game);
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

        for (const { length, pos } of discoveryArm.slice(1, -1)) {
          vec2.add(pos, pos, [
            Math.random() * 0.01 - 0.005,
            Math.random() * 0.01 - 0.005,
          ]);
        }

        drawFabrikChainSegments(discoveryArm, (t) => {
          mat3.scale(t, t, [0.1, 0.1]);
          game.ds.img(1, t);
        });

        drawExplodedPlayer();

        if (t > 4) {
          if (!playerExploded) {
            playerExploded = true;
            for (const pp of playerPieces) {
              pp.vel = [Math.random() * 0.2 - 0.1, Math.random() * 0.2 - 0.1];
            }
          }

          for (const pp of playerPieces) {
            vec2.add(pp.pos, pp.pos, pp.vel);
            vec2.mul(pp.vel, pp.vel, [0.9, 0.9]);
          }
        }
      }),
    ]
  );

  start = game.t;
  yield allDone(
    [
      multiTimer(function* () {
        yield timer(5);
        yield text([
          <>...</>,
          <>How utterly scrumptuous!</>,
          <>
            Most of this type of creature disappear much akin to a transient
            froth of bubbles upon being prodded with my appendages!
          </>,
          <>But this one...</>,
          <>
            Perhaps it is more similar to the bubbles of oil dancing atop a bowl
            of water, its recoalescence inevitable following its dispersal into
            an unstable emulsion!
          </>,
          <>It is.</>,
          <>Rather.</>,
          <>
            Strange? Unusual? <em>Concerning?</em>
          </>,
        ]);
      }),
    ],
    [
      drawOnly((game) => {
        discoveryBackground(game, true);

        const t = game.t - start;
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
          const playerSize = Math.sin(game.t * 10 * Math.PI * 2) * 0.005 + 0.02;
          game.ds.circle([0, 0], playerSize, [1, 0.7, 0.7, 1]);
        }

        const bossT = mat3.create();
        mat3.translate(bossT, bossT, vec2.fromValues(0, 0.5));
        drawDiscoveryBody(bossT, game);
        drawExplodedPlayer();
      }),
    ]
  );
});

const playerMoveCutscene = {
  isDead: false,
  start: 0,
  playerHasntMovedYet: true,
  showWASDTutorial: true,
  showAttackTutorial: false,
  init(game: Game) {},
  iter(game: Game) {
    runPlayerIter(game);
  },
  draw(game: Game) {
    discoveryBackground(game, true);

    const bossT = mat3.create();
    mat3.translate(bossT, bossT, vec2.fromValues(0, 0.5));
    drawDiscoveryBody(bossT, game);

    const tutorialBrightness = Math.sin(game.t * 10) * 0.3 + 0.7;
    if (this.showWASDTutorial) {
      const wasdTutorialScale = mat3.create();
      mat3.translate(wasdTutorialScale, wasdTutorialScale, [0.0, -0.2]);
      mat3.scale(wasdTutorialScale, wasdTutorialScale, [0.2, 0.2]);
      game.ds.img(2, wasdTutorialScale, [1, 1, 1, tutorialBrightness]);
    }
    if (this.showAttackTutorial) {
      const attackTutorialScale = mat3.create();
      mat3.translate(attackTutorialScale, attackTutorialScale, [0.0, -0.2]);
      mat3.scale(attackTutorialScale, attackTutorialScale, [0.2, 0.2]);
      game.ds.img(3, attackTutorialScale, [1, 1, 1, tutorialBrightness]);
      const arrowTransform = mat3.create();
      mat3.translate(arrowTransform, arrowTransform, [0.0, 0.1]);
      mat3.scale(arrowTransform, arrowTransform, [0.1, 0.1]);
      mat3.rotate(arrowTransform, arrowTransform, Math.PI / 2);
      game.ds.img(4, arrowTransform, [1, 1, 1, tutorialBrightness]);
    }

    drawPlayer(game);

    if (
      isPlayerAttacking(game) &&
      this.showAttackTutorial &&
      vec2.dist(game.player.pos, [0.0, 0.5]) < ATTACK_RADIUS + 0.3
    ) {
      playSound("discovery-hurt.wav", Math.random() * 0.1 + 0.2);
      this.isDead = true;
    }

    if (
      (game.player.pos[0] !== 0 || game.player.pos[1] !== 0) &&
      this.playerHasntMovedYet
    ) {
      this.playerHasntMovedYet = false;
      game.addEntity(
        timer(1.5, () => {
          this.showWASDTutorial = false;
        })
      );
      game.addEntity(
        timer(3.0, () => {
          game.addEntity(
            text(
              [
                <>...</>,
                <>It moves!</>,
                <>Even after I destroyed it with my appendage!</>,
              ],
              () => {
                this.showAttackTutorial = true;
              }
            )
          );
        })
      );
    }
  },
};

const playerAttackCutscene = {
  isDead: false,
  start: 0,
  init(game: Game) {
    game.addEntity(
      text(
        [
          <>Oh...</>,
          <>It... intersected me.</>,
          <>It was rather...</>,
          <>
            Well, it entered my corpuscule and intermixed with my organelles and
            I felt it coil and twist and tear into a system of roots plunging
            its needle-like tips into every facet of every caked on layer of my
            tender flesh and
          </>,
          <>Hm.</>,
          <>That is.</>,
          <>Quite.</>,
          <>Questionable. Unsettling.</>,
          <>Enticing.</>,
          <SlowText delay={300}>
            <em>Dangerous. . .</em>
          </SlowText>,
          <SlowText delay={200}>I cannot allow such a being to live.</SlowText>,
        ],
        () => (this.isDead = true)
      )
    );
  },
  iter(game: Game) {
    runPlayerIter(game);
  },
  draw(game: Game) {
    discoveryBackground(game, true);

    const bossT = mat3.create();
    mat3.translate(
      bossT,
      bossT,
      vec2.fromValues(
        0 + Math.random() * 0.01 - 0.005,
        0.5 + Math.random() * 0.01 - 0.005
      )
    );
    drawDiscoveryBody(bossT, game);

    drawPlayer(game);
  },
};

const bossPhase = {
  isDead: false,
  init(game: Game) {
    const boss = game.addEntity(new DiscoveryBoss());
    game.onKill(boss, () => (this.isDead = true));
  },
  iter(game: Game) {
    runPlayerIter(game);
    game.addEntity(
      drawWithLayer(-1, (game) => {
        discoveryBackground(game);
      })
    );
  },
  draw(game: Game) {
    drawPlayer(game);
  },
};

export const discoveryScenes = sequence([
  introText,
  playerMoveCutscene,
  playerAttackCutscene,
  bossPhase,
]);
