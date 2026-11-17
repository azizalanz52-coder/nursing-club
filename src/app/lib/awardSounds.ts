let ctx: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;
let popPending = false;
let unlockArmed = false;
let played = false;

function audioContext() {
  if (typeof window === 'undefined') return null;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null;
  const Ctx = window.AudioContext
    ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!ctx) ctx = new Ctx();
  return ctx;
}

function noise(context: AudioContext) {
  if (noiseBuffer) return noiseBuffer;
  const length = context.sampleRate * 2;
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < length; i += 1) {
    const white = Math.random() * 2 - 1;
    last = last * 0.98 + white * 0.02;
    data[i] = last * 4;
  }
  noiseBuffer = buffer;
  return buffer;
}

function burstNow(context: AudioContext) {
  const now = context.currentTime;
  crack(context, now, -0.7);
  crack(context, now + 0.09, 0.7);
}

function crack(context: AudioContext, when: number, pan: number) {
  const src = context.createBufferSource();
  src.buffer = noise(context);
  const filter = context.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 900;
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(1.25, when + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.16);
  const panner = context.createStereoPanner();
  panner.pan.value = pan;
  src.connect(filter).connect(gain).connect(panner).connect(context.destination);
  src.start(when);
  src.stop(when + 0.2);

  const thump = context.createOscillator();
  thump.type = 'sine';
  thump.frequency.setValueAtTime(210, when);
  thump.frequency.exponentialRampToValueAtTime(70, when + 0.12);
  const thumpGain = context.createGain();
  thumpGain.gain.setValueAtTime(0.0001, when);
  thumpGain.gain.exponentialRampToValueAtTime(0.95, when + 0.01);
  thumpGain.gain.exponentialRampToValueAtTime(0.0001, when + 0.14);
  thump.connect(thumpGain).connect(panner);
  thump.start(when);
  thump.stop(when + 0.16);
}

function kick() {
  const context = audioContext();
  if (!context || played) return;
  void context.resume();
  if (!popPending) return;
  popPending = false;
  played = true;
  burstNow(context);
}

function armUnlock() {
  if (unlockArmed || typeof window === 'undefined') return;
  unlockArmed = true;
  window.addEventListener('pointerdown', kick, true);
  window.addEventListener('touchstart', kick, true);
  window.addEventListener('keydown', kick, true);
}

export function prepareAwardSound() {
  armUnlock();
}

export function playPopperBurst() {
  if (played) return;
  popPending = true;
  armUnlock();
  if (ctx?.state === 'running') {
    popPending = false;
    played = true;
    burstNow(ctx);
  }
}
