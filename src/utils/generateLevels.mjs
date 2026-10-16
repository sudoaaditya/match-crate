/*
 * Writes public/assets/levels/levels.json — the first 100 hand-tweakable level layouts.
 *   npm run levels
 *
 * The rules live in levelGen.js, which the game also uses to build every level past the
 * file on demand (levels never run out). Levels are authored for MEDIUM; modes scale
 * them at load time (see levels.js). Re-running overwrites the file, so either tune the
 * curve in levelGen.js or edit the JSON directly once you're happy with the baseline.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { AUTHORED_COUNT, buildLevel, validateLevel } from "./levelGen.js";

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../../public/assets/levels/levels.json");

const levels = Array.from({ length: AUTHORED_COUNT }, (_, i) => buildLevel(i + 1));
levels.forEach(validateLevel);

// One level per line keeps the file easy to read, diff and hand-edit.
const json = `{\n  "version": 1,\n  "levels": [\n${levels.map(l => '    ' + JSON.stringify(l)).join(',\n')}\n  ]\n}\n`;
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, json);

const summary = (l) => `${String(l.id).padStart(3)} ${l.tag.padEnd(9)} ${String(l.items.length).padStart(2)} types ${String(l.items.reduce((s, [, n]) => s + n * 3, 0)).padStart(3)} items ${String(l.time).padStart(3)}s`;
console.log(`Wrote ${levels.length} levels to ${OUT}`);
[1, 2, 5, 6, 10, 15, 16, 20, 40, 41, 50, 70, 71, 99, 100].forEach(id => console.log(summary(levels[id - 1])));
