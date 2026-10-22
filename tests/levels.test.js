/*
 * Level data: the authored levels.json and the generator behind every level past it.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isModelItem } from '../src/utils/catalog.js';
import { buildLevel, tagFor, validateLevel } from '../src/utils/levelGen.js';
import { LIMITS, rawLevel, resolveLevel } from '../src/utils/levels.js';

const authored = JSON.parse(readFileSync(new URL('../public/assets/levels/levels.json', import.meta.url), 'utf8')).levels;
const sum = (items, f = () => true) => items.filter(([t]) => f(t)).reduce((s, [, n]) => s + n, 0);

// Everything that must hold for a level as played.
const problems = (raw) => {
    const l = resolveLevel(raw);
    const errs = [];
    if (sum(l.items) > LIMITS.triplets) errs.push('too many triplets');
    if (sum(l.items, isModelItem) > LIMITS.modelTriplets) errs.push('too many models');
    if (l.items.some(([, n]) => n < 1)) errs.push('a type with no items');
    if (l.items.length !== raw.items.length) errs.push('lost a type');
    if (l.box < LIMITS.minBox || l.box > LIMITS.maxBox) errs.push(`box ${l.box}`);
    if (!(l.time >= 20)) errs.push('time');
    if (![6, 7].includes(l.tray)) errs.push('tray');
    return errs.length ? `level ${raw.id}: ${errs.join(', ')}` : null;
};

describe('authored levels (levels.json)', () => {
    it('has levels 1-100 in order', () => {
        expect(authored.map(l => l.id)).toEqual(Array.from({ length: 100 }, (_, i) => i + 1));
    });

    it('every level resolves within the caps', () => {
        expect(authored.map(problems).filter(Boolean)).toEqual([]);
    });

    it('matches the generator (npm run levels output is committed)', () => {
        expect(authored.map(l => JSON.stringify(l))).toEqual(authored.map(l => JSON.stringify(buildLevel(l.id))));
    });
});

describe('generated levels', () => {
    const ids = Array.from({ length: 1900 }, (_, i) => 101 + i);

    it('levels 101-2000 are valid and within the caps', () => {
        ids.forEach(id => validateLevel(buildLevel(id)));
        expect(ids.map(id => problems(buildLevel(id))).filter(Boolean)).toEqual([]);
    });

    it('are deterministic and all different', () => {
        expect(buildLevel(777)).toEqual(buildLevel(777));
        expect(new Set(ids.map(id => JSON.stringify(buildLevel(id).items))).size).toBe(ids.length);
    });

    it('hard every 5th, super hard every 10th', () => {
        expect(ids.every(id => buildLevel(id).tag === tagFor(id))).toBe(true);
        expect([buildLevel(105).tag, buildLevel(110).tag]).toEqual(['hard', 'superHard']);
    });

    it('come from the file up to 100, the generator after', () => {
        expect(rawLevel(authored, 50)).toBe(authored[49]);
        expect(rawLevel(authored, 150).id).toBe(150);
    });

    it('ramp up within each block of 10, and the clock tightens over time', () => {
        const items = id => sum(buildLevel(id).items) * 3;
        const perItem = id => buildLevel(id).time / items(id);
        expect(items(109)).toBeGreaterThan(items(101));
        expect(perItem(1001)).toBeLessThan(perItem(101));
    });
});
