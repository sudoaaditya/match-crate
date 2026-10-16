import { useGameStore } from "../utils/store";
import { SoundOffIcon, SoundOnIcon } from "./Icons";

const SoundToggle = ({ className = 'icon-btn' }) => {
    const sound = useGameStore(s => s.progress.settings.sound);
    const toggleSound = useGameStore(s => s.toggleSound);
    return (
        <button className={className} onClick={toggleSound} aria-label={sound ? 'Mute sound' : 'Unmute sound'} aria-pressed={!sound}>
            {sound ? <SoundOnIcon /> : <SoundOffIcon />}
        </button>
    );
};

export default SoundToggle;
