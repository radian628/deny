glMatrix.setMatrixArrayType(Array);
import React from "react";
import { testGL } from "./test-gl";
import { createRoot } from "react-dom/client";
import { TypedInText, TypedInTextSequence } from "./TypedInText";
import { game } from "./game";
import { glMatrix } from "gl-matrix";
import { playSound } from "./sound";

// testGL();

// const root = createRoot(document.getElementById("root")!);
// root.render(<Game></Game>);
// root.render(
//   // <TypedInText>
//   //   Hi! Hello! Who are <strong>you???</strong> Would you like to hear more about
//   //   your car's extended warranty?
//   // </TypedInText>
//   <TypedInTextSequence seq={discoveryInitDialogue}></TypedInTextSequence>
// );

document.onclick = () => {
  document.onclick = null;
  // (async () => {
  //   const ac = new AudioContext();
  //   const file = await fetch("ominous.wav");
  //   const buf = await file.arrayBuffer();
  //   const audio = await ac.decodeAudioData(buf);
  //   const track = new AudioBufferSourceNode(ac, {
  //     buffer: audio,
  //   });
  //   track.connect(ac.destination);
  //   track.start();
  // })();

  game();
};
