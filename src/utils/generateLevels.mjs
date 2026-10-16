/*
 * Writes public/assets/levels/levels.json — the 100 hand-tweakable level layouts.
 *   npm run levels
 *
 * Levels are authored for MEDIUM; modes scale them at load time (see levels.js).
 * Re-running overwrites the file, so either tune the curve below or edit the JSON
 * directly once you're happy with the generated baseline.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { CATALOG, SHAPES, MODEL_ITEMS, RECOLORS, LOOKALIKE_MODELS, shapeId, modelId, isModelItem } from "./catalog.js";
import { colorNames, lookalikeColors } from "./colors.js";
import { createRng } from "./helpers.js";

const LEVEL_COUNT = 100;
const MAX_TRIPLETS = 40;          // 120 items
const MAX_MODEL_TRIPLETS = 20;    // 60 models: they're the heaviest items to draw
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../../public/assets/levels/levels.json");

// What may appear from which level. Each tier extends the previous one.
const TIERS = [
    { from: 1, shapes: ['sphere', 'cube', 'torus', 'cone', 'cylinder'], colors: ['red', 'yellow', 'blue', 'lime', 'purple', 'orange', 'teal', 'pink'], striped: false, models: [], paints: false, modelShare: 0 },
    { from: 6, shapes: ['capsule', 'slab', 'octahedron'], colors: ['white', 'sky', 'brown'], striped: false, models: ['tank', 'jeep', 'helicopter'], paints: false, modelShare: 0.2 },
    { from: 16, shapes: ['dodecahedron'], colors: ['mint', 'magenta', 'amber', 'grey', 'indigo'], striped: true, models: ['truck', 'boat', 'bike', 'light_tank'], paints: false, modelShare: 0.4 },
    { from: 41, shapes: [], colors: [], striped: true, models: ['ambulance', 'motorbike'], paints: true, modelShare: 0.5 },
    { from: 71, shapes: [], colors: [], striped: true, models: [], paints: true, modelShare: 0.5 },
];

const tagFor = (id) => id % 10 === 0 ? 'superHard' : id % 5 === 0 ? 'hard' : 'normal';

const unlockedAt = (id) => {
    const acc = { shapes: [], colors: [], models: [], striped: false, paints: false, modelShare: 0, tier: 0 };
    TIERS.forEach((tier, idx) => {
        if (id < tier.from) return;
        acc.shapes.push(...tier.shapes);
        acc.colors.push(...tier.colors);
        acc.models.push(...tier.models);
        Object.assign(acc, { striped: tier.striped, paints: tier.paints, modelShare: tier.modelShare, tier: idx });
    });
    return acc;
}

const pickOne = (rng, list) => list[Math.floor(rng() * list.length)];

const shuffle = (rng, list) => {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

// Look-alike pairs for super hard levels: near-identical colours, plain vs striped, similar models.
const lookalikePair = (rng, pool) => {
    const options = [];
    for (const [a, b] of lookalikeColors) {
        const shape = pickOne(rng, pool.shapes);
        options.push([shapeId(shape, a), shapeId(shape, b)]);
    }
    if (pool.striped) {
        const shape = pickOne(rng, pool.shapes.filter(s => SHAPES[s].stripes));
        const color = pickOne(rng, pool.colors);
        options.push([shapeId(shape, color), shapeId(shape, color, true)]);
    }
    for (const [a, b] of LOOKALIKE_MODELS) {
        if (pool.models.includes(a) && pool.models.includes(b)) options.push([a, b]);
    }
    if (pool.paints && pool.models.length) {
        const model = pickOne(rng, pool.models);
        options.push([modelId(model), modelId(model, pickOne(rng, Object.keys(RECOLORS)))]);
    }
    return pickOne(rng, options);
}

const buildLevel = (id) => {
    const rng = createRng(id * 7919);
    const tag = tagFor(id);
    const pool = unlockedAt(id);
    const p = (id - 1) / (LEVEL_COUNT - 1);

    let types = Math.round(3 + 13 * Math.pow(p, 0.85));
    let triplets = Math.round(3 + 33 * p);
    if (tag === 'hard') { types += 1; triplets += 2; }
    if (tag === 'superHard') { types += 2; triplets += 3; }
    types = Math.min(types, 18);
    triplets = Math.min(Math.max(triplets, types), MAX_TRIPLETS);

    // Candidate ids for this level.
    const shapeIds = [];
    for (const shape of pool.shapes) {
        for (const color of pool.colors) {
            shapeIds.push(shapeId(shape, color));
            if (pool.striped && SHAPES[shape].stripes) shapeIds.push(shapeId(shape, color, true));
        }
    }
    const modelIds = pool.models.flatMap(m => pool.paints ? [modelId(m), ...Object.keys(RECOLORS).map(r => modelId(m, r))] : [modelId(m)]);

    const chosen = new Set();
    if (tag === 'superHard') {
        const pairs = Math.min(3, Math.floor(types / 3));
        for (let i = 0; i < pairs * 4 && chosen.size < pairs * 2; i++) {
            const [a, b] = lookalikePair(rng, pool);
            if (!chosen.has(a) && !chosen.has(b)) { chosen.add(a); chosen.add(b); }
        }
    }
    const modelTarget = Math.round(types * pool.modelShare);
    for (const m of shuffle(rng, modelIds)) {
        if ([...chosen].filter(isModelItem).length >= modelTarget) break;
        chosen.add(m);
    }
    for (const s of shuffle(rng, shapeIds)) {
        if (chosen.size >= types) break;
        chosen.add(s);
    }

    // One triplet each, then spread the rest at random.
    const counts = new Map([...chosen].map(t => [t, 1]));
    const ids = [...chosen];
    for (let i = ids.length; i < triplets; i++) {
        const t = pickOne(rng, ids);
        counts.set(t, counts.get(t) + 1);
    }
    // Keep model-heavy levels light: move excess model triplets onto shapes.
    const shapesOnly = ids.filter(t => !isModelItem(t));
    let modelTriplets = ids.filter(isModelItem).reduce((n, t) => n + counts.get(t), 0);
    for (const t of ids) {
        while (shapesOnly.length && isModelItem(t) && modelTriplets > MAX_MODEL_TRIPLETS && counts.get(t) > 1) {
            counts.set(t, counts.get(t) - 1);
            const s = pickOne(rng, shapesOnly);
            counts.set(s, counts.get(s) + 1);
            modelTriplets--;
        }
    }

    const items = ids.map(t => [t, counts.get(t)]);
    const total = triplets * 3;
    const timeScale = tag === 'superHard' ? 0.7 : tag === 'hard' ? 0.8 : 1;
    const time = Math.round(((25 + total * 2.4) * timeScale) / 5) * 5;

    const level = { id, tag, seed: id * 104729 % 2147483647, time, items };
    if (tag === 'superHard') level.boxScale = 0.85;   // tighter box = deeper pile
    return level;
}

const validate = (level) => {
    for (const [t, n] of level.items) {
        if (!CATALOG[t]) throw new Error(`Level ${level.id}: unknown item "${t}"`);
        if (!(n >= 1)) throw new Error(`Level ${level.id}: bad triplet count for "${t}"`);
    }
    const triplets = level.items.reduce((s, [, n]) => s + n, 0);
    if (triplets > MAX_TRIPLETS) throw new Error(`Level ${level.id}: ${triplets} triplets`);
}

const levels = Array.from({ length: LEVEL_COUNT }, (_, i) => buildLevel(i + 1));
levels.forEach(validate);

// One level per line keeps the file easy to read, diff and hand-edit.
const json = `{\n  "version": 1,\n  "levels": [\n${levels.map(l => '    ' + JSON.stringify(l)).join(',\n')}\n  ]\n}\n`;
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, json);

const summary = (l) => `${String(l.id).padStart(3)} ${l.tag.padEnd(9)} ${String(l.items.length).padStart(2)} types ${String(l.items.reduce((s, [, n]) => s + n * 3, 0)).padStart(3)} items ${String(l.time).padStart(3)}s`;
console.log(`Wrote ${levels.length} levels to ${OUT}`);
[1, 2, 5, 6, 10, 15, 16, 20, 40, 41, 50, 70, 71, 99, 100].forEach(id => console.log(summary(levels[id - 1])));
