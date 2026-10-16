import { create } from "zustand";

export const MATCH_SIZE = 3;
export const FLY_MS = 380;      // pile -> tray flight
export const POP_MS = 220;      // matched items shrinking away

let uid = 0;
let timers = [];
const later = (fn, ms) => timers.push(setTimeout(fn, ms));
const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

const activeCount = (tray) => tray.reduce((n, e) => n + (e.state === 'clearing' ? 0 : 1), 0);

/*
 * Tray entry: { uid, typeId, from: { position, quaternion }, state: 'active' | 'clearing', popAt? }
 * Entries stay in the array while their pop animation plays; layout ignores them for capacity.
 */
export const useGameStore = create((set, get) => ({
    status: 'idle',         // idle | playing | won | lost
    loseReason: null,       // 'time' | 'tray'
    level: null,
    runId: 0,               // bump to remount the physics scene
    timeLeft: 0,
    timeTotal: 0,
    trayCapacity: 7,
    total: 0,
    remaining: 0,           // items still in the pile
    tray: [],

    startLevel: (level) => {
        clearTimers();
        const total = level.items.reduce((sum, [, triplets]) => sum + triplets * MATCH_SIZE, 0);
        set(s => ({
            status: 'playing',
            loseReason: null,
            level,
            runId: s.runId + 1,
            timeLeft: level.time,
            timeTotal: level.time,
            trayCapacity: level.tray ?? 7,
            total,
            remaining: total,
            tray: [],
        }));
    },

    retry: () => {
        const { level, startLevel } = get();
        if (level) startLevel(level);
    },

    canPick: () => {
        const { status, tray, trayCapacity } = get();
        return status === 'playing' && activeCount(tray) < trayCapacity;
    },

    // Called by the pile when an item is tapped. Returns false if the tap is refused.
    pick: (typeId, from) => {
        if (!get().canPick()) return false;

        const tray = [...get().tray];
        const entry = { uid: ++uid, typeId, from, state: 'active' };

        // Group with identical items: insert right after the last active one of this type.
        let insertAt = tray.length;
        for (let i = tray.length - 1; i >= 0; i--) {
            if (tray[i].typeId === typeId && tray[i].state === 'active') { insertAt = i + 1; break; }
        }
        tray.splice(insertAt, 0, entry);

        const same = tray.filter(e => e.typeId === typeId && e.state === 'active');
        const matched = same.length >= MATCH_SIZE;

        if (matched) {
            const popAt = performance.now() + FLY_MS;
            const ids = new Set(same.slice(0, MATCH_SIZE).map(e => e.uid));
            for (let i = 0; i < tray.length; i++) {
                if (ids.has(tray[i].uid)) tray[i] = { ...tray[i], state: 'clearing', popAt };
            }
            later(() => get()._removeEntries(ids), FLY_MS + POP_MS);
        }

        set({ tray, remaining: get().remaining - 1 });

        if (!matched && activeCount(tray) >= get().trayCapacity) {
            later(() => get().lose('tray'), FLY_MS + 150);
        }
        return true;
    },

    _removeEntries: (ids) => {
        const tray = get().tray.filter(e => !ids.has(e.uid));
        set({ tray });
        if (get().status === 'playing' && get().remaining === 0 && tray.length === 0) {
            set({ status: 'won' });
        }
    },

    tick: (dt) => {
        const { status, timeLeft } = get();
        if (status !== 'playing') return;
        const next = Math.max(0, timeLeft - dt);
        set({ timeLeft: next });
        if (next === 0) get().lose('time');
    },

    lose: (reason) => {
        if (get().status !== 'playing') return;
        clearTimers();
        set({ status: 'lost', loseReason: reason });
    },
}));
