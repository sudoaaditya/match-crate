/*
 * Coins and booster stock: every tunable number in one place.
 */

export const BOOSTER_NAMES = ['undo', 'magnet', 'shuffle', 'freeze'];

export const ECONOMY = {
    startingBoosters: 3,            // of each, for a new player
    coinsPerNewStar: 10,            // replays only pay for stars beyond your best
    firstClearBonus: { normal: 0, hard: 20, superHard: 50 },
    // One-off booster rewards for the first clear of special levels.
    firstClearBoosters: { hard: 'random', superHard: 'all' },
    prices: { undo: 40, magnet: 80, shuffle: 50, freeze: 60 },
    bundle: { price: 180, boosters: { undo: 1, magnet: 1, shuffle: 1, freeze: 1 } },
};

export const startingBoosters = () =>
    Object.fromEntries(BOOSTER_NAMES.map(b => [b, ECONOMY.startingBoosters]));

/*
 * What a win pays. `previousStars` is the best before this win (0 = first clear).
 * Returns { coins, boosters: { name: count } }.
 */
export const winRewards = ({ tag, stars, previousStars, rng = Math.random }) => {
    const firstClear = previousStars === 0;
    const coins = Math.max(0, stars - previousStars) * ECONOMY.coinsPerNewStar
        + (firstClear ? ECONOMY.firstClearBonus[tag] ?? 0 : 0);

    const boosters = {};
    const kind = firstClear ? ECONOMY.firstClearBoosters[tag] : null;
    if (kind === 'all') BOOSTER_NAMES.forEach(b => { boosters[b] = 1; });
    if (kind === 'random') boosters[BOOSTER_NAMES[Math.floor(rng() * BOOSTER_NAMES.length)]] = 1;

    return { coins, boosters };
}

export const addBoosters = (stock, extra) =>
    Object.fromEntries(BOOSTER_NAMES.map(b => [b, (stock?.[b] ?? 0) + (extra[b] ?? 0)]));

// Never leave a player stuck with nothing: an empty stock is topped up to one of each.
export const rescueBoosters = (stock) =>
    BOOSTER_NAMES.every(b => (stock?.[b] ?? 0) <= 0)
        ? Object.fromEntries(BOOSTER_NAMES.map(b => [b, 1]))
        : stock;
