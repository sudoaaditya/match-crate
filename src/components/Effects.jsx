import { useEffect, useMemo, useState } from "react";
import { trayMetrics } from "../utils/helpers";
import { useGameStore } from "../utils/store";

const COLORS = ['#4fd1ec', '#f0495f', '#ffa25f', '#f472b6', '#ffd166'];
const SPARKS = 12;
const BURST_MS = 900;

// Clearing entries in the tray, grouped by match: { matchId: [tray indexes] }.
const clearingGroups = (tray) => {
    const groups = new Map();
    tray.forEach((e, i) => {
        if (e.state !== 'clearing') return;
        if (!groups.has(e.matchId)) groups.set(e.matchId, []);
        groups.get(e.matchId).push(i);
    });
    return groups;
};

/*
 * A spark burst over the tray where each triplet pops. Plain HTML over the canvas: it
 * follows the same slot maths as the tray (helpers.trayMetrics, Tray's layout) and
 * centres on the item the triplet converges on.
 */
export const MatchBursts = () => {
    const [bursts, setBursts] = useState([]);

    useEffect(() => useGameStore.subscribe((state, prev) => {
        if (state.tray === prev.tray) return;
        const before = clearingGroups(prev.tray);
        const fresh = [...clearingGroups(state.tray)].filter(([id]) => !before.has(id));
        if (!fresh.length) return;

        const { innerWidth: w, innerHeight: h } = window;
        const capacity = state.trayCapacity;
        const m = trayMetrics(w, h, capacity);
        const columns = Math.max(capacity, state.tray.length);
        const spacing = (m.slot * capacity) / columns;
        const added = fresh.map(([id, idx], n) => ({
            id,
            x: w / 2 + (idx[Math.floor(idx.length / 2)] - (columns - 1) / 2) * spacing,
            y: m.slot * 0.8,
            size: m.slot,
            color: COLORS[(id + n) % COLORS.length],
        }));
        setBursts(b => [...b, ...added]);
        added.forEach(a => setTimeout(() => setBursts(b => b.filter(x => x.id !== a.id)), BURST_MS));
    }), []);

    return bursts.map(b => (
        <div key={b.id} className="burst" style={{ left: b.x, bottom: b.y, '--c': b.color, '--r': `${b.size * 0.75}px` }} aria-hidden="true">
            <span className="burst-ring" />
            {Array.from({ length: SPARKS }, (_, i) => (
                <span key={i} className="spark" style={{ '--a': `${(360 / SPARKS) * i + (i % 2) * 12}deg`, '--k': i % 3 === 0 ? 1 : 0.7 }} />
            ))}
        </div>
    ));
};

// Falling confetti behind the win card.
export const Confetti = ({ pieces = 40 }) => {
    const bits = useMemo(() => Array.from({ length: pieces }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 1.8 + Math.random() * 1.4,
        drift: (Math.random() - 0.5) * 120,
        spin: (Math.random() < 0.5 ? -1 : 1) * (360 + Math.random() * 540),
        color: COLORS[i % COLORS.length],
        round: i % 3 === 0,
    })), [pieces]);

    return (
        <div className="confetti" aria-hidden="true">
            {bits.map((b, i) => (
                <span
                    key={i}
                    className={b.round ? 'is-round' : ''}
                    style={{
                        left: `${b.left}%`,
                        background: b.color,
                        animationDelay: `${b.delay}s`,
                        animationDuration: `${b.duration}s`,
                        '--drift': `${b.drift}px`,
                        '--spin': `${b.spin}deg`,
                    }}
                />
            ))}
        </div>
    );
};
