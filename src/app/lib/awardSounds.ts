let popPending = false;
let popPlayed = false;
let installed = false;

function tone(freq: number, ms: number, volume: number, rate = 22050) {
  const count = Math.max(1, Math.floor((rate * ms) / 1000));
  const samples = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    const t = i / rate;
    const env = Math.exp(-t * 16);
    samples[i] = Math.sin(2 * Math.PI * freq * t) * env * volume;
  }
  return samples;
}

function mix(parts: Float32Array[]) {
  const count = parts.reduce((max, part) => Math.max(max, part.length), 0);
  const out = new Float32Array(count);
  for (const part of parts) {
    for (let i = 0; i < part.length; i += 1) out[i] += part[i];
  }
  return out;
}

function wavUri(samples: Float32Array, rate = 22050) {
  const count = samples.length;
  const buffer = new ArrayBuffer(44 + count * 2);
  const view = new DataView(buffer);
  const text = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i));
  };
  text(0, 'RIFF');
  view.setUint32(4, 36 + count * 2, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, count * 2, true);
  let offset = 44;
  for (let i = 0; i < count; i += 1) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return `data:audio/wav;base64,${btoa(binary)}`;
}

const POP = wavUri(mix([
  tone(210, 140, 0.9),
  (() => {
    const count = Math.floor(22050 * 0.12);
    const noise = new Float32Array(count);
    for (let i = 0; i < count; i += 1) {
      const t = i / 22050;
      noise[i] = (Math.random() * 2 - 1) * Math.exp(-t * 38) * 0.85;
    }
    return noise;
  })(),
]));

function playPop() {
  const audio = new Audio(POP);
  audio.volume = 1;
  audio.setAttribute('playsinline', 'true');
  void audio.play().catch(() => undefined);
}

function onFirstTouch() {
  if (!popPending || popPlayed) return;
  popPending = false;
  popPlayed = true;
  playPop();
}

export function prepareAwardSound() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  window.addEventListener('touchstart', onFirstTouch, { capture: true, passive: true });
  window.addEventListener('pointerdown', onFirstTouch, { capture: true, passive: true });
}

export function playPopperBurst() {
  if (popPlayed) return;
  popPending = true;
  prepareAwardSound();
}
