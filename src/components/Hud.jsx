import { MODES } from "../utils/levels";
import { useGameStore } from "../utils/store";

const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

const TAG_LABELS = { hard: 'Hard', superHard: 'Super Hard' };

const Hud = () => {
    // Selectors return whole seconds so the HUD re-renders once per second, not every frame.
    const seconds = useGameStore(s => Math.ceil(s.timeLeft));
    const remaining = useGameStore(s => s.remaining);
    const total = useGameStore(s => s.total);
    const status = useGameStore(s => s.status);
    const loseReason = useGameStore(s => s.loseReason);
    const level = useGameStore(s => s.level);
    const levelCount = useGameStore(s => s.levelCount);
    const retry = useGameStore(s => s.retry);
    const nextLevel = useGameStore(s => s.nextLevel);

    if (status === 'error') {
        return <div className="hud"><div className="hud-overlay"><div className="hud-card"><h2>Couldn't load levels</h2></div></div></div>;
    }
    if (!level) return null;

    const tag = TAG_LABELS[level.tag];
    const hasNext = level.id < levelCount;

    return (
        <div className="hud">
            <div className="hud-top">
                <div className="hud-group">
                    <span className="hud-pill">Level {level.id}</span>
                    {tag && <span className={`hud-pill hud-tag is-${level.tag}`}>{tag}</span>}
                </div>
                <span className={`hud-pill hud-timer ${seconds <= 10 ? 'is-low' : ''}`}>{formatTime(seconds)}</span>
                <div className="hud-group">
                    <span className="hud-pill hud-mode">{MODES[level.mode].label}</span>
                    <span className="hud-pill">{total - remaining} / {total}</span>
                </div>
            </div>

            {(status === 'won' || status === 'lost') && (
                <div className="hud-overlay">
                    <div className="hud-card">
                        <h2>{status === 'won' ? 'Level complete!' : (loseReason === 'time' ? 'Out of time' : 'Tray full')}</h2>
                        <div className="hud-actions">
                            {status === 'won' && hasNext && (
                                <button className="hud-button" onClick={nextLevel}>Next level</button>
                            )}
                            <button className={`hud-button ${status === 'won' && hasNext ? 'is-secondary' : ''}`} onClick={retry}>
                                {status === 'won' ? 'Replay' : 'Retry'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Hud;
