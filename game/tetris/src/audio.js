// 简易 WebAudio 音效（无外部资源）
let ctx = null;

function ensureCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx = new AC();
  }
  if (ctx && ctx.state === "suspended") ctx.resume();
  return ctx;
}

/** 播放一个短促音 */
function beep(freq, dur = 0.08, type = "square", gain = 0.12) {
  const c = ensureCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  osc.connect(g).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + dur);
}

function sweep(from, to, dur = 0.25, gain = 0.15) {
  const c = ensureCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(from, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(to, c.currentTime + dur);
  g.gain.setValueAtTime(gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  osc.connect(g).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + dur);
}

export const sfx = {
  move:  () => beep(220, 0.04, "square", 0.06),
  rotate:() => beep(340, 0.06, "square", 0.08),
  lock:  () => beep(140, 0.1, "triangle", 0.14),
  clear: () => sweep(520, 1040, 0.28, 0.12),
  hard:  () => sweep(300, 90, 0.12, 0.12),
  over:  () => sweep(400, 60, 0.7, 0.16),
  start: () => { beep(440, 0.09); setTimeout(() => beep(660, 0.12), 90); },
};
