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
    // Continue after a loss (+30s, or 3 tray items back): the price rises with each one in a try.
    continuePrice: 60,
    continueStep: 60,
};

// Coins for the next continue, given how many were already bought this try.
export const continuePrice = (used) => ECONOMY.continuePrice + used * ECONOMY.continueStep;

/*
 * Win streak: consecutive wins on new levels (the next level on the road). Each stage
 * gives the next new level a head start, applied as soon as it begins: `freeze` stops the
 * clock for that many seconds, each `magnet` pulls a triplet into the tray (which clears).
 * Nothing goes into your booster stock. It stays at the top stage while you keep winning.
 * Giving up on a level (retrying/restarting or quitting it without winning) resets it;
 * continuing keeps it, and replays of beaten levels neither raise nor break it.
 */
export const STREAK_STAGES = [
    {},                                 // no streak
    { freeze: 5 },                      // 1 win in a row
    { freeze: 5, magnet: 1 },           // 2
    { freeze: 10, magnet: 1 },          // 3
    { freeze: 15, magnet: 1 },          // 4
    { freeze: 15, magnet: 2 },          // 5 (top stage, kept while winning)
];
export const MAX_STREAK = STREAK_STAGES.length - 1;
export const streakStage = (streak) => Math.min(streak ?? 0, MAX_STREAK);
export const streakBoosters = (streak) => ({ ...STREAK_STAGES[streakStage(streak)] });

/*
 * Daily gift: one claim per calendar day (local time). Claiming on consecutive days walks
 * the 7-day calendar; day 7 is the big one, then it starts over. Missing a day restarts it.
 */
export const DAILY_REWARDS = [
    { coins: 20 },
    { coins: 30 },
    { coins: 40, boosters: { freeze: 1 } },
    { coins: 50 },
    { coins: 60, boosters: { shuffle: 1 } },
    { coins: 80 },
    { coins: 120, boosters: { magnet: 1, undo: 1 } },
];

// Local calendar day as 'YYYY-MM-DD' (offset in days, so -1 is yesterday; DST-safe).
export const dayKey = (now = new Date(), offset = 0) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// daily = { day: last claimed day 1-7 (0 = never), last: dayKey of that claim }.
// Returns { ready, day }: whether a gift can be claimed and which calendar day (1-7) is next/current.
export const dailyStatus = (daily, now = new Date()) => {
    const { day = 0, last = null } = daily ?? {};
    if (last === dayKey(now)) return { ready: false, day };
    const next = last === dayKey(now, -1) ? (day % DAILY_REWARDS.length) + 1 : 1;
    return { ready: true, day: next };
};

/*
 * Star chest: every STAR_CHEST.stars stars earned (best per level, so replays only count
 * improvements) fills a chest of coins and random boosters.
 */
export const STAR_CHEST = { stars: 20, coins: 60, boosters: 2 };

// opened = chests opened so far. Returns { stars: progress into the current chest, ready }.
export const chestStatus = (stars, opened) => {
    const into = stars - opened * STAR_CHEST.stars;
    return { stars: Math.min(into, STAR_CHEST.stars), ready: into >= STAR_CHEST.stars };
};

export const chestReward = (rng = Math.random) => {
    const boosters = {};
    for (let i = 0; i < STAR_CHEST.boosters; i++) {
        const b = BOOSTER_NAMES[Math.floor(rng() * BOOSTER_NAMES.length)];
        boosters[b] = (boosters[b] ?? 0) + 1;
    }
    return { coins: STAR_CHEST.coins, boosters };
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
