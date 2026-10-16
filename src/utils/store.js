import { create } from "zustand";
import { DEFAULT_MODE, loadLevels, resolveLevel } from "./levels.js";
import { loadProgress, recordWin, saveProgress } from "./storage.js";

export const MATCH_SIZE = 3;
export const FLY_MS = 380;      // pile -> tray flight
export const MERGE_MS = 300;    // matched triplet converging and popping

let uid = 0;
let timers = [];
const later = (fn, ms) => timers.push(setTimeout(fn, ms));
const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

// Stars from the share of time left when the level is cleared.
export const starsFor = (timeLeft, timeTotal) => {
    const left = timeTotal > 0 ? timeLeft / timeTotal : 0;
    return left >= 0.5 ? 3 : left >= 0.25 ? 2 : 1;
}

// A level is "in play" while running or paused: flights, merges and checks keep resolving.
const inPlay = (status) => status === 'playing' || status === 'paused';

// Items that still count against the tray's capacity.
const activeCount = (tray) => tray.reduce((n, e) => n + (e.state === 'active' ? 1 : 0), 0);

/*
 * Tray entry: { uid, typeId, from: { position, quaternion }, state, landed, matchId?, mergeAt? }
 *   state 'active'   : sitting in (or flying to) a slot
 *         'matched'  : part of a completed triplet, waiting for its last item to land
 *         'clearing' : the triplet is merging/popping (mergeAt = start time)
 * Matched/clearing entries keep their slot until removed but don't count toward capacity.
 * The tray calls landed(uid) when an item finishes its flight, which drives merges and
 * the "tray full" check, so the visuals and the rules stay in sync.
 */
const initialProgress = loadProgress();

export const useGameStore = create((set, get) => ({
    screen: 'home',         // home | modes | map | game
    progress: initialProgress,
    result: null,           // last win: { stars, best, unlocked }
    status: 'idle',         // idle | loading | playing | paused | won | lost | error
    loseReason: null,       // 'time' | 'tray'
    mode: initialProgress.lastMode ?? DEFAULT_MODE,
    levelCount: 0,
    level: null,            // resolved level (see levels.js)
    runId: 0,               // bump to remount the physics scene
    timeLeft: 0,
    timeTotal: 0,
    trayCapacity: 7,
    total: 0,
    remaining: 0,           // items still in the pile
    tray: [],

    startLevel: (level) => {
        clearTimers();
        const total = level.items.reduce((sum, [, triplets]) => sum + triplets * MATCH_SIZE, 0);
        set(s => ({
            status: 'playing',
            loseReason: null,
            result: null,
            level,
            runId: s.runId + 1,
            timeLeft: level.time,
            timeTotal: level.time,
            trayCapacity: level.tray ?? 7,
            total,
            remaining: total,
            tray: [],
        }));
    },

    // Load (cached) levels.json, apply the mode and start. Unknown ids fall back to level 1.
    playLevel: async (id, mode = get().mode) => {
        clearTimers();
        set({ status: 'loading', mode, screen: 'game', tray: [] });
        try {
            const levels = await loadLevels();
            const raw = levels.find(l => l.id === id) ?? levels[0];
            set({ levelCount: levels.length });
            get().startLevel(resolveLevel(raw, mode));
        } catch (err) {
            console.error(err);
            set({ status: 'error' });
        }
    },

    nextLevel: () => {
        const { level, levelCount, playLevel } = get();
        if (level && level.id < levelCount) playLevel(level.id + 1);
    },

    /* ---------- navigation ---------- */

    setScreen: (screen) => set({ screen }),

    selectMode: (mode) => {
        const progress = { ...get().progress, lastMode: mode };
        saveProgress(progress);
        set({ mode, progress, screen: 'map' });
    },

    // Leave a level (from pause or the result card) back to the map.
    quitToMap: () => {
        clearTimers();
        set({ screen: 'map', status: 'idle', level: null, tray: [] });
    },

    pause: () => { if (get().status === 'playing') set({ status: 'paused' }); },
    resume: () => { if (get().status === 'paused') set({ status: 'playing' }); },

    retry: () => {
        const { level, startLevel } = get();
        if (level) startLevel(level);
    },

    canPick: () => {
        const { status, tray, trayCapacity } = get();
        return status === 'playing' && activeCount(tray) < trayCapacity;
    },

    // Called by the pile when an item is tapped. Returns false if the tap is refused.
    pick: (typeId, from) => {
        if (!get().canPick()) return false;

        const tray = [...get().tray];
        const entry = { uid: ++uid, typeId, from, state: 'active', landed: false };

        // Group with identical items: insert right after the last one of this type still in play.
        let insertAt = tray.length;
        for (let i = tray.length - 1; i >= 0; i--) {
            if (tray[i].typeId === typeId && tray[i].state === 'active') { insertAt = i + 1; break; }
        }
        tray.splice(insertAt, 0, entry);

        const same = tray.filter(e => e.typeId === typeId && e.state === 'active');
        if (same.length >= MATCH_SIZE) {
            const matchId = entry.uid;
            const ids = new Set(same.slice(0, MATCH_SIZE).map(e => e.uid));
            for (let i = 0; i < tray.length; i++) {
                if (ids.has(tray[i].uid)) tray[i] = { ...tray[i], state: 'matched', matchId };
            }
        }

        set({ tray, remaining: get().remaining - 1 });
        return true;
    },

    // An item finished flying into its slot.
    landed: (entryUid) => {
        if (!inPlay(get().status)) return;
        const tray = get().tray.map(e => e.uid === entryUid ? { ...e, landed: true } : e);
        const entry = tray.find(e => e.uid === entryUid);
        if (!entry) return;
        set({ tray });

        if (entry.state === 'matched') {
            const group = tray.filter(e => e.matchId === entry.matchId);
            if (group.every(e => e.landed)) get()._merge(entry.matchId);
        } else if (activeCount(tray) >= get().trayCapacity && tray.every(e => e.landed)) {
            get().lose('tray');
        }
    },

    _merge: (matchId) => {
        const mergeAt = performance.now();
        set({ tray: get().tray.map(e => e.matchId === matchId ? { ...e, state: 'clearing', mergeAt } : e) });
        later(() => get()._removeMatch(matchId), MERGE_MS);
    },

    _removeMatch: (matchId) => {
        const tray = get().tray.filter(e => e.matchId !== matchId);
        set({ tray });
        if (inPlay(get().status) && get().remaining === 0 && tray.length === 0) {
            get()._win();
        } else if (activeCount(tray) >= get().trayCapacity && tray.every(e => e.landed)) {
            get().lose('tray');
        }
    },

    _win: () => {
        const { level, mode, timeLeft, timeTotal, levelCount, progress } = get();
        const stars = starsFor(timeLeft, timeTotal);
        const previous = progress.modes[mode]?.stars[level.id] ?? 0;
        const next = recordWin(progress, mode, level.id, stars, levelCount);
        saveProgress(next);
        set({
            status: 'won',
            progress: next,
            result: { stars, best: stars > previous, unlocked: next.modes[mode].unlocked },
        });
    },

    tick: (dt) => {
        const { status, timeLeft } = get();
        if (status !== 'playing') return;
        const next = Math.max(0, timeLeft - dt);
        set({ timeLeft: next });
        if (next === 0) get().lose('time');
    },

    lose: (reason) => {
        if (!inPlay(get().status)) return;
        clearTimers();
        set({ status: 'lost', loseReason: reason });
    },
}));
