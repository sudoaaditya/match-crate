import { useEffect } from "react";
import { useGameStore } from "../utils/store";
import { startMusic, stopMusic } from "../utils/sfx";
import { BoltIcon, FreezeIcon, PauseIcon, SkullIcon } from "./Icons";
import BoosterBar from "./BoosterBar";
import PauseMenu from "./PauseMenu";
import ResultModal from "./ResultModal";
import { BoosterGifts } from "./StreakMeter";
import { MatchBursts } from "./Effects";

const GIFT_BANNER_SECONDS = 3;

const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

const Hud = () => {
    // Selectors return whole seconds so the HUD re-renders once per second, not every frame.
    const seconds = useGameStore(s => Math.ceil(s.timeLeft));
    const remaining = useGameStore(s => s.remaining);
    const total = useGameStore(s => s.total);
    const status = useGameStore(s => s.status);
    const level = useGameStore(s => s.level);
    const frozen = useGameStore(s => s.frozen > 0);
    const gift = useGameStore(s => s.gift);
    const showGift = useGameStore(s => s.played < GIFT_BANNER_SECONDS && Object.keys(s.gift).length > 0);
    const pause = useGameStore(s => s.pause);
    const resume = useGameStore(s => s.resume);

    // Music only while a level is actually running (and sound is on).
    const sound = useGameStore(s => s.progress.settings.sound);
    useEffect(() => {
        if (status === 'playing' && sound) startMusic();
        else stopMusic();
    }, [status, sound]);
    useEffect(() => stopMusic, []);

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
                <span className={`hud-pill hud-timer ${frozen ? 'is-frozen' : seconds <= 10 ? 'is-low' : ''}`}>
                    {frozen && <FreezeIcon size={14} />}
                    {formatTime(seconds)}
                </span>
                <div className="hud-group">
                    <span className="hud-pill">{total - remaining} / {total}</span>
                </div>
            </div>

            {status === 'playing' && showGift && (
                <div className="streak-banner" role="status">
                    <span className="streak-banner-title">Win streak bonus</span>
                    <BoosterGifts gifts={gift} />
                </div>
            )}
            <MatchBursts />
            {(status === 'playing' || status === 'paused') && <BoosterBar />}
            {status === 'loading' && <div className="hud-loading">Loading…</div>}
            {status === 'paused' && <PauseMenu />}
            {(status === 'won' || status === 'lost') && <ResultModal />}
        </div>
    );
};

export default Hud;
