import { create } from "zustand";
import { getLevel, resolveLevel } from "./levels.js";
import { loadProgress, recordWin, saveProgress, totalStars } from "./storage.js";
import { addBoosters, BOOSTER_NAMES, chestReward, chestStatus, continuePrice, DAILY_REWARDS, dailyStatus, dayKey, ECONOMY, rescueBoosters, streakBoosters, winRewards } from "./economy.js";
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
// Coins the next continue costs in this try.
export const selectContinuePrice = (s) => continuePrice(s.continues);

// Win streak head start: magnets fire once the pile has dropped, a little apart.
const GIFT_MAGNET_AT = 1.4;     // seconds of play
const GIFT_MAGNET_GAP = 0.8;

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
    result: null,           // last win: { stars, best, unlocked, coins, boosters, streak }
    status: 'idle',         // idle | loading | playing | paused | won | lost | error
    loseReason: null,       // 'time' | 'tray'
    continues: 0,           // continues bought this attempt (each costs more)
    level: null,            // resolved level (see levels.js)
    runId: 0,               // bump to remount the physics scene
    timeLeft: 0,
    timeTotal: 0,
    frozen: 0,              // seconds of timer freeze left
    trayCapacity: 7,
    total: 0,
    remaining: 0,           // items still in the pile
    tray: [],
    frontier: false,        // playing the next new level (streak applies), not a replay
    gift: {},               // this level's win streak head start: { freeze?, magnet? }
    giftMagnets: 0,         // streak magnets still to fire
    played: 0,              // seconds the clock has run this attempt (freeze included)

    startLevel: (level) => {
        clearTimers();
        const total = level.items.reduce((sum, [, triplets]) => sum + triplets * MATCH_SIZE, 0);
        get()._rescueBoosters();
        const { progress } = get();
        const frontier = level.id >= progress.unlocked;
        const gift = frontier ? streakBoosters(progress.streak) : {};
        set(s => ({
            status: 'playing',
            loseReason: null,
            continues: 0,
            result: null,
            level,
            runId: s.runId + 1,
            timeLeft: level.time,
            timeTotal: level.time,
            // The clock only ticks once the scene has loaded, so the freeze starts with play.
            frozen: gift.freeze ?? 0,
            trayCapacity: level.tray ?? 7,
            total,
            remaining: total,
            tray: [],
            frontier,
            gift,
            giftMagnets: gift.magnet ?? 0,
            played: 0,
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
        get()._giveUp();
        clearTimers();
        set({ screen, status: 'idle', level: null, tray: [] });
    },

    pause: () => { if (get().status === 'playing') set({ status: 'paused' }); },
    resume: () => { if (get().status === 'paused') set({ status: 'playing' }); },

    retry: () => {
        const { level, startLevel } = get();
        if (!level) return;
        get()._giveUp();
        startLevel(level);
    },

    // Leaving a new level without winning it (retry, restart, quit) ends the win streak.
    _giveUp: () => {
        const { frontier, status, progress } = get();
        if (!frontier || status === 'won' || !progress.streak) return;
        const next = { ...progress, streak: 0 };
        saveProgress(next);
        set({ progress: next });
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
        const { level, timeLeft, timeTotal, progress, frontier } = get();
        const stars = starsFor(timeLeft, timeTotal);
        const previous = progress.stars[level.id] ?? 0;
        const rewards = winRewards({ tag: level.tag ?? 'normal', stars, previousStars: previous });
        const won = recordWin(progress, level.id, stars);
        const streak = frontier ? progress.streak + 1 : progress.streak;
        const next = { ...won, coins: won.coins + rewards.coins, boosters: addBoosters(won.boosters, rewards.boosters), streak };
        saveProgress(next);
        set({
            status: 'won',
            progress: next,
            result: { stars, best: stars > previous, unlocked: next.unlocked, ...rewards, streak: { from: progress.streak, to: streak } },
        });
        playSfx('win');
    },

    tick: (dt) => {
        const { status, timeLeft, frozen, played, giftMagnets, gift } = get();
        if (status !== 'playing') return;
        set({ played: played + dt });
        // Streak magnets, one at a time; a magnet with nothing to pull is skipped.
        const firedMagnets = (gift.magnet ?? 0) - giftMagnets;
        if (giftMagnets > 0 && played + dt >= GIFT_MAGNET_AT + firedMagnets * GIFT_MAGNET_GAP) {
            set({ giftMagnets: giftMagnets - 1 });
            if (get()._magnet() !== false) playSfx('magnet');
        }
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

    // Bought with coins: +30s, or three tray items back onto the pile. Returns whether it went through.
    continueGame: () => {
        const { status, loseReason, continues } = get();
        const price = continuePrice(continues);
        if (status !== 'lost') return false;
        if (selectCoins(get()) < price) {
            playSfx('refused');
            return false;
        }
        get()._changeStock({}, -price);
        if (loseReason === 'time') {
            set({ timeLeft: get().timeLeft + CONTINUE_SECONDS });
        } else {
            for (let i = 0; i < MATCH_SIZE; i++) {
                const entry = lastActive(get().tray);
                if (entry) get()._returnToPile(entry);
            }
        }
        set({ status: 'playing', loseReason: null, continues: continues + 1 });
        playSfx('undo');
        // The last triplet may have finished merging after the loss.
        if (get().remaining === 0 && get().tray.length === 0) get()._win();
        return true;
    },

    /* ---------- economy ---------- */

    // Add (or with negatives, spend) boosters/coins and save, along with any other `changes` to progress.
    _changeStock: (boosters = {}, coins = 0, changes = {}) => {
        const { progress } = get();
        const next = { ...progress, ...changes, coins: progress.coins + coins, boosters: addBoosters(progress.boosters, boosters) };
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

    // Daily gift. Returns the reward ({ coins, boosters? }) or null if already claimed today.
    claimDaily: (now = new Date()) => {
        const { progress } = get();
        const status = dailyStatus(progress.daily, now);
        if (!status.ready) return null;
        const reward = DAILY_REWARDS[status.day - 1];
        get()._changeStock(reward.boosters, reward.coins, { daily: { day: status.day, last: dayKey(now) } });
        playSfx('win');
        return reward;
    },

    // Star chest. Returns the reward or null if the chest isn't full yet.
    openChest: (rng = Math.random) => {
        const { progress } = get();
        if (!chestStatus(totalStars(progress), progress.chests).ready) return null;
        const reward = chestReward(rng);
        get()._changeStock(reward.boosters, reward.coins, { chests: progress.chests + 1 });
        playSfx('win');
        return reward;
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
