/*
 * Level definition: { id, seed, time (s), tray (slots), items: [[typeId, triplets], ...] }
 * Phase 1 ships a single hand-made level; Phase 2 replaces this with levels.json + mode scaling.
 */

export const TEST_LEVEL = {
    id: 1,
    seed: 1337,
    time: 180,
    tray: 7,
    items: [
        ['sphere_red', 2],
        ['sphere_red_striped', 1],
        ['cube_blue', 2],
        ['torus_yellow', 2],
        ['cone_lime', 1],
        ['capsule_mint', 1],
        ['octahedron_teal', 1],
        ['tank', 2],
        ['jeep', 1],
        ['helicopter', 1],
    ],
};
