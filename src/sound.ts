const ac = new AudioContext();

const soundCache = new Map<string, AudioBuffer>();

export async function fetchAudio(url: string) {
  let audio = soundCache.get(url);
  if (!audio) {
    const file = await fetch(url);
    const buf = await file.arrayBuffer();
    audio = await ac.decodeAudioData(buf);
  }
  return audio;
}

export async function createSoundWithPitchAndGain(
  audio: AudioBuffer,
  pitch?: number,
  gain?: number
) {
  const track = new AudioBufferSourceNode(ac, {
    buffer: audio,
    playbackRate: pitch,
  });
  const gainNode = new GainNode(ac, {
    gain: gain ?? 1,
  });
  track.connect(gainNode);
  gainNode.connect(ac.destination);
  return track;
}

export async function playSound(url: string, pitch?: number, gain?: number) {
  const track = await createSoundWithPitchAndGain(
    await fetchAudio(url),
    pitch,
    gain
  );
  track.start();
  return track;
}

export async function loopSound(url: string, pitch?: number, gain?: number) {
  const audio = await fetchAudio(url);
  const track = await createSoundWithPitchAndGain(audio, pitch, gain);
  track.loop = true;
  track.start();
  return track;
}

export interface MutuallyExlusiveSound {
  play(t: string, loop: boolean): Promise<void>;
  stop(): void;
}

export function mutuallyExclusiveSound(): MutuallyExlusiveSound {
  let track: AudioBufferSourceNode;
  return {
    async play(url: string, loop: boolean) {
      track?.stop();
      track = loop ? await loopSound(url) : await playSound(url);
    },
    stop() {
      track?.stop();
    },
  };
}
