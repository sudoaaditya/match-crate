import { selectCoins, selectContinuePrice, useGameStore } from "../utils/store";
import { CoinIcon, FreezeIcon, MagnetIcon, ShuffleIcon, StarIcon, UndoIcon } from "./Icons";
import ExitButtons from "./ExitButtons";
import StreakMeter from "./StreakMeter";
import { Confetti } from "./Effects";

const BOOSTER_ICONS = { undo: UndoIcon, magnet: MagnetIcon, shuffle: ShuffleIcon, freeze: FreezeIcon };

const ResultModal = () => {
    const status = useGameStore(s => s.status);
    const loseReason = useGameStore(s => s.loseReason);
    const result = useGameStore(s => s.result);
    const level = useGameStore(s => s.level);
    const timeLeft = useGameStore(s => Math.ceil(s.timeLeft));
    const price = useGameStore(selectContinuePrice);
    const coins = useGameStore(selectCoins);
    const continueGame = useGameStore(s => s.continueGame);
    const retry = useGameStore(s => s.retry);
    const nextLevel = useGameStore(s => s.nextLevel);
    const streak = useGameStore(s => s.progress.streak);
    const frontier = useGameStore(s => s.frontier);

    const won = status === 'won';
    const hasNext = won;
    const canContinue = coins >= price;

    return (
        <div className="hud-overlay">
            {won && <Confetti />}
            <div className={`hud-card result ${won ? 'is-won' : 'is-lost'}`}>
                {won ? (
                    <>
                        <div className="result-stars">
                            {[1, 2, 3].map(i => (
                                <span key={i} className={`result-star ${i <= result.stars ? 'is-on' : ''}`} style={{ animationDelay: `${0.15 + i * 0.18}s` }}>
                                    <StarIcon size={i === 2 ? 56 : 44} />
                                </span>
                            ))}
                        </div>
                        <h2>Level complete!</h2>
                        <p className="card-sub">
                            {timeLeft}s to spare{result.best ? ' · New best!' : ''}
                        </p>
                        {(result.coins > 0 || Object.keys(result.boosters ?? {}).length > 0) && (
                            <div className="result-rewards">
                                {result.coins > 0 && <span className="reward"><CoinIcon size={20} /> +{result.coins}</span>}
                                {Object.entries(result.boosters ?? {}).map(([b, n]) => {
                                    const Icon = BOOSTER_ICONS[b];
                                    return <span key={b} className={`reward is-${b}`}><Icon size={18} /> +{n}</span>;
                                })}
                            </div>
                        )}
                        {result.streak.to > result.streak.from && (
                            <StreakMeter streak={result.streak.to} from={result.streak.from} compact />
                        )}
                    </>
                ) : (
                    <>
                        <h2>{loseReason === 'time' ? 'Out of time' : 'Tray full'}</h2>
                        <p className="card-sub">
                            {loseReason === 'time' ? 'Clear the pile before the clock runs out.' : 'Match three of a kind before the tray fills up.'}
                        </p>
                        {frontier && streak > 0 && (
                            <p className="streak-warning">
                                Retry or leave and your win streak of {streak} ends. Continuing keeps it.
                            </p>
                        )}
                    </>
                )}

                <div className="card-actions">
                    {hasNext && <button className="btn btn-primary" onClick={nextLevel}>Next level</button>}
                    {!won && (
                        <button
                            className="btn btn-primary btn-continue"
                            onClick={continueGame}
                            disabled={!canContinue}
                            aria-label={`${loseReason === 'time' ? 'Add 30 seconds' : 'Clear 3 slots'} for ${price} coins`}
                        >
                            {loseReason === 'time' ? '+30 seconds' : 'Clear 3 slots'}
                            {canContinue
                                ? <span className="btn-price"><CoinIcon size={14} /> {price}</span>
                                : <span className="btn-note">need {price - coins} more coins</span>}
                        </button>
                    )}
                    {!won && <button className={`btn ${canContinue ? 'btn-secondary' : 'btn-primary'}`} onClick={retry}>Retry</button>}
                    {won && <button className="btn btn-secondary" onClick={retry}>Replay</button>}
                </div>
                <ExitButtons />
            </div>
        </div>
    );
};

export default ResultModal;
