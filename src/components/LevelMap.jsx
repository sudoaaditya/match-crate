import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { loadLevels, MODES } from "../utils/levels";
import { totalStars } from "../utils/storage";
import { useGameStore } from "../utils/store";
import { BackIcon, BoltIcon, LockIcon, SkullIcon, StarIcon } from "./Icons";

const CHAPTER_SIZE = 20;

const Stars = ({ count }) => (
    <span className="node-stars">
        {[1, 2, 3].map(i => <StarIcon key={i} size={12} className={i <= count ? 'is-on' : ''} />)}
    </span>
);

const LevelNode = ({ level, stars, unlocked, current, onPlay }) => {
    const locked = level.id > unlocked;
    const classes = [
        'level-node',
        `is-${level.tag}`,
        locked && 'is-locked',
        current && 'is-current',
        stars > 0 && 'is-done',
    ].filter(Boolean).join(' ');

    return (
        <button
            className={classes}
            disabled={locked}
            onClick={() => onPlay(level.id)}
            data-level={level.id}
            aria-label={`Level ${level.id}${locked ? ', locked' : ''}${level.tag !== 'normal' ? `, ${level.tag === 'hard' ? 'hard' : 'super hard'}` : ''}`}
        >
            {level.tag === 'hard' && <span className="node-badge"><BoltIcon size={12} /></span>}
            {level.tag === 'superHard' && <span className="node-badge"><SkullIcon size={12} /></span>}
            <span className="node-circle">
                {locked ? <LockIcon size={18} /> : level.id}
            </span>
            {!locked && <Stars count={stars} />}
        </button>
    );
};

const LevelMap = () => {
    const mode = useGameStore(s => s.mode);
    const modeProgress = useGameStore(s => s.progress.modes[s.mode]);
    const setScreen = useGameStore(s => s.setScreen);
    const playLevel = useGameStore(s => s.playLevel);
    const [levels, setLevels] = useState(null);
    const [error, setError] = useState(false);
    const listRef = useRef(null);

    useEffect(() => {
        loadLevels().then(setLevels).catch(() => setError(true));
    }, []);

    const unlocked = modeProgress.unlocked;

    // Open with the next level to play in view.
    useLayoutEffect(() => {
        if (!levels) return;
        const node = listRef.current?.querySelector(`[data-level="${unlocked}"]`);
        node?.scrollIntoView({ block: 'center' });
    }, [levels]);

    const chapters = [];
    for (let i = 0; levels && i < levels.length; i += CHAPTER_SIZE) chapters.push(levels.slice(i, i + CHAPTER_SIZE));

    return (
        <div className="screen map">
            <header className="screen-header">
                <button className="icon-btn" onClick={() => setScreen('home')} aria-label="Back"><BackIcon /></button>
                <div className="map-title">
                    <h2>Levels</h2>
                    <button className="mode-chip" onClick={() => setScreen('modes')}>{MODES[mode].label}</button>
                </div>
                <span className="map-total"><StarIcon size={16} /> {totalStars(modeProgress)}</span>
            </header>

            <div className="map-list" ref={listRef}>
                {error && <p className="map-empty">Couldn't load levels.</p>}
                {chapters.map((chapter, idx) => (
                    <section className="chapter" key={idx}>
                        <h3>Chapter {idx + 1} <span>Levels {chapter[0].id}–{chapter.at(-1).id}</span></h3>
                        <div className="level-grid">
                            {chapter.map(level => (
                                <LevelNode
                                    key={level.id}
                                    level={level}
                                    stars={modeProgress.stars[level.id] ?? 0}
                                    unlocked={unlocked}
                                    current={level.id === unlocked}
                                    onPlay={(id) => playLevel(id, mode)}
                                />
                            ))}
                        </div>
                    </section>
                ))}
            </div>

            <footer className="map-legend">
                <span><span className="legend-dot is-hard"><BoltIcon size={11} /></span> Hard</span>
                <span><span className="legend-dot is-superHard"><SkullIcon size={11} /></span> Super hard</span>
            </footer>
        </div>
    );
};

export default LevelMap;
