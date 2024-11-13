const ac = new AudioContext();

const soundCache = new Map<string, AudioBuffer>();

export async function playSound(url: string, pitch?: number, gain?: number) {
  let audio = soundCache.get(url);
  if (!audio) {
    const file = await fetch(url);
    const buf = await file.arrayBuffer();
    audio = await ac.decodeAudioData(buf);
  }
  const track = new AudioBufferSourceNode(ac, {
    buffer: audio,
    playbackRate: pitch,
  });
  const gainNode = new GainNode(ac, {
    gain: gain ?? 1,
  });
  track.connect(gainNode);
  gainNode.connect(ac.destination);

  track.start();
}
