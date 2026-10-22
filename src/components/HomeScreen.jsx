import { useEffect, useState } from "react";
import { levelTag, loadLevels } from "../utils/levels";
import { BOOSTERS, selectBoosters, useGameStore } from "../utils/store";
import { BoltIcon, FreezeIcon, MagnetIcon, PlayIcon, ShuffleIcon, SkullIcon, UndoIcon } from "./Icons";
import StreakMeter from "./StreakMeter";
import Perks from "./Perks";

const BOOSTER_ICONS = { undo: UndoIcon, magnet: MagnetIcon, shuffle: ShuffleIcon, freeze: FreezeIcon };

// The pile above the crate: CSS shapes, nothing to load.
const PILE = [
    { shape: 'circle', color: '#e63946', x: -38, y: 0, size: 46, delay: 0 },
    { shape: 'square', color: '#1982c4', x: 18, y: -6, size: 42, delay: 0.4 },
    { shape: 'ring', color: '#ffd166', x: -8, y: -44, size: 44, delay: 0.8 },
    { shape: 'circle', color: '#8ac926', x: 40, y: -40, size: 34, delay: 1.2 },
    { shape: 'square', color: '#ff70a6', x: -42, y: -48, size: 30, delay: 1.6 },
];

const TAG_INFO = {
    hard: { label: 'Hard level', Icon: BoltIcon },
    superHard: { label: 'Super hard', Icon: SkullIcon },
};

// Home tab: the next level to play, front and centre.
const HomeScreen = () => {
    const unlocked = useGameStore(s => s.progress.unlocked);
    const streak = useGameStore(s => s.progress.streak);
    const boosters = useGameStore(selectBoosters);
    const playLevel = useGameStore(s => s.playLevel);
    const setScreen = useGameStore(s => s.setScreen);
    const [levels, setLevels] = useState(null);

    useEffect(() => { loadLevels().then(setLevels).catch(() => { }); }, []);

    const current = unlocked;
    const currentTag = levels ? levelTag(levels, current) : null;
    const tag = TAG_INFO[currentTag];
    // Next super hard within the coming 10 levels (authored or generated).
    const nextSpecial = levels && Array.from({ length: 10 }, (_, i) => current + 1 + i).find(id => levelTag(levels, id) === 'superHard');

    return (
        <div className="home">
            <div className="home-stage">
                <div className="crate-pile" aria-hidden="true">
                    {PILE.map((p, i) => (
                        <span
                            key={i}
                            className={`pile-shape is-${p.shape}`}
                            style={{ '--c': p.color, '--x': `${p.x}px`, '--y': `${p.y}px`, width: p.size, height: p.size, animationDelay: `${p.delay}s` }}
                        />
                    ))}
                </div>
                <div className={`crate ${currentTag ? `is-${currentTag}` : ''}`}>
                    {tag && <span className="crate-ribbon"><tag.Icon size={14} /> {tag.label}</span>}
                    <span className="crate-number">{current}</span>
                    <span className="crate-label">Level</span>
                </div>
                <div className="crate-base" aria-hidden="true" />
            </div>

            {nextSpecial && (
                <p className="home-hint"><SkullIcon size={14} /> Super hard at level {nextSpecial}</p>
            )}

            <Perks />

            <StreakMeter streak={streak} />

            <button className="booster-strip" onClick={() => setScreen('shop')} aria-label="Your boosters. Open shop">
                {BOOSTERS.map(b => {
                    const Icon = BOOSTER_ICONS[b];
                    return (
                        <span key={b} className={`strip-item is-${b}`}>
                            <Icon size={20} />
                            <span>{boosters[b] ?? 0}</span>
                        </span>
                    );
                })}
            </button>

            <button className="btn btn-play" onClick={() => playLevel(current)}>
                <PlayIcon size={30} /> Play
            </button>
        </div>
    );
};

export default HomeScreen;
