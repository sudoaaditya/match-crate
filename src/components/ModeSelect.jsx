import { useEffect, useState } from "react";
import { loadLevels, MODES } from "../utils/levels";
import { completedCount, totalStars } from "../utils/storage";
import { useGameStore } from "../utils/store";
import { BackIcon, StarIcon } from "./Icons";

const DETAILS = {
    easy: { blurb: 'Relaxed. More time, fewer items and an extra tray slot.', accent: '#8ac926' },
    medium: { blurb: 'The intended challenge. Every level as designed.', accent: '#ffd166' },
    hard: { blurb: 'Less time, more items. Super hard levels shrink the tray.', accent: '#e63946' },
};

const ModeSelect = () => {
    const progress = useGameStore(s => s.progress);
    const current = useGameStore(s => s.mode);
    const selectMode = useGameStore(s => s.selectMode);
    const setScreen = useGameStore(s => s.setScreen);
    const [levelCount, setLevelCount] = useState(100);

    useEffect(() => { loadLevels().then(l => setLevelCount(l.length)).catch(() => { }); }, []);

    return (
        <div className="screen modes">
            <header className="screen-header">
                <button className="icon-btn" onClick={() => setScreen('home')} aria-label="Back"><BackIcon /></button>
                <h2>Choose a mode</h2>
                <span className="icon-btn-spacer" />
            </header>

            <div className="mode-list">
                {Object.entries(MODES).map(([key, mode]) => {
                    const p = progress.modes[key];
                    const done = completedCount(p);
                    return (
                        <button
                            key={key}
                            className={`mode-card ${progress.lastMode && key === current ? 'is-current' : ''}`}
                            style={{ '--accent': DETAILS[key].accent }}
                            onClick={() => selectMode(key)}
                        >
                            <span className="mode-name">{mode.label}</span>
                            <span className="mode-blurb">{DETAILS[key].blurb}</span>
                            <span className="mode-stats">
                                <span>{done} / {levelCount} levels</span>
                                <span className="mode-stars"><StarIcon size={14} /> {totalStars(p)}</span>
                            </span>
                            <span className="mode-bar"><span style={{ width: `${(done / levelCount) * 100}%` }} /></span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default ModeSelect;
