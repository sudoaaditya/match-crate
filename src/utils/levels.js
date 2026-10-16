import { isModelItem } from "./catalog.js";
import { buildLevel, tagFor } from "./levelGen.js";

/*
 * Levels never run out: 1–100 come from levels.json (hand-tunable), anything past the
 * file is generated on demand by levelGen.js, deterministically from its id.
 *
 * Raw level (levels.json or generated, authored for medium):
 *   { id, tag: 'normal'|'hard'|'superHard', seed, time, items: [[typeId, triplets], ...], boxScale? }
 * Resolved level (what the game plays): raw + { tray, box }, with item caps enforced.
 */

export const TRAY_SLOTS = 7;

const MAX_TRIPLETS = 40;
const MAX_MODEL_TRIPLETS = 20;

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

// Safety net for hand-edited levels.json: at most 120 items, at most 60 of them models
// (the heaviest to simulate and draw). Excess model triplets move onto shapes.
const capItems = (rawItems) => {
    const items = rawItems.map(([t, n]) => [t, n]);
    const byCount = [...items].sort((a, b) => b[1] - a[1]);
    for (let i = 0, over = sumTriplets(items) - MAX_TRIPLETS; over > 0; i++) {
        const entry = byCount[i % byCount.length];
        if (entry[1] > 1) { entry[1]--; over--; }
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
    const items = capItems(raw.items);
    const count = sumTriplets(items) * 3;

    // Box sized to the pile: roughly 0.9 square units of floor per item, then tightened on super hard.
    const box = Math.min(5, Math.max(2.4, (Math.sqrt(count * 0.9) / 2) * (raw.boxScale ?? 1)));

    return {
        ...raw,
        items,
        time: Math.max(20, Math.round(raw.time / 5) * 5),
        tray: TRAY_SLOTS,
        box,
    };
}
