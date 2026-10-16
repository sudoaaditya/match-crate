import { useGameStore } from "../utils/store";
import { PlayIcon } from "./Icons";
import SoundToggle from "./SoundToggle";
import ExitButtons from "./ExitButtons";

const PauseMenu = () => {
    const level = useGameStore(s => s.level);
    const resume = useGameStore(s => s.resume);
    const retry = useGameStore(s => s.retry);

    return (
        <div className="hud-overlay">
            <div className="hud-card">
                <div className="card-corner"><SoundToggle /></div>
                <p className="card-kicker">Level {level.id}</p>
                <h2>Paused</h2>
                <div className="card-actions is-stacked">
                    <button className="btn btn-primary" onClick={resume}><PlayIcon size={18} /> Resume</button>
                    <button className="btn btn-secondary" onClick={retry}>Restart level</button>
                </div>
                <ExitButtons />
            </div>
        </div>
    );
};

export default PauseMenu;
