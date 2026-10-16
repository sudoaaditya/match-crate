/*
 * Player progress, saved in localStorage. Every access is guarded: storage can be
 * unavailable (private mode, blocked site data) and the game must still run.
 *
 * Shape: {
 *   version: 1,
 *   lastMode: 'medium',
 *   modes: { easy: { unlocked: 1, stars: { "1": 3, ... } }, medium: {...}, hard: {...} }
 * }
 */

const KEY = 'three-match-puzzle:progress';
const VERSION = 1;

const emptyMode = () => ({ unlocked: 1, stars: {} });

const emptyProgress = () => ({
    version: VERSION,
    lastMode: null,
    modes: { easy: emptyMode(), medium: emptyMode(), hard: emptyMode() },
});

export const loadProgress = () => {
    try {
        const saved = JSON.parse(localStorage.getItem(KEY));
        if (!saved || saved.version !== VERSION) return emptyProgress();
        const base = emptyProgress();
        for (const mode of Object.keys(base.modes)) {
            base.modes[mode] = { ...emptyMode(), ...saved.modes?.[mode] };
        }
        return { ...base, lastMode: saved.lastMode ?? null };
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

// Returns a new progress object with the result recorded (best stars kept, next level unlocked).
export const recordWin = (progress, mode, levelId, stars, levelCount) => {
    const current = progress.modes[mode] ?? emptyMode();
    const best = Math.max(current.stars[levelId] ?? 0, stars);
    return {
        ...progress,
        modes: {
            ...progress.modes,
            [mode]: {
                unlocked: Math.min(levelCount || Infinity, Math.max(current.unlocked, levelId + 1)),
                stars: { ...current.stars, [levelId]: best },
            },
        },
    };
}

export const totalStars = (modeProgress) =>
    Object.values(modeProgress?.stars ?? {}).reduce((sum, s) => sum + s, 0);

export const completedCount = (modeProgress) =>
    Object.values(modeProgress?.stars ?? {}).filter(s => s > 0).length;
