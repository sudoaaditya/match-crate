/*
 * Game rules, driven through the zustand store with no renderer: tray merges, win/lose,
 * boosters, economy, win streak, daily gift and star chest. Sections run in order and
 * share the one store, like a play session.
 */
import { describe, expect, it } from 'vitest';
import { MERGE_MS, selectBoosters, selectCoins, selectContinuePrice, starsFor, useGameStore as S } from '../src/utils/store.js';
import { registerGroup } from '../src/utils/pile.js';
import { DAILY_REWARDS, dailyStatus, dayKey, ECONOMY, STAR_CHEST, STREAK_STAGES } from '../src/utils/economy.js';
import { loadProgress } from '../src/utils/storage.js';
import { DIFFICULTY, LIMITS, resolveLevel } from '../src/utils/levels.js';

const wait = ms => new Promise(r => setTimeout(r, ms));
const from = { position: [0, 0, 0], quaternion: [0, 0, 0, 1] };
const g = () => S.getState();
const ok = (cond, msg) => expect(cond, msg).toBe(true);
const lv = (o) => ({ id: 1, seed: 1, time: 60, tray: 7, items: [['a', 1], ['b', 1]], ...o });
const pickLand = (t) => { g().pick(t, from); g().landed(g().tray.filter(x => x.typeId === t).at(-1).uid); };
const states = () => g().tray.map(e => e.typeId + ':' + e.state).join(' ');
const stock = () => selectBoosters(g());
const setStock = (boosters, coins = 0) => S.setState(s => ({ progress: { ...s.progress, boosters, coins, streak: 0 } }));
const setProg = (o) => S.setState(s => ({ progress: { ...s.progress, unlocked: 1, stars: {}, coins: 0, boosters: { undo: 1, magnet: 1, shuffle: 1, freeze: 1 }, streak: 0, ...o } }));
const trip = (l) => l.items.reduce((s, [, n]) => s + n, 0);

// Stand-in for a physics pile group (see utils/pile.js).
const fakePile = (typeId, n) => {
    const p = {
        typeId, left: n, restored: [], shuffled: 0,
        available: () => p.left,
        autoPick: (k) => { let done = 0; for (let i = 0; i < k; i++) if (p.left > 0 && g().pick(typeId, from, 100 + i)) { p.left--; done++; } return done; },
        restore: (id) => { p.restored.push(id); p.left++; },
        shuffle: () => { p.shuffled++; },
    };
    return p;
};

// In-memory localStorage for the save tests.
const withStorage = (fn) => {
    const mem = {};
    globalThis.localStorage = { getItem: k => mem[k] ?? null, setItem: (k, v) => { mem[k] = v; } };
    try { return fn(mem); } finally { delete globalThis.localStorage; }
};

describe('tray', () => {
    it('merges only once the third item lands', async () => {
        g().startLevel(lv());
        pickLand('a'); pickLand('b'); pickLand('a');
        ok(g().tray.map(e => e.typeId).join('') === 'aab', 'same types grouped');
        g().pick('a', from);                                   // third a still flying
        ok(states() === 'a:matched a:matched a:matched b:active', 'third tap marks matched, not merging');
        await wait(MERGE_MS + 100);
        ok(g().tray.length === 4 && g().tray.every(e => e.state !== 'clearing'), 'nothing merges while third is in flight');
        g().landed(g().tray.find(e => !e.landed).uid);
        ok(g().tray.filter(e => e.state === 'clearing').length === 3, 'merge starts when the third lands');
        await wait(MERGE_MS + 50);
        ok(g().tray.map(e => e.typeId).join('') === 'b', 'triplet removed after merge');
    });

    it('waits for all three when they fly at once', () => {
        g().startLevel(lv());
        g().pick('a', from); g().pick('a', from); g().pick('a', from);
        const ids = g().tray.map(e => e.uid);
        g().landed(ids[0]); g().landed(ids[2]);
        ok(!g().tray.some(e => e.state === 'clearing'), 'waits for every item of the triplet');
        g().landed(ids[1]);
        ok(g().tray.every(e => e.state === 'clearing'), 'merges once all landed');
    });
});

describe('win and lose', () => {
    it('wins when pile and tray are empty', async () => {
        g().startLevel(lv());
        ['a', 'a', 'a', 'b', 'b', 'b'].forEach(pickLand);
        await wait(MERGE_MS + 50);
        ok(g().status === 'won', 'won');
    });

    it('loses on a full tray only once the last item lands', () => {
        g().startLevel(lv({ tray: 3, items: [['a', 1], ['b', 1], ['c', 1]] }));
        pickLand('a'); pickLand('b'); g().pick('c', from);
        ok(g().pick('a', from) === false, 'pick refused when tray full');
        ok(g().status === 'playing', 'not lost while last item is flying');
        g().landed(g().tray.find(e => !e.landed).uid);
        ok(g().status === 'lost' && g().loseReason === 'tray', 'lose when the filling item lands');
    });

    it('a match in the last slot is safe', () => {
        g().startLevel(lv({ tray: 3 }));
        pickLand('a'); pickLand('a'); pickLand('a');
        ok(g().status === 'playing', 'match in last slot does not lose');
    });

    it('loses on time; retry resets', () => {
        g().startLevel(lv({ time: 1 }));
        g().tick(0.6); g().tick(0.6);
        ok(g().status === 'lost' && g().loseReason === 'time', 'lose when time runs out');
        const run = g().runId; g().retry();
        ok(g().status === 'playing' && g().runId === run + 1 && g().tray.length === 0, 'retry resets level');
    });

    it('pause stops the clock and taps, but flights still land and merge', () => {
        g().startLevel(lv({ time: 60 }));
        g().pick('a', from); g().pick('a', from); g().pick('a', from);
        g().pause();
        ok(g().status === 'paused', 'pause');
        g().tick(5);
        ok(g().timeLeft === 60, 'timer frozen while paused');
        ok(g().pick('b', from) === false, 'no picking while paused');
        g().tray.forEach(e => g().landed(e.uid));
        ok(g().tray.every(e => e.state === 'clearing'), 'flights still land and merge while paused');
        g().resume();
        ok(g().status === 'playing', 'resume');
    });

    it('stars and progress', async () => {
        ok(starsFor(30, 60) === 3 && starsFor(20, 60) === 2 && starsFor(5, 60) === 1, 'stars from time left');
        g().startLevel({ ...lv({ time: 100 }), id: 5 });
        ['a', 'a', 'a', 'b', 'b', 'b'].forEach(pickLand);
        g().tick(10);
        await wait(MERGE_MS + 50);
        ok(g().status === 'won' && g().result.stars === 3, 'win records 3 stars');
        ok(g().progress.unlocked === 6 && g().progress.stars[5] === 3, 'unlocks next level, saves stars');
        g().startLevel({ ...lv({ time: 100 }), id: 5 });
        ['a', 'a', 'a', 'b', 'b', 'b'].forEach(pickLand);
        g().tick(80);
        await wait(MERGE_MS + 50);
        ok(g().result.stars === 1 && g().progress.stars[5] === 3 && !g().result.best, 'replay keeps best stars');
    });
});

describe('boosters', () => {
    const ga = fakePile('a', 3), gb = fakePile('b', 3);
    let offs = [];

    it('use the saved stock', () => {
        offs = [registerGroup('a', ga), registerGroup('b', gb)];
        setStock({ undo: 2, magnet: 2, shuffle: 2, freeze: 2 });
        g().startLevel(lv());
        g().pick('a', from, 7); gb.left--; g().pick('b', from, 8);
        ok(g().useBooster('undo') && g().tray.length === 1 && gb.restored[0] === 8 && g().remaining === 5, 'undo returns the last picked item');
        ok(stock().undo === 1, 'undo spends from saved stock');
        ga.left = 2;
        ok(g().useBooster('magnet') && g().tray.filter(e => e.typeId === 'a').every(e => e.state === 'matched'), 'magnet completes the cheapest triplet');
        g().useBooster('shuffle');
        ok(ga.shuffled === 1 && gb.shuffled === 1, 'shuffle tosses every group');
        g().useBooster('freeze');
        const before = g().timeLeft; g().tick(4);
        ok(g().timeLeft === before && g().frozen === 6, 'freeze stops the timer');
        g().tick(7);
        ok(g().frozen === 0 && Math.abs(g().timeLeft - before) < 1e-9, 'freeze runs out before time resumes');
    });

    it('stock carries over between attempts', () => {
        g().retry();
        ok(stock().undo === 1 && stock().freeze === 1, 'not refilled by retrying');
        g().useBooster('freeze'); g().useBooster('freeze');
        ok(stock().freeze === 0 && !g().canUseBooster('freeze'), 'a booster runs out');
    });

    it('magnet refuses when the tray has no room', () => {
        setStock({ undo: 2, magnet: 2, shuffle: 2, freeze: 2 });
        g().startLevel(lv({ tray: 3, items: [['a', 1], ['b', 1], ['c', 1]] }));
        ga.left = 3; gb.left = 3;
        g().pick('b', from, 1); g().pick('c', from, 2);
        ok(!g().canUseBooster('magnet'), 'magnet disabled when a triplet will not fit');
    });

    it('continue is bought with coins, rising in price within a try', () => {
        setStock({ undo: 2, magnet: 2, shuffle: 2, freeze: 2 }, 0);
        g().startLevel(lv({ time: 1 }));
        g().tick(2);
        ok(g().continueGame() === false && g().status === 'lost', 'no coins: continue refused');
        setStock({ undo: 2, magnet: 2, shuffle: 2, freeze: 2 }, 200);
        ok(selectContinuePrice(g()) === ECONOMY.continuePrice, 'first continue costs the base price');
        g().continueGame();
        ok(g().status === 'playing' && g().timeLeft === 30 && selectCoins(g()) === 200 - ECONOMY.continuePrice, 'adds 30s and costs coins');
        ok(selectContinuePrice(g()) === ECONOMY.continuePrice + ECONOMY.continueStep, 'next continue costs more');
        g().tick(31);
        const second = selectContinuePrice(g());
        g().continueGame();
        ok(g().status === 'playing' && selectCoins(g()) === 200 - ECONOMY.continuePrice - second, 'a second continue works when affordable');
        g().tick(31);
        ok(g().continueGame() === false && g().status === 'lost', 'refused once coins run short');
        g().retry();
        ok(selectContinuePrice(g()) === ECONOMY.continuePrice, 'price resets on a new try');
        setStock({ undo: 2, magnet: 2, shuffle: 2, freeze: 2 }, 200);
        g().startLevel(lv({ tray: 3, items: [['a', 1], ['b', 1], ['c', 1]] }));
        pickLand('a'); pickLand('b'); pickLand('c');
        g().continueGame();
        ok(g().status === 'playing' && g().tray.length === 0 && g().remaining === 9, 'tray-full continue puts three items back');
        offs.forEach(off => off());
    });

    it('an empty stock is rescued at level start', () => {
        setStock({ undo: 0, magnet: 0, shuffle: 0, freeze: 0 });
        g().startLevel(lv());
        ok(Object.values(stock()).every(n => n === 1), 'empty stock topped up to 1 each');
        setStock({ undo: 0, magnet: 0, shuffle: 0, freeze: 2 });
        g().startLevel(lv());
        ok(stock().undo === 0 && stock().freeze === 2, 'partial stock is left alone');
    });
});

describe('economy', () => {
    const winLevel = async (extra) => {
        g().startLevel({ ...lv({ time: 100 }), ...extra });
        ['a', 'a', 'a', 'b', 'b', 'b'].forEach(pickLand);
        g().tick(g().frozen);                   // any streak freeze runs off first
        g().tick(extra.spend ?? 10);
        await wait(MERGE_MS + 50);
    };

    it('wins pay coins and boosters', async () => {
        S.setState(s => ({ progress: { ...s.progress, unlocked: 1, stars: {}, coins: 0, boosters: { undo: 0, magnet: 0, shuffle: 0, freeze: 1 } } }));
        await winLevel({ id: 10, tag: 'superHard' });
        ok(g().result.coins === 3 * ECONOMY.coinsPerNewStar + ECONOMY.firstClearBonus.superHard && selectCoins(g()) === 80, 'first super hard clear: 80 coins');
        ok(stock().undo === 1 && stock().magnet === 1 && stock().freeze === 2, 'super hard first clear gives one of every booster');
        await winLevel({ id: 10, tag: 'superHard' });
        ok(g().result.coins === 0 && selectCoins(g()) === 80 && stock().undo === 1, 'replaying for the same stars pays nothing');
        await winLevel({ id: 11, tag: 'normal', spend: 80 });
        ok(g().result.stars === 1 && g().result.coins === 10, 'new 1-star clear pays 10');
        await winLevel({ id: 11, tag: 'normal' });
        ok(g().result.coins === 20 && selectCoins(g()) === 110, 'improving 1 -> 3 stars pays for the 2 new stars');
        await winLevel({ id: 15, tag: 'hard' });
        ok(Object.values(g().result.boosters).reduce((a, b) => a + b, 0) === 1, 'hard first clear gives one random booster');
    });

    it('shop', () => {
        setStock({ undo: 0, magnet: 0, shuffle: 0, freeze: 0 }, 100);
        ok(g().buy('magnet') && selectCoins(g()) === 20 && stock().magnet === 1, 'buy a booster');
        ok(!g().buy('magnet') && selectCoins(g()) === 20, 'cannot buy without enough coins');
        setStock({ undo: 0, magnet: 0, shuffle: 0, freeze: 0 }, 200);
        ok(g().buy('bundle') && selectCoins(g()) === 20 && Object.values(stock()).every(n => n === 1), 'bundle gives one of each');
    });

    it('daily gift: once a day, consecutive days walk the calendar', () => {
        const day = (d) => new Date(2026, 0, d, 10);
        ok(dayKey(day(31)) === '2026-01-31' && dayKey(day(31), 1) === '2026-02-01', 'local day keys roll over months');
        setProg({ coins: 0, daily: { day: 0, last: null }, boosters: { undo: 0, magnet: 0, shuffle: 0, freeze: 0 } });
        ok(dailyStatus(g().progress.daily, day(1)).ready, 'a new player has a gift waiting');
        const r1 = g().claimDaily(day(1));
        ok(r1 === DAILY_REWARDS[0] && selectCoins(g()) === DAILY_REWARDS[0].coins, 'day 1 claimed');
        ok(g().claimDaily(new Date(2026, 0, 1, 23)) === null, 'only once per day');
        g().claimDaily(day(2)); g().claimDaily(day(3));
        ok(g().progress.daily.day === 3 && stock().freeze === 1, 'day 3 gives its freeze');
        g().claimDaily(day(5));
        ok(g().progress.daily.day === 1, 'missing a day starts over');
        for (let d = 6; d <= 11; d++) g().claimDaily(day(d));
        ok(g().progress.daily.day === 7 && stock().magnet === 1 && stock().undo === 1, 'day 7 is the big one');
        g().claimDaily(day(12));
        ok(g().progress.daily.day === 1, 'after day 7 it wraps to day 1');
    });

    it('star chest: every 20 stars', () => {
        const stars = (n) => Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, 1]));
        setProg({ coins: 0, stars: stars(STAR_CHEST.stars - 1), chests: 0, boosters: { undo: 0, magnet: 0, shuffle: 0, freeze: 0 } });
        ok(g().openChest() === null, 'not full yet');
        setProg({ coins: 0, stars: stars(STAR_CHEST.stars * 2 + 3), chests: 0, boosters: { undo: 0, magnet: 0, shuffle: 0, freeze: 0 } });
        const reward = g().openChest();
        ok(reward && selectCoins(g()) === STAR_CHEST.coins && Object.values(stock()).reduce((a, b) => a + b, 0) === STAR_CHEST.boosters, 'pays coins + boosters');
        ok(g().openChest() !== null && g().openChest() === null && g().progress.chests === 2, 'one chest per 20 stars');
    });
});

describe('saves', () => {
    it('v1 per-mode saves keep the furthest mode', () => withStorage((mem) => {
        mem['three-match-puzzle:progress'] = JSON.stringify({
            version: 1, lastMode: 'easy', settings: { sound: false }, modes: {
                easy: { unlocked: 12, stars: { 1: 3 }, coins: 40, boosters: { undo: 1 } },
                medium: { unlocked: 30, stars: { 1: 2, 29: 3 }, coins: 250, boosters: { undo: 5, magnet: 0, shuffle: 2, freeze: 1 } },
                hard: { unlocked: 4, stars: {}, coins: 0 },
            },
        });
        const migrated = loadProgress();
        ok(migrated.version === 2 && migrated.unlocked === 30 && migrated.coins === 250 && migrated.stars[29] === 3 && migrated.boosters.undo === 5 && migrated.settings.sound === false, 'migrates to the furthest mode');
        mem['three-match-puzzle:progress'] = JSON.stringify({ version: 1, lastMode: 'hard', modes: { easy: { unlocked: 5, coins: 1 }, hard: { unlocked: 5, coins: 2 } } });
        ok(loadProgress().coins === 2, 'tie goes to the last used mode');
    }));

    it('older saves get no backlog of star chests', () => withStorage((mem) => {
        const stars = Object.fromEntries(Array.from({ length: 50 }, (_, i) => [i + 1, 1]));
        mem['three-match-puzzle:progress'] = JSON.stringify({ version: 2, unlocked: 51, stars, coins: 0 });
        const p = loadProgress();
        ok(p.chests === 2 && p.daily.day === 0 && p.daily.last === null, 'chests counted from current stars; daily fresh');
    }));
});

describe('win streak', () => {
    const winFrontier = async () => {
        g().startLevel({ ...lv({ time: 100 }), id: g().progress.unlocked });
        ['a', 'a', 'a', 'b', 'b', 'b'].forEach(pickLand);
        await wait(MERGE_MS + 50);
    };

    it('stages', () => {
        ok(JSON.stringify(STREAK_STAGES.slice(1)) === JSON.stringify([{ freeze: 5 }, { freeze: 5, magnet: 1 }, { freeze: 10, magnet: 1 }, { freeze: 15, magnet: 1 }, { freeze: 15, magnet: 2 }]), 'table 5/5/10/15/15 s');
        ok(STREAK_STAGES.every(s => !('undo' in s) && !('shuffle' in s)), 'no undo/shuffle');
    });

    it('counts consecutive new-level wins', async () => {
        setProg({});
        g().startLevel({ ...lv(), id: 1 });
        ok(Object.keys(g().gift).length === 0 && g().frozen === 0, 'no streak: no head start');
        await winFrontier();
        ok(g().progress.streak === 1 && g().result.streak.to === 1, 'first new-level win starts the streak');
        for (let i = 0; i < 5; i++) await winFrontier();
        ok(g().progress.streak === 6, 'keeps counting past the top stage');
    });

    it('applies the head start right away, without touching stock', () => {
        const piles = [fakePile('a', 3), fakePile('b', 3), fakePile('c', 3)];
        const offs = piles.map(p => registerGroup(p.typeId, p));
        const top = STREAK_STAGES[5];
        const stockBefore = JSON.stringify(stock());
        g().startLevel({ ...lv({ time: 100, items: [['a', 1], ['b', 1], ['c', 1]] }), id: g().progress.unlocked });
        ok(JSON.stringify(g().gift) === JSON.stringify(top), 'top stage gift after 5+ wins');
        ok(g().frozen === top.freeze, 'freeze gift stops the clock from the start');
        g().tick(0.5);
        ok(g().tray.length === 0 && g().timeLeft === 100, 'nothing pulled before the pile drops');
        for (let i = 0; i < 40; i++) g().tick(0.1);
        ok(g().tray.filter(e => e.state === 'matched').length === 3 * top.magnet && g().remaining === 9 - 3 * top.magnet, 'each magnet pulls a triplet');
        ok(JSON.stringify(stock()) === stockBefore, 'booster stock untouched');
        ok(g().timeLeft === 100, 'clock still frozen');
        offs.forEach(off => off());
    });

    it('replays neither raise nor break it', () => {
        g().startLevel({ ...lv(), id: 3 });
        ok(Object.keys(g().gift).length === 0, 'replays get no head start');
        g().quitTo('map');
        ok(g().progress.streak === 6, 'quitting a replay keeps the streak');
    });

    it('giving up resets it; continuing keeps it', async () => {
        setProg({ unlocked: 5, streak: 3 });
        g().startLevel({ ...lv(), id: 5 });
        g().retry();
        ok(g().progress.streak === 0 && Object.keys(g().gift).length === 0, 'retrying a new level ends the streak');
        setProg({ unlocked: 5, streak: 3 });
        g().startLevel({ ...lv(), id: 5 });
        g().pause(); g().quitTo('home');
        ok(g().progress.streak === 0, 'quitting a new level ends the streak');
        setProg({ unlocked: 5, streak: 3, coins: 100 });
        g().startLevel({ ...lv({ time: 1 }), id: 5 });
        g().tick(40); g().tick(2); g().continueGame();
        ok(g().status === 'playing' && g().progress.streak === 3, 'continue keeps the streak');
        setProg({ unlocked: 5, streak: 4 });
        await winFrontier();
        g().retry();
        ok(g().progress.streak === 5, 'replaying after a win does not break it');
    });
});

describe('difficulty', () => {
    it('old Hard settings with 50% more items', () => {
        const r = resolveLevel({ id: 7, tag: 'normal', seed: 1, time: 100, items: [['sphere_red', 5], ['cube_blue', 5]] });
        ok(r.time === 75 && trip(r) === 18 && r.tray === DIFFICULTY.tray, 'time x0.75, items x1.8, 7 slots');
        ok(resolveLevel({ id: 10, tag: 'superHard', seed: 1, time: 100, items: [['sphere_red', 3]] }).tray === DIFFICULTY.superHardTray, 'super hard levels use 6 slots');
        ok(trip(resolveLevel({ id: 99, tag: 'normal', seed: 1, time: 200, items: [['sphere_red', 30], ['cube_blue', 10]] })) === LIMITS.triplets, 'capped at 180 items');
    });
});
