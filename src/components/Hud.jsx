import { useEffect } from "react";
import { useGameStore } from "../utils/store";
import { BoltIcon, PauseIcon, SkullIcon } from "./Icons";
import PauseMenu from "./PauseMenu";
import ResultModal from "./ResultModal";

const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

const Hud = () => {
    // Selectors return whole seconds so the HUD re-renders once per second, not every frame.
    const seconds = useGameStore(s => Math.ceil(s.timeLeft));
    const remaining = useGameStore(s => s.remaining);
    const total = useGameStore(s => s.total);
    const status = useGameStore(s => s.status);
    const level = useGameStore(s => s.level);
    const pause = useGameStore(s => s.pause);
    const resume = useGameStore(s => s.resume);

    // Escape toggles pause; leaving the tab pauses.
    useEffect(() => {
        const onKey = (e) => {
            if (e.key !== 'Escape') return;
            const { status } = useGameStore.getState();
            if (status === 'playing') pause();
            else if (status === 'paused') resume();
        };
        const onHide = () => { if (document.hidden) pause(); };
        window.addEventListener('keydown', onKey);
        document.addEventListener('visibilitychange', onHide);
        return () => {
            window.removeEventListener('keydown', onKey);
            document.removeEventListener('visibilitychange', onHide);
        };
    }, []);

    if (status === 'error') {
        return (
            <div className="hud">
                <div className="hud-overlay"><div className="hud-card"><h2>Couldn't load levels</h2></div></div>
            </div>
        );
    }
    if (!level) return <div className="hud"><div className="hud-loading">Loading…</div></div>;

    return (
        <div className="hud">
            <div className="hud-top">
                <div className="hud-group">
                    <button className="hud-pill hud-icon" onClick={pause} aria-label="Pause" disabled={status !== 'playing'}>
                        <PauseIcon size={18} />
                    </button>
                    <span className={`hud-pill hud-level is-${level.tag}`}>
                        {level.tag === 'hard' && <BoltIcon size={14} />}
                        {level.tag === 'superHard' && <SkullIcon size={14} />}
                        Level {level.id}
                    </span>
                </div>
                <span className={`hud-pill hud-timer ${seconds <= 10 ? 'is-low' : ''}`}>{formatTime(seconds)}</span>
                <div className="hud-group">
                    <span className="hud-pill">{total - remaining} / {total}</span>
                </div>
            </div>

            {status === 'loading' && <div className="hud-loading">Loading…</div>}
            {status === 'paused' && <PauseMenu />}
            {(status === 'won' || status === 'lost') && <ResultModal />}
        </div>
    );
};

export default Hud;
