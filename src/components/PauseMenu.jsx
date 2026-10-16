import { MODES } from "../utils/levels";
import { useGameStore } from "../utils/store";
import { PlayIcon } from "./Icons";

const PauseMenu = () => {
    const level = useGameStore(s => s.level);
    const resume = useGameStore(s => s.resume);
    const retry = useGameStore(s => s.retry);
    const quitToMap = useGameStore(s => s.quitToMap);

    return (
        <div className="hud-overlay">
            <div className="hud-card">
                <p className="card-kicker">{MODES[level.mode].label} · Level {level.id}</p>
                <h2>Paused</h2>
                <div className="card-actions is-stacked">
                    <button className="btn btn-primary" onClick={resume}><PlayIcon size={18} /> Resume</button>
                    <button className="btn btn-secondary" onClick={retry}>Restart level</button>
                    <button className="btn btn-ghost" onClick={quitToMap}>Level map</button>
                </div>
            </div>
        </div>
    );
};

export default PauseMenu;
