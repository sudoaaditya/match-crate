import { STAR_CHEST, startingBoosters } from "./economy.js";

/*
 * Player progress, saved in localStorage. Every access is guarded: storage can be
 * unavailable (private mode, blocked site data) and the game must still run.
 *
 * Shape (version 2, one difficulty):
 *   { version: 2, settings: { sound }, unlocked, stars: { "1": 3, ... }, coins, boosters: { undo, ... }, streak, daily, chests }
 *
 * Version 1 saves kept separate progress per mode (easy/medium/hard). They migrate by
 * keeping the mode that got furthest, with its stars, coins and boosters.
 */

const KEY = 'three-match-puzzle:progress';
const VERSION = 2;

const emptyProgress = () => ({
    version: VERSION,
    settings: { sound: true },
    unlocked: 1,
    stars: {},
    coins: 0,
    boosters: startingBoosters(),
    streak: 0,              // consecutive wins on new levels (see economy.STREAK_STAGES)
    daily: { day: 0, last: null },  // last daily gift claimed (see economy.dailyStatus)
    chests: 0,              // star chests opened
});

const withDefaults = (saved) => {
    const base = emptyProgress();
    return {
        ...base,
        unlocked: saved.unlocked ?? base.unlocked,
        stars: saved.stars ?? base.stars,
        coins: saved.coins ?? base.coins,
        streak: saved.streak ?? base.streak,
        daily: { ...base.daily, ...saved.daily },
        // Saves from before star chests start counting from their current stars (no backlog of chests).
        chests: saved.chests ?? Math.floor(totalStars(saved) / STAR_CHEST.stars),
        boosters: { ...base.boosters, ...saved.boosters },
        settings: { ...base.settings, ...saved.settings },
    };
}

const migrateV1 = (saved) => {
    const modes = Object.entries(saved.modes ?? {});
    // Furthest mode wins; ties go to the mode the player last used.
    modes.sort(([a, x], [b, y]) => (y.unlocked ?? 1) - (x.unlocked ?? 1) || (b === saved.lastMode) - (a === saved.lastMode));
    return withDefaults({ ...(modes[0]?.[1] ?? {}), settings: saved.settings });
}

export const loadProgress = () => {
    try {
        const saved = JSON.parse(localStorage.getItem(KEY));
        if (!saved) return emptyProgress();
        if (saved.version === VERSION) return withDefaults(saved);
        if (saved.version === 1) return migrateV1(saved);
        return emptyProgress();
    } catch {
        return emptyProgress();
    }
}

export const saveProgress = (progress) => {
    try {
        localStorage.setItem(KEY, JSON.stringify(progress));
    } catch {
        // Not persisted this session; progress still works in memory.
    }
}

// Records a win: best stars kept, next level unlocked (levels never run out).
export const recordWin = (progress, levelId, stars) => ({
    ...progress,
    unlocked: Math.max(progress.unlocked, levelId + 1),
    stars: { ...progress.stars, [levelId]: Math.max(progress.stars[levelId] ?? 0, stars) },
});

export const totalStars = (progress) =>
    Object.values(progress?.stars ?? {}).reduce((sum, s) => sum + s, 0);
