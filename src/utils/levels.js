import { isModelItem } from "./catalog.js";
import { buildLevel, tagFor } from "./levelGen.js";

/*
 * Levels never run out: 1–100 come from levels.json (hand-tunable), anything past the
 * file is generated on demand by levelGen.js, deterministically from its id.
 *
 * Raw level (levels.json or generated, authored for medium):
 *   { id, tag: 'normal'|'hard'|'superHard', seed, time, items: [[typeId, triplets], ...], boxScale? }
 * Resolved level (what the game plays): raw scaled by DIFFICULTY + { tray, box }, item caps enforced.
 */

// Applied to every level when played (levels are authored at the old "medium" baseline).
// These were the old Hard mode's numbers; tune here to make the whole game easier/harder.
export const DIFFICULTY = {
    time: 0.75,             // share of the authored time limit
    items: 1.8,             // item count multiplier: old Hard (1.2) + 50% (capped at 180 items / 90 models)
    tray: 7,                // tray slots
    superHardTray: 6,       // tray slots on super hard levels
};

// Caps on a resolved level (exported for the tests).
export const LIMITS = { triplets: 60, modelTriplets: 30, minBox: 2.4, maxBox: 6 };
const MAX_TRIPLETS = LIMITS.triplets;
const MAX_MODEL_TRIPLETS = LIMITS.modelTriplets;
const MAX_BOX = LIMITS.maxBox; // half-width; the camera frames whatever size the box ends up

let levelsPromise = null;

// One small fetch for the authored levels, cached for the session.
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

// Any level by id: from the file if authored, otherwise generated.
export const rawLevel = (authored, id) => authored?.find(l => l.id === id) ?? buildLevel(id);

// Just the tag (cheap: no generation needed for levels past the file).
export const levelTag = (authored, id) => authored?.find(l => l.id === id)?.tag ?? tagFor(id);

export const getLevel = async (id) => rawLevel(await loadLevels(), id);

const sumTriplets = (items) => items.reduce((sum, [, n]) => sum + n, 0);

// Scale the total triplet count by `multiplier` (at most 180 items), adding/removing one at
// a time so every type keeps at least one triplet and the mix stays proportional. Then cap
// models at 90 (the heaviest items to simulate and draw), moving the excess onto shapes.
const scaleItems = (rawItems, multiplier) => {
    const items = rawItems.map(([t, n]) => [t, n]);
    const total = sumTriplets(items);
    const target = Math.min(MAX_TRIPLETS, Math.max(items.length, Math.round(total * multiplier)));
    const byCount = [...items].sort((a, b) => b[1] - a[1]);
    for (let i = 0, diff = target - total; diff !== 0; i++) {
        const entry = byCount[i % byCount.length];
        if (diff > 0) { entry[1]++; diff--; }
        else if (entry[1] > 1) { entry[1]--; diff++; }
    }

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

export const resolveLevel = (raw) => {
    const items = scaleItems(raw.items, DIFFICULTY.items);
    const count = sumTriplets(items) * 3;

    // Box sized to the pile: roughly 0.9 square units of floor per item, then tightened on super hard.
    const box = Math.min(MAX_BOX, Math.max(LIMITS.minBox, (Math.sqrt(count * 0.9) / 2) * (raw.boxScale ?? 1)));

    return {
        ...raw,
        items,
        time: Math.max(20, Math.round((raw.time * DIFFICULTY.time) / 5) * 5),
        tray: raw.tag === 'superHard' ? DIFFICULTY.superHardTray : DIFFICULTY.tray,
        box,
    };
}
