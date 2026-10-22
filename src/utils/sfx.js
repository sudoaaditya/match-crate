/*
 * Synthesised sound effects (Web Audio): no audio files to download. Each also buzzes
 * (navigator.vibrate) where supported; the sound toggle mutes both.
 * Safe to call anywhere: it's a no-op without a browser AudioContext (e.g. Node tests)
 * or while muted. The context is created lazily on the first sound, which always
 * follows a tap, so browsers allow it to start.
 */

let ctx = null;
let master = null;
let enabled = true;

export const setSfxEnabled = (on) => {
    enabled = on;
    if (!on) stopMusic();
};

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

// One enveloped oscillator note (into `out`, the master bus by default).
const tone = (ac, { freq, to, type = 'sine', at = 0, dur = 0.12, gain = 0.5, out = master }) => {
    const t = ac.currentTime + at;
    const osc = ac.createOscillator();
    const amp = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(amp).connect(out);
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

// Haptics (ms, or on/off patterns) alongside the sounds. Android browsers vibrate; iOS ignores it.
const HAPTICS = {
    pick: 8,
    match: 22,
    win: [30, 60, 30, 60, 80],
    lose: [70, 50, 70],
    undo: 12,
    magnet: 28,
    shuffle: 35,
    freeze: 18,
    refused: 30,
};

const vibrate = (name) => {
    try { if (HAPTICS[name] && navigator.vibrate) navigator.vibrate(HAPTICS[name]); } catch { /* not supported */ }
}

export const playSfx = (name) => {
    if (!enabled) return;
    if (typeof navigator !== 'undefined') vibrate(name);
    const ac = getCtx();
    if (!ac || !SOUNDS[name]) return;
    try { SOUNDS[name](ac); } catch { /* audio must never break the game */ }
}

/*
 * Background music: a soft looping arpeggio (Am - F - C - G) synthesised on the fly, so
 * there's no track to download. Notes are scheduled a little ahead on the audio clock.
 */
const CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
const ARP = [0, 1, 2, 1, 0, 2, 1, 2];
const EIGHTH = 60 / 104 / 2;
const BAR_STEPS = 16;
const MUSIC_VOLUME = 0.16;
const midi = (n) => 440 * 2 ** ((n - 69) / 12);

let music = null;

export const startMusic = () => {
    if (!enabled || music) return;
    const ac = getCtx();
    if (!ac) return;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.0001, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(MUSIC_VOLUME, ac.currentTime + 2);
    gain.connect(master);
    music = { gain, step: 0, nextAt: ac.currentTime + 0.1, timer: 0 };

    const schedule = () => {
        if (!music) return;
        while (music.nextAt < ac.currentTime + 0.3) {
            const s = music.step;
            const chord = CHORDS[Math.floor(s / BAR_STEPS) % CHORDS.length];
            const at = Math.max(0, music.nextAt - ac.currentTime);
            tone(ac, { freq: midi(chord[ARP[s % ARP.length]] + 12), type: 'triangle', at, dur: EIGHTH * 1.6, gain: 0.35, out: gain });
            if (s % BAR_STEPS === 0) {
                tone(ac, { freq: midi(chord[0] - 12), type: 'sine', at, dur: EIGHTH * BAR_STEPS * 0.95, gain: 0.5, out: gain });
            }
            music.step++;
            music.nextAt += EIGHTH;
        }
    };
    schedule();
    music.timer = setInterval(schedule, 100);
}

export const stopMusic = () => {
    if (!music || !ctx) return;
    const { gain, timer } = music;
    music = null;
    clearInterval(timer);
    try {
        gain.gain.cancelScheduledValues(ctx.currentTime);
        gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
        setTimeout(() => gain.disconnect(), 700);
    } catch { /* already gone */ }
}
