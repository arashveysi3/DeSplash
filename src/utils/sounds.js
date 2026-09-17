// Ghost sounds — lightweight WebAudio synth, no external assets
// Respects localStorage 'gs_sound' == 'off' to mute

let ctx = null;

function isEnabled() {
  try {
    if (localStorage.getItem('gs_sound') === 'off') return false;
  } catch {}
  // also respect prefers-reduced-motion? not needed
  return true;
}

export function setSoundEnabled(on) {
  try { localStorage.setItem('gs_sound', on ? 'on' : 'off'); } catch {}
}

export function isSoundEnabled() { return isEnabled(); }

function getCtx() {
  if (!isEnabled()) return null;
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === 'suspended') ctx.resume().catch(()=>{});
  return ctx;
}

function tone({ freq, duration = 0.12, type = 'sine', gain = 0.14, attack = 0.01, slideTo, when = 0 }) {
  const c = getCtx();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + duration);
  o.connect(g);
  g.connect(c.destination);
  const t0 = c.currentTime + when;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  o.start(t0);
  o.stop(t0 + duration + 0.02);
}

function clickTone(freq = 800, gain = 0.12) {
  tone({ freq, duration: 0.08, type: 'sine', gain, attack: 0.005, decay: 0.08 });
}

// Public API
export function playCorrect() {
  // bright ding dong — C6 -> E6
  tone({ freq: 1046, duration: 0.12, gain: 0.13 });
  tone({ freq: 1318, duration: 0.14, gain: 0.13, when: 0.09 });
  // subtle pop
  clickTone(1800, 0.04);
}

export function playIncorrect() {
  // low buzz — detuned saw
  const c = getCtx();
  if (!c) return;
  tone({ freq: 180, duration: 0.22, type: 'sawtooth', gain: 0.09 });
  tone({ freq: 140, duration: 0.28, type: 'sawtooth', gain: 0.07, when: 0.06 });
  // dissonant blip
  tone({ freq: 90, duration: 0.18, type: 'triangle', gain: 0.08, when: 0.12 });
}

export function playFlip() {
  clickTone(900, 0.08);
  tone({ freq: 600, duration: 0.06, type: 'sine', gain: 0.06, when: 0.03 });
}

export function playTap() {
  clickTone(700, 0.07);
}

export function playXp() {
  tone({ freq: 1200, duration: 0.09, gain: 0.11, type: 'sine' });
  tone({ freq: 1600, duration: 0.10, gain: 0.09, when: 0.07 });
}

export function playStreak() {
  [800, 1000, 1200, 1500].forEach((f, i) => tone({ freq: f, duration: 0.11, gain: 0.09, when: i * 0.07 }));
}

export function playPackComplete() {
  // fanfare ascending
  const notes = [523, 659, 783, 1046];
  notes.forEach((f, i) => tone({ freq: f, duration: 0.18, gain: 0.11 - i * 0.01, when: i * 0.11, type: 'sine' }));
  tone({ freq: 1318, duration: 0.32, gain: 0.13, when: 0.48, type: 'triangle' });
}

export function playQuizComplete() {
  playPackComplete();
  setTimeout(() => tone({ freq: 1568, duration: 0.4, gain: 0.12, type: 'sine', when: 0 }), 520);
}

export function playGameWin() {
  // game win — extra sparkle
  playPackComplete();
  [1800, 2200].forEach((f, i) => tone({ freq: f, duration: 0.12, gain: 0.07, when: 0.55 + i * 0.06, type: 'sine' }));
}

export function playGameOver() {
  // sad descending
  [600, 450, 320, 220].forEach((f, i) => tone({ freq: f, duration: 0.16, gain: 0.08, when: i * 0.12, type: 'triangle' }));
}

export function playMatchPair() {
  tone({ freq: 900, duration: 0.10, gain: 0.10 });
  tone({ freq: 1100, duration: 0.10, gain: 0.08, when: 0.08 });
}

export function playCountdownTick() {
  clickTone(1000, 0.05);
}

// helper to prime context on first user gesture (mobile autoplay policy)
export function primeAudio() {
  const c = getCtx();
  if (c && c.state === 'suspended') c.resume().catch(()=>{});
}

// auto prime on first interaction
if (typeof window !== 'undefined') {
  const once = () => { primeAudio(); window.removeEventListener('pointerdown', once); window.removeEventListener('keydown', once); };
  window.addEventListener('pointerdown', once, { once: true });
  window.addEventListener('keydown', once, { once: true });
}
