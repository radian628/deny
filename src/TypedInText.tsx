import React, { createElement, useEffect, useRef, useState } from "react";
import { createRoot, Root } from "react-dom/client";

export type TypedInTextChild = (string | JSX.Element)[] | JSX.Element | string;

export function useDialogueNoise() {
  const [noise, setNoise] = useState<AudioBuffer>();

  useEffect(() => {
    if (noise) return;
    (async () => {
      const ac = new AudioContext();
      const file = await fetch("dialogue-noise.wav");
      const buf = await file.arrayBuffer();
      const audio = await ac.decodeAudioData(buf);
      setNoise(audio);
    })();
  }, []);

  return noise;
}

export function TypedInText(props: {
  children: TypedInTextChild;
  done?: () => void;
  forceDone?: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  const [charsLoaded, setCharsLoaded] = useState(0);

  const allTextRef = useRef<string>("");
  const delaysRef = useRef<number[]>([]);

  const rootRef = useRef<Root | undefined>();

  const dialogueNoise = useDialogueNoise();

  useEffect(() => {
    setCharsLoaded(0);
    allTextRef.current = "";
    delaysRef.current = [];

    const elem = ref.current;
    if (!elem) return;

    elem.style.display = "none";

    // kill me
    setTimeout(() => {
      const oldRoot = rootRef.current;
      if (oldRoot) oldRoot.unmount();
      rootRef.current = createRoot(elem);
      rootRef.current.render(props.children);
      elem.style.display = "none";
    });
  }, [props.children]);

  useEffect(() => {
    if (props.forceDone) return;
    const currentChar = allTextRef.current[charsLoaded - 1] ?? "";
    setTimeout(
      () => {
        if (
          charsLoaded == allTextRef.current.length &&
          allTextRef.current.length > 0
        ) {
          props.done?.();
        } else {
          setCharsLoaded((l) => l + 1);

          if (!dialogueNoise) return;
          const ac = new AudioContext();
          const track = new AudioBufferSourceNode(ac, {
            buffer: dialogueNoise,
            playbackRate: Math.random() * 0.75 + 0.5,
          });
          const gain = ac.createGain();
          gain.gain.setValueAtTime(0.2, 0);
          track.connect(gain);
          gain.connect(ac.destination);
          track.start();
        }
      },
      charsLoaded === 0
        ? 100
        : currentChar.match(/\.|\?|\!/g)
        ? 250
        : currentChar.match(/\,/g)
        ? 100
        : delaysRef.current[charsLoaded - 1] ?? 20
    );
  }, [charsLoaded, props.forceDone]);

  useEffect(() => {
    const elem = ref.current;
    if (!elem) return;

    let chars = charsLoaded;

    let walker = document.createTreeWalker(elem, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;

      // @ts-expect-error
      if (node._text === undefined) {
        const text = node.textContent ?? "";
        const isSlow = nodeIsSlow(node);
        allTextRef.current += text;
        // @ts-expect-error
        node._text = text;
        for (let i = 0; i < text.length; i++) {
          delaysRef.current.push(isSlow ? Number(isSlow.dataset.delay) : 20);
        }
      }
    }

    walker = document.createTreeWalker(elem, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      // @ts-expect-error
      const text: string = node._text;

      if (chars <= 0 && !props.forceDone) {
        node.textContent = "";
      } else if (chars < text.length && !props.forceDone) {
        node.textContent = text.slice(0, chars);
      } else {
        node.textContent = text;
      }

      chars -= text.length;
    }

    elem.style.display = "";
  }, [charsLoaded, props.forceDone, props.children]);

  return <div ref={ref}></div>;
}

function nodeIsSlow(node: Node | null) {
  while (node) {
    node = node.parentElement;
    if (node instanceof HTMLElement && node.dataset.slow) {
      return node;
    }
  }
  return false;
}

export function SlowText(props: { delay: number; children: TypedInTextChild }) {
  return (
    <span data-slow="true" data-delay={props.delay}>
      {props.children}
    </span>
  );
}

export function TypedInTextSequence(props: {
  seq: TypedInTextChild[];
  done?: () => void;
}) {
  const [seqIndex, setSeqIndex] = useState(0);

  const [currentDone, setCurrentDone] = useState(false);

  const [completelyDone, setCompletelyDone] = useState(false);

  useEffect(() => {
    if (completelyDone) return;
    const listener = (e: KeyboardEvent) => {
      if (e.key.toUpperCase() === "ENTER") {
        if (currentDone) {
          if (seqIndex == props.seq.length - 1) {
            props.done?.();
            setCompletelyDone(true);
          } else if (seqIndex < props.seq.length - 1) {
            setCurrentDone(false);
            setSeqIndex(seqIndex + 1);
          }
        } else {
          setCurrentDone(true);
        }
      }
    };
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, [currentDone, seqIndex, completelyDone]);

  return (
    <div className="textbox">
      <TypedInText forceDone={currentDone} done={() => setCurrentDone(true)}>
        {props.seq[seqIndex]}
      </TypedInText>
      {currentDone && (
        <div className="textbox-continue">Press ENTER to continue.</div>
      )}
    </div>
  );
}

export function TextSeq(props: { seq: TypedInTextChild[]; done: () => void }) {
  return (
    <div className="game-text">
      <TypedInTextSequence
        done={props.done}
        seq={props.seq}
      ></TypedInTextSequence>
    </div>
  );
}
