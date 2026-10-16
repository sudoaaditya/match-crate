import { create } from "zustand";
import { getLevel, resolveLevel } from "./levels.js";
import { loadProgress, recordWin, saveProgress } from "./storage.js";
import { addBoosters, BOOSTER_NAMES, ECONOMY, rescueBoosters, winRewards } from "./economy.js";
import { allGroups, getGroup } from "./pile.js";
import { playSfx, setSfxEnabled } from "./sfx.js";

export const MATCH_SIZE = 3;
export const FLY_MS = 380;      // pile -> tray flight
export const MERGE_MS = 300;    // matched triplet converging and popping
export const FREEZE_SECONDS = 10;
export const CONTINUE_SECONDS = 30;
export const BOOSTERS = BOOSTER_NAMES;

// Booster stock (saved; spent across levels, refilled by wins and the shop) and coins.
export const selectBoosters = (s) => s.progress.boosters ?? {};
export const selectCoins = (s) => s.progress.coins ?? 0;

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

const lastActive = (tray) => tray.reduce((last, e) => e.state === 'active' && (!last || e.uid > last.uid) ? e : last, null);

/*
 * Tray entry: { uid, typeId, instanceId, from: { position, quaternion }, state, landed, matchId?, mergeAt? }
 *   state 'active'   : sitting in (or flying to) a slot
 *         'matched'  : part of a completed triplet, waiting for its last item to land
 *         'clearing' : the triplet is merging/popping (mergeAt = start time)
 * Matched/clearing entries keep their slot until removed but don't count toward capacity.
 * The tray calls landed(uid) when an item finishes its flight, which drives merges and
 * the "tray full" check, so the visuals and the rules stay in sync.
 */
const initialProgress = loadProgress();
setSfxEnabled(initialProgress.settings.sound);

export const useGameStore = create((set, get) => ({
    screen: 'home',         // home | map | shop (tabbed menus) | game
    progress: initialProgress,
    result: null,           // last win: { stars, best, unlocked, coins, boosters }
    status: 'idle',         // idle | loading | playing | paused | won | lost | error
    loseReason: null,       // 'time' | 'tray'
    continued: false,       // the one free continue per attempt has been used
    level: null,            // resolved level (see levels.js)
    runId: 0,               // bump to remount the physics scene
    timeLeft: 0,
    timeTotal: 0,
    frozen: 0,              // seconds of timer freeze left
    trayCapacity: 7,
    total: 0,
    remaining: 0,           // items still in the pile
    tray: [],

    startLevel: (level) => {
        clearTimers();
        const total = level.items.reduce((sum, [, triplets]) => sum + triplets * MATCH_SIZE, 0);
        get()._rescueBoosters();
        set(s => ({
            status: 'playing',
            loseReason: null,
            continued: false,
            result: null,
            level,
            runId: s.runId + 1,
            timeLeft: level.time,
            timeTotal: level.time,
            frozen: 0,
            trayCapacity: level.tray ?? 7,
            total,
            remaining: total,
            tray: [],
        }));
    },

    // Load the level (authored or generated) and start.
    playLevel: async (id) => {
        clearTimers();
        set({ status: 'loading', screen: 'game', tray: [] });
        try {
            get().startLevel(resolveLevel(await getLevel(Math.max(1, id))));
        } catch (err) {
            console.error(err);
            set({ status: 'error' });
        }
    },

    nextLevel: () => {
        const { level, playLevel } = get();
        if (level) playLevel(level.id + 1);
    },

    /* ---------- navigation & settings ---------- */

    setScreen: (screen) => set({ screen }),

    // Leave a level (from pause or the result card) to a menu tab: 'home' or 'map'.
    quitTo: (screen = 'map') => {
        clearTimers();
        set({ screen, status: 'idle', level: null, tray: [] });
    },

    pause: () => { if (get().status === 'playing') set({ status: 'paused' }); },
    resume: () => { if (get().status === 'paused') set({ status: 'playing' }); },

    retry: () => {
        const { level, startLevel } = get();
        if (level) startLevel(level);
    },

    toggleSound: () => {
        const progress = get().progress;
        const sound = !progress.settings.sound;
        const next = { ...progress, settings: { ...progress.settings, sound } };
        setSfxEnabled(sound);
        saveProgress(next);
        set({ progress: next });
        playSfx('pick');
    },

    /* ---------- core loop ---------- */

    canPick: () => {
        const { status, tray, trayCapacity } = get();
        return status === 'playing' && activeCount(tray) < trayCapacity;
    },

    // Called by the pile when an item is tapped. Returns false if the tap is refused.
    pick: (typeId, from, instanceId) => {
        if (!get().canPick()) {
            if (get().status === 'playing') playSfx('refused');
            return false;
        }

        const tray = [...get().tray];
        const entry = { uid: ++uid, typeId, instanceId, from, state: 'active', landed: false };

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
        playSfx('pick');
        return true;
    },

    // An item finished flying into its slot.
    // Also recorded after a loss, so a continue picks up a consistent tray.
    landed: (entryUid) => {
        if (!get().level) return;
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
        playSfx('match');
        later(() => get()._removeMatch(matchId), MERGE_MS);
    },

    _removeMatch: (matchId) => {
        const tray = get().tray.filter(e => e.matchId !== matchId);
        set({ tray });
        if (inPlay(get().status) && get().remaining === 0 && tray.length === 0) {
            get()._win();
        }
    },

    // Take an active entry out of the tray and drop its item back onto the pile.
    _returnToPile: (entry) => {
        set({ tray: get().tray.filter(e => e.uid !== entry.uid), remaining: get().remaining + 1 });
        getGroup(entry.typeId)?.restore(entry.instanceId);
    },

    _win: () => {
        const { level, timeLeft, timeTotal, progress } = get();
        const stars = starsFor(timeLeft, timeTotal);
        const previous = progress.stars[level.id] ?? 0;
        const rewards = winRewards({ tag: level.tag ?? 'normal', stars, previousStars: previous });
        const won = recordWin(progress, level.id, stars);
        const next = { ...won, coins: won.coins + rewards.coins, boosters: addBoosters(won.boosters, rewards.boosters) };
        saveProgress(next);
        set({
            status: 'won',
            progress: next,
            result: { stars, best: stars > previous, unlocked: next.unlocked, ...rewards },
        });
        playSfx('win');
    },

    tick: (dt) => {
        const { status, timeLeft, frozen } = get();
        if (status !== 'playing') return;
        if (frozen > 0) {
            set({ frozen: Math.max(0, frozen - dt) });
            return;
        }
        const next = Math.max(0, timeLeft - dt);
        set({ timeLeft: next });
        // Countdown ticks over the last 10 seconds.
        if (Math.ceil(next) < Math.ceil(timeLeft) && Math.ceil(next) <= 10 && next > 0) playSfx('tick');
        if (next === 0) get().lose('time');
    },

    // Pending merges keep running (their timers aren't cleared), so a continue resumes cleanly.
    lose: (reason) => {
        if (!inPlay(get().status)) return;
        set({ status: 'lost', loseReason: reason });
        playSfx('lose');
    },

    // One free second chance per attempt: +30s, or three tray items back onto the pile.
    continueGame: () => {
        const { status, loseReason, continued } = get();
        if (status !== 'lost' || continued) return;
        if (loseReason === 'time') {
            set({ timeLeft: get().timeLeft + CONTINUE_SECONDS });
        } else {
            for (let i = 0; i < MATCH_SIZE; i++) {
                const entry = lastActive(get().tray);
                if (entry) get()._returnToPile(entry);
            }
        }
        set({ status: 'playing', loseReason: null, continued: true });
        playSfx('undo');
        // The last triplet may have finished merging after the loss.
        if (get().remaining === 0 && get().tray.length === 0) get()._win();
    },

    /* ---------- economy ---------- */

    // Add (or with negatives, spend) boosters/coins and save.
    _changeStock: (boosters = {}, coins = 0) => {
        const { progress } = get();
        const next = { ...progress, coins: progress.coins + coins, boosters: addBoosters(progress.boosters, boosters) };
        saveProgress(next);
        set({ progress: next });
    },

    _rescueBoosters: () => {
        const stock = get().progress.boosters;
        const rescued = rescueBoosters(stock);
        if (rescued === stock) return;
        const next = { ...get().progress, boosters: rescued };
        saveProgress(next);
        set({ progress: next });
    },

    // Shop: item is a booster name or 'bundle'. Returns whether the purchase went through.
    buy: (item) => {
        const price = item === 'bundle' ? ECONOMY.bundle.price : ECONOMY.prices[item];
        if (price === undefined || selectCoins(get()) < price) {
            playSfx('refused');
            return false;
        }
        const boosters = item === 'bundle' ? ECONOMY.bundle.boosters : { [item]: 1 };
        get()._changeStock(boosters, -price);
        playSfx('match');
        return true;
    },

    /* ---------- boosters ---------- */

    // Whether a booster can do anything right now (for enabling its button).
    canUseBooster: (name) => {
        const { status, tray } = get();
        if (status !== 'playing' || (selectBoosters(get())[name] ?? 0) <= 0) return false;
        if (name === 'undo') return !!lastActive(tray);
        if (name === 'magnet') return !!get()._magnetPlan();
        return true;
    },

    useBooster: (name) => {
        if (!get().canUseBooster(name)) {
            playSfx('refused');
            return false;
        }
        const ok = get()[`_${name}`]();
        if (ok !== false) {
            get()._changeStock({ [name]: -1 });
            playSfx(name);
        }
        return ok !== false;
    },

    // Undo: the most recently picked item goes back to the pile.
    _undo: () => {
        const entry = lastActive(get().tray);
        if (!entry) return false;
        get()._returnToPile(entry);
    },

    // Magnet: complete a triplet straight from the pile. Prefers the type that needs the
    // fewest items (a pair in the tray needs one), and only if the tray has room for it.
    _magnetPlan: () => {
        const { tray, trayCapacity } = get();
        const free = trayCapacity - activeCount(tray);
        const inTray = {};
        tray.forEach(e => { if (e.state === 'active') inTray[e.typeId] = (inTray[e.typeId] ?? 0) + 1; });
        let best = null;
        for (const group of allGroups()) {
            const need = MATCH_SIZE - (inTray[group.typeId] ?? 0);
            if (need > free || group.available() < need) continue;
            if (!best || need < best.need) best = { group, need };
        }
        return best;
    },

    _magnet: () => {
        const plan = get()._magnetPlan();
        if (!plan) return false;
        plan.group.autoPick(plan.need);
    },

    // Shuffle: toss everything left in the pile.
    _shuffle: () => {
        allGroups().forEach(g => g.shuffle());
    },

    // Freeze: the timer stops for a few seconds (stacks).
    _freeze: () => {
        set({ frozen: get().frozen + FREEZE_SECONDS });
    },
}));
