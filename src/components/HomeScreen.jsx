import { MODES } from "../utils/levels";
import { useGameStore } from "../utils/store";
import { PlayIcon } from "./Icons";
import SoundToggle from "./SoundToggle";

// Decorative floating shapes: pure CSS, nothing to load.
const FLOATERS = [
    { shape: 'circle', color: '#e63946', x: 12, y: 18, size: 54, delay: 0 },
    { shape: 'square', color: '#1982c4', x: 80, y: 14, size: 44, delay: 1.2 },
    { shape: 'ring', color: '#ffd166', x: 70, y: 70, size: 60, delay: 0.6 },
    { shape: 'circle', color: '#8ac926', x: 18, y: 76, size: 38, delay: 1.8 },
    { shape: 'square', color: '#ff70a6', x: 88, y: 46, size: 30, delay: 2.4 },
    { shape: 'ring', color: '#2a9d8f', x: 6, y: 48, size: 34, delay: 3 },
];

const HomeScreen = () => {
    const progress = useGameStore(s => s.progress);
    const mode = useGameStore(s => s.mode);
    const setScreen = useGameStore(s => s.setScreen);

    // First visit: choose a mode before anything else. Later: straight to the map.
    const hasMode = !!progress.lastMode;

    return (
        <div className="screen home">
            {FLOATERS.map((f, i) => (
                <span
                    key={i}
                    className={`floater is-${f.shape}`}
                    style={{ left: `${f.x}%`, top: `${f.y}%`, width: f.size, height: f.size, '--c': f.color, animationDelay: `${f.delay}s` }}
                />
            ))}

            <div className="home-corner"><SoundToggle /></div>

            <div className="home-content">
                <h1 className="home-title">
                    <span>Three</span>
                    <span className="home-title-accent">Match</span>
                </h1>
                <p className="home-tagline">Tap. Collect. Match three.</p>

                <button className="btn btn-primary btn-large" onClick={() => setScreen(hasMode ? 'map' : 'modes')}>
                    <PlayIcon size={24} /> Play
                </button>

                {hasMode && (
                    <button className="btn btn-ghost" onClick={() => setScreen('modes')}>
                        Mode: {MODES[mode].label}
                    </button>
                )}
            </div>
        </div>
    );
};

export default HomeScreen;
