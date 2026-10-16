import { useGameStore } from "../utils/store";
import { StarIcon } from "./Icons";

const ResultModal = () => {
    const status = useGameStore(s => s.status);
    const loseReason = useGameStore(s => s.loseReason);
    const result = useGameStore(s => s.result);
    const level = useGameStore(s => s.level);
    const levelCount = useGameStore(s => s.levelCount);
    const timeLeft = useGameStore(s => Math.ceil(s.timeLeft));
    const continued = useGameStore(s => s.continued);
    const continueGame = useGameStore(s => s.continueGame);
    const retry = useGameStore(s => s.retry);
    const nextLevel = useGameStore(s => s.nextLevel);
    const quitToMap = useGameStore(s => s.quitToMap);

    const won = status === 'won';
    const hasNext = won && level.id < levelCount;

    return (
        <div className="hud-overlay">
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
                        <h2>{level.id === levelCount ? 'You beat every level!' : 'Level complete!'}</h2>
                        <p className="card-sub">
                            {timeLeft}s to spare{result.best ? ' · New best!' : ''}
                        </p>
                    </>
                ) : (
                    <>
                        <h2>{loseReason === 'time' ? 'Out of time' : 'Tray full'}</h2>
                        <p className="card-sub">
                            {loseReason === 'time' ? 'Clear the pile before the clock runs out.' : 'Match three of a kind before the tray fills up.'}
                        </p>
                    </>
                )}

                <div className="card-actions">
                    {hasNext && <button className="btn btn-primary" onClick={nextLevel}>Next level</button>}
                    {!won && !continued && (
                        <button className="btn btn-primary btn-continue" onClick={continueGame}>
                            {loseReason === 'time' ? '+30 seconds' : 'Clear 3 slots'}
                            <span className="btn-note">once per try</span>
                        </button>
                    )}
                    {!won && <button className={`btn ${continued ? 'btn-primary' : 'btn-secondary'}`} onClick={retry}>Retry</button>}
                    {won && <button className="btn btn-secondary" onClick={retry}>Replay</button>}
                    <button className="btn btn-ghost" onClick={quitToMap}>Level map</button>
                </div>
            </div>
        </div>
    );
};

export default ResultModal;
