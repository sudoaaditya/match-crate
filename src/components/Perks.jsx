import { useEffect, useState } from "react";
import { chestStatus, DAILY_REWARDS, dailyStatus, STAR_CHEST } from "../utils/economy";
import { totalStars } from "../utils/storage";
import { useGameStore } from "../utils/store";
import { ChestIcon, CoinIcon, FreezeIcon, GiftIcon, MagnetIcon, ShuffleIcon, StarIcon, UndoIcon } from "./Icons";

const BOOSTER_ICONS = { undo: UndoIcon, magnet: MagnetIcon, shuffle: ShuffleIcon, freeze: FreezeIcon };

// Coins and boosters, as on the win card.
const RewardItems = ({ reward, size = 20 }) => (
    <div className="result-rewards">
        <span className="reward"><CoinIcon size={size} /> +{reward.coins}</span>
        {Object.entries(reward.boosters ?? {}).map(([b, n]) => {
            const Icon = BOOSTER_ICONS[b];
            return <span key={b} className={`reward is-${b}`}><Icon size={size - 2} /> +{n}</span>;
        })}
    </div>
);

const Sheet = ({ onClose, children }) => (
    <div className="sheet-overlay" onClick={onClose}>
        <div className="hud-card sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
            {children}
        </div>
    </div>
);

const DailySheet = ({ onClose }) => {
    const daily = useGameStore(s => s.progress.daily);
    const claimDaily = useGameStore(s => s.claimDaily);
    const [claimed, setClaimed] = useState(null);
    // Freeze the calendar as it was when opened, so it doesn't jump on claim.
    const [status] = useState(() => dailyStatus(daily));

    return (
        <Sheet onClose={onClose}>
            <p className="card-kicker">Day {status.day} of {DAILY_REWARDS.length}</p>
            <h2>Daily gift</h2>
            <p className="card-sub">Come back every day: the gifts grow, and day 7 is the big one. Miss a day and it starts over.</p>
            <ol className="daily-grid">
                {DAILY_REWARDS.map((r, i) => {
                    const day = i + 1;
                    const done = day < status.day || (day === status.day && (!status.ready || claimed));
                    const today = day === status.day;
                    return (
                        <li key={day} className={`daily-day ${done ? 'is-done' : ''} ${today ? 'is-today' : ''} ${day === DAILY_REWARDS.length ? 'is-big' : ''}`}>
                            <span className="daily-label">Day {day}</span>
                            <span className="daily-coins"><CoinIcon size={16} />{r.coins}</span>
                            {r.boosters && (
                                <span className="daily-boosters">
                                    {Object.keys(r.boosters).map(b => { const Icon = BOOSTER_ICONS[b]; return <span key={b} className={`is-${b}`}><Icon size={14} /></span>; })}
                                </span>
                            )}
                        </li>
                    );
                })}
            </ol>
            {claimed && <RewardItems reward={claimed} />}
            <div className="card-actions">
                {status.ready && !claimed
                    ? <button className="btn btn-primary" onClick={() => setClaimed(claimDaily())}>Claim</button>
                    : <button className="btn btn-secondary" onClick={onClose}>{claimed ? 'Nice!' : 'Come back tomorrow'}</button>}
            </div>
        </Sheet>
    );
};

const ChestSheet = ({ onClose }) => {
    const stars = useGameStore(s => totalStars(s.progress));
    const opened = useGameStore(s => s.progress.chests);
    const openChest = useGameStore(s => s.openChest);
    const [reward, setReward] = useState(null);
    const status = chestStatus(stars, opened);

    return (
        <Sheet onClose={onClose}>
            <span className={`chest-art ${status.ready || reward ? 'is-ready' : ''} ${reward ? 'is-open' : ''}`}><ChestIcon size={72} /></span>
            <h2>Star chest</h2>
            <p className="card-sub">
                Every {STAR_CHEST.stars} stars you earn fill a chest with coins and boosters. Replays count when you beat your best.
            </p>
            {reward
                ? <RewardItems reward={reward} />
                : <ChestMeter status={status} />}
            <div className="card-actions">
                {status.ready && !reward
                    ? <button className="btn btn-primary" onClick={() => setReward(openChest())}>Open</button>
                    : <button className="btn btn-secondary" onClick={onClose}>{reward ? 'Collect' : 'Keep playing'}</button>}
            </div>
        </Sheet>
    );
};

const ChestMeter = ({ status }) => (
    <span className="chest-meter" aria-label={`${status.stars} of ${STAR_CHEST.stars} stars`}>
        <span className="chest-bar"><span style={{ width: `${(status.stars / STAR_CHEST.stars) * 100}%` }} /></span>
        <span className="chest-count"><StarIcon size={14} /> {status.stars}/{STAR_CHEST.stars}</span>
    </span>
);

// The daily gift pops up by itself once per app launch when it's ready.
let dailyShown = false;

// Home row: daily gift + star chest tiles, each opening its sheet.
const Perks = () => {
    const daily = useGameStore(s => s.progress.daily);
    const stars = useGameStore(s => totalStars(s.progress));
    const opened = useGameStore(s => s.progress.chests);
    const [open, setOpen] = useState(null);
    const day = dailyStatus(daily);
    const chest = chestStatus(stars, opened);

    useEffect(() => {
        if (!dailyShown && day.ready) setOpen('daily');
        dailyShown = true;
    }, []);

    return (
        <>
            <div className="perks">
                <button className={`perk is-daily ${day.ready ? 'is-ready' : ''}`} onClick={() => setOpen('daily')}>
                    <GiftIcon size={26} />
                    <span className="perk-text">
                        <b>Daily gift</b>
                        <span>{day.ready ? `Day ${day.day} ready!` : 'Back tomorrow'}</span>
                    </span>
                </button>
                <button className={`perk is-chest ${chest.ready ? 'is-ready' : ''}`} onClick={() => setOpen('chest')}>
                    <ChestIcon size={26} />
                    <span className="perk-text">
                        <b>Star chest</b>
                        {chest.ready ? <span>Ready to open!</span> : <ChestMeter status={chest} />}
                    </span>
                </button>
            </div>
            {open === 'daily' && <DailySheet onClose={() => setOpen(null)} />}
            {open === 'chest' && <ChestSheet onClose={() => setOpen(null)} />}
        </>
    );
};

export default Perks;
