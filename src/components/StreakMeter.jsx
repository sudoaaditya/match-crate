import { MAX_STREAK, streakBoosters, streakStage } from "../utils/economy";
import { FreezeIcon, MagnetIcon } from "./Icons";

// Streak head start: freeze is clock seconds, magnet the triplets pulled.
const GIFTS = {
    freeze: { Icon: FreezeIcon, text: (n) => `${n}s`, label: (n) => `clock frozen for ${n} seconds` },
    magnet: { Icon: MagnetIcon, text: (n) => n > 1 ? `×${n}` : '', label: (n) => `${n} magnet${n > 1 ? 's' : ''}` },
};

export const BoosterGifts = ({ gifts }) => (
    <span className="streak-gifts">
        {Object.entries(gifts).map(([b, n]) => {
            const { Icon, text, label } = GIFTS[b];
            return <span key={b} className={`gift is-${b}`} title={label(n)}><Icon size={16} />{text(n) && <b>{text(n)}</b>}</span>;
        })}
    </span>
);

// Five pips for the win streak, plus what the next new level starts with.
// `from` animates the pips gained on the result card.
const StreakMeter = ({ streak, from = streak, compact = false }) => {
    const stage = streakStage(streak);
    const before = streakStage(from);
    const gifts = streakBoosters(streak);
    const hasGifts = Object.keys(gifts).length > 0;
    return (
        <div className={`streak ${compact ? 'is-compact' : ''}`}>
            <div className="streak-head">
                <span className="streak-title">Win streak</span>
                <span className="streak-pips" aria-label={`Win streak ${stage} of ${MAX_STREAK}`}>
                    {Array.from({ length: MAX_STREAK }, (_, i) => (
                        <span key={i} className={`pip ${i < stage ? 'is-on' : ''} ${i >= before && i < stage ? 'is-new' : ''}`} />
                    ))}
                </span>
                {streak > MAX_STREAK && <span className="streak-count">{streak}</span>}
            </div>
            {!compact && (
                <div className="streak-body">
                    {hasGifts
                        ? <>Next new level starts with <BoosterGifts gifts={gifts} /></>
                        : 'Win new levels in a row for a head start'}
                </div>
            )}
        </div>
    );
};

export default StreakMeter;
