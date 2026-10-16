import { isModelItem } from "./catalog.js";

/*
 * Raw level (levels.json, authored for medium):
 *   { id, tag: 'normal'|'hard'|'superHard', seed, time, items: [[typeId, triplets], ...], boxScale? }
 * Resolved level (what the game plays): raw + mode scaling + { mode, tray, box, boosters }.
 */

export const MODES = {
    easy: { label: 'Easy', time: 1.5, items: 0.75, tray: 8, boosters: 3 },
    medium: { label: 'Medium', time: 1, items: 1, tray: 7, boosters: 2 },
    hard: { label: 'Hard', time: 0.75, items: 1.2, tray: 7, superHardTray: 6, boosters: 1 },
};

export const DEFAULT_MODE = 'medium';

const MAX_TRIPLETS = 40;
const MAX_MODEL_TRIPLETS = 20;

let levelsPromise = null;

// One small fetch for all 100 levels, cached for the session.
export const loadLevels = () => {
    if (!levelsPromise) {
        levelsPromise = fetch('assets/levels/levels.json')
            .then(res => {
                if (!res.ok) throw new Error(`levels.json: HTTP ${res.status}`);
                return res.json();
            })
            .then(data => data.levels)
            .catch(err => { levelsPromise = null; throw err; });
    }
    return levelsPromise;
}

const sumTriplets = (items) => items.reduce((sum, [, n]) => sum + n, 0);

// Scale the total triplet count, then walk the list adding/removing one at a time so
// every type keeps at least one triplet and the mix stays proportional.
const scaleItems = (rawItems, multiplier) => {
    const items = rawItems.map(([t, n]) => [t, n]);
    const total = sumTriplets(items);
    const target = Math.min(MAX_TRIPLETS, Math.max(items.length, Math.round(total * multiplier)));
    let diff = target - total;
    const byCount = [...items].sort((a, b) => b[1] - a[1]);
    for (let i = 0; diff !== 0; i++) {
        const entry = byCount[i % byCount.length];
        if (diff > 0) { entry[1]++; diff--; }
        else if (entry[1] > 1) { entry[1]--; diff++; }
    }

    // Models are the heaviest items to simulate/draw: cap them, moving the excess to shapes.
    const shapes = items.filter(([t]) => !isModelItem(t));
    let models = sumTriplets(items.filter(([t]) => isModelItem(t)));
    for (let i = 0; models > MAX_MODEL_TRIPLETS && shapes.length; i++) {
        const entry = items.find(([t, n]) => isModelItem(t) && n > 1);
        if (!entry) break;
        entry[1]--;
        shapes[i % shapes.length][1]++;
        models--;
    }
    return items;
}

export const resolveLevel = (raw, modeKey = DEFAULT_MODE) => {
    const mode = MODES[modeKey] ?? MODES[DEFAULT_MODE];
    const items = scaleItems(raw.items, mode.items);
    const count = sumTriplets(items) * 3;

    // Box sized to the pile: roughly 0.9 square units of floor per item, then tightened on super hard.
    const box = Math.min(5, Math.max(2.4, (Math.sqrt(count * 0.9) / 2) * (raw.boxScale ?? 1)));

    return {
        ...raw,
        mode: modeKey,
        items,
        time: Math.max(20, Math.round((raw.time * mode.time) / 5) * 5),
        tray: raw.tag === 'superHard' && mode.superHardTray ? mode.superHardTray : mode.tray,
        box,
        boosters: mode.boosters,
    };
}
