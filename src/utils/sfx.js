/*
 * Synthesised sound effects (Web Audio): no audio files to download.
 * Safe to call anywhere: it's a no-op without a browser AudioContext (e.g. Node tests)
 * or while muted. The context is created lazily on the first sound, which always
 * follows a tap, so browsers allow it to start.
 */

let ctx = null;
let master = null;
let enabled = true;

export const setSfxEnabled = (on) => { enabled = on; };

const getCtx = () => {
    if (typeof window === 'undefined' || !(window.AudioContext || window.webkitAudioContext)) return null;
    if (!ctx) {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        master = ctx.createGain();
        master.gain.value = 0.35;
        master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
}

// One enveloped oscillator note.
const tone = (ac, { freq, to, type = 'sine', at = 0, dur = 0.12, gain = 0.5 }) => {
    const t = ac.currentTime + at;
    const osc = ac.createOscillator();
    const amp = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(amp).connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
}

// Short filtered noise burst (shuffle whoosh).
const noise = (ac, { at = 0, dur = 0.35, gain = 0.4, from = 400, to = 2400 }) => {
    const t = ac.currentTime + at;
    const buffer = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource();
    const filter = ac.createBiquadFilter();
    const amp = ac.createGain();
    src.buffer = buffer;
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(from, t);
    filter.frequency.exponentialRampToValueAtTime(to, t + dur);
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(gain, t + dur * 0.3);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(amp).connect(master);
    src.start(t);
}

const SOUNDS = {
    pick: (ac) => tone(ac, { freq: 520, to: 880, type: 'triangle', dur: 0.09, gain: 0.35 }),
    match: (ac) => [660, 830, 990].forEach((f, i) => tone(ac, { freq: f, type: 'triangle', at: i * 0.05, dur: 0.16, gain: 0.3 })),
    win: (ac) => [523, 659, 784, 1046].forEach((f, i) => tone(ac, { freq: f, type: 'triangle', at: i * 0.11, dur: i === 3 ? 0.45 : 0.18, gain: 0.35 })),
    lose: (ac) => [392, 330, 262].forEach((f, i) => tone(ac, { freq: f, type: 'sawtooth', at: i * 0.16, dur: 0.22, gain: 0.12 })),
    tick: (ac) => tone(ac, { freq: 1200, type: 'square', dur: 0.04, gain: 0.08 }),
    undo: (ac) => tone(ac, { freq: 880, to: 440, type: 'triangle', dur: 0.16, gain: 0.3 }),
    magnet: (ac) => tone(ac, { freq: 200, to: 900, type: 'sine', dur: 0.3, gain: 0.35 }),
    shuffle: (ac) => noise(ac, {}),
    freeze: (ac) => [1568, 2093, 2637].forEach((f, i) => tone(ac, { freq: f, type: 'sine', at: i * 0.06, dur: 0.3, gain: 0.15 })),
    refused: (ac) => tone(ac, { freq: 180, type: 'square', dur: 0.08, gain: 0.1 }),
};

export const playSfx = (name) => {
    if (!enabled) return;
    const ac = getCtx();
    if (!ac || !SOUNDS[name]) return;
    try { SOUNDS[name](ac); } catch { /* audio must never break the game */ }
}
