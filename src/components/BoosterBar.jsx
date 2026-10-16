import { useEffect, useState } from "react";
import { BOOSTER_ROW, trayMetrics } from "../utils/helpers";
import { BOOSTERS, useGameStore } from "../utils/store";
import { FreezeIcon, MagnetIcon, ShuffleIcon, UndoIcon } from "./Icons";

const INFO = {
    undo: { label: 'Undo', Icon: UndoIcon },
    magnet: { label: 'Magnet', Icon: MagnetIcon },
    shuffle: { label: 'Shuffle', Icon: ShuffleIcon },
    freeze: { label: 'Freeze', Icon: FreezeIcon },
};

const useViewport = () => {
    const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });
    useEffect(() => {
        const onResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);
    return size;
}

// Sits directly on top of the tray (same metrics the tray and camera use).
const BoosterBar = () => {
    const { width, height } = useViewport();
    const capacity = useGameStore(s => s.trayCapacity);
    const boosters = useGameStore(s => s.boosters);
    const useBooster = useGameStore(s => s.useBooster);
    const canUseBooster = useGameStore(s => s.canUseBooster);
    // Re-render when anything that affects availability changes.
    useGameStore(s => s.tray);
    useGameStore(s => s.status);
    useGameStore(s => s.remaining);

    const tray = trayMetrics(width, height, capacity);

    return (
        <div className="boosters" style={{ bottom: tray.top + 6, height: BOOSTER_ROW - 8 }}>
            {BOOSTERS.map(name => {
                const { label, Icon } = INFO[name];
                const left = boosters[name];
                return (
                    <button
                        key={name}
                        className={`booster is-${name}`}
                        disabled={!canUseBooster(name)}
                        onClick={() => useBooster(name)}
                        aria-label={`${label} (${left} left)`}
                        title={label}
                    >
                        <Icon size={24} />
                        <span className="booster-count">{left}</span>
                    </button>
                );
            })}
        </div>
    );
};

export default BoosterBar;
