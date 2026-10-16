import { useGameStore } from "../utils/store";

const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

const Hud = () => {
    // Selectors return whole seconds so the HUD re-renders once per second, not every frame.
    const seconds = useGameStore(s => Math.ceil(s.timeLeft));
    const remaining = useGameStore(s => s.remaining);
    const total = useGameStore(s => s.total);
    const status = useGameStore(s => s.status);
    const loseReason = useGameStore(s => s.loseReason);
    const levelId = useGameStore(s => s.level?.id);
    const retry = useGameStore(s => s.retry);

    if (status === 'idle') return null;

    return (
        <div className="hud">
            <div className="hud-top">
                <span className="hud-pill">Level {levelId}</span>
                <span className={`hud-pill hud-timer ${seconds <= 10 ? 'is-low' : ''}`}>{formatTime(seconds)}</span>
                <span className="hud-pill">{total - remaining} / {total}</span>
            </div>

            {(status === 'won' || status === 'lost') && (
                <div className="hud-overlay">
                    <div className="hud-card">
                        <h2>{status === 'won' ? 'Level complete!' : (loseReason === 'time' ? 'Out of time' : 'Tray full')}</h2>
                        <button className="hud-button" onClick={retry}>
                            {status === 'won' ? 'Play again' : 'Retry'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Hud;
