import { useState } from "react";
import { ECONOMY } from "../utils/economy";
import { BOOSTERS, selectBoosters, selectCoins, useGameStore } from "../utils/store";
import { CoinIcon, FreezeIcon, MagnetIcon, ShuffleIcon, UndoIcon } from "./Icons";

const INFO = {
    undo: { label: 'Undo', blurb: 'Put the last item back in the pile.', Icon: UndoIcon },
    magnet: { label: 'Magnet', blurb: 'Pull in a full set of three.', Icon: MagnetIcon },
    shuffle: { label: 'Shuffle', blurb: 'Toss the whole pile around.', Icon: ShuffleIcon },
    freeze: { label: 'Freeze', blurb: `Stop the clock for 10 seconds.`, Icon: FreezeIcon },
};

const Price = ({ value }) => <span className="price"><CoinIcon size={18} /> {value}</span>;

// Shop tab: spend coins (earned from stars and special levels) on boosters.
const ShopScreen = () => {
    const coins = useGameStore(selectCoins);
    const stock = useGameStore(selectBoosters);
    const buy = useGameStore(s => s.buy);
    const [flash, setFlash] = useState(null);

    const purchase = (item) => {
        if (buy(item)) {
            setFlash(item);
            setTimeout(() => setFlash(f => (f === item ? null : f)), 600);
        }
    };

    const bundleValue = BOOSTERS.reduce((sum, b) => sum + ECONOMY.prices[b] * (ECONOMY.bundle.boosters[b] ?? 0), 0);

    return (
        <div className="shop">
            <h2 className="tab-title">Shop</h2>
            <p className="shop-sub">Earn coins with new stars, hard levels, daily gifts and star chests.</p>

            <button
                className={`shop-bundle ${flash === 'bundle' ? 'is-bought' : ''}`}
                disabled={coins < ECONOMY.bundle.price}
                onClick={() => purchase('bundle')}
            >
                <span className="bundle-tag">Save {Math.round((1 - ECONOMY.bundle.price / bundleValue) * 100)}%</span>
                <span className="bundle-title">Booster bundle</span>
                <span className="bundle-icons">
                    {BOOSTERS.map(b => { const Icon = INFO[b].Icon; return <span key={b} className={`is-${b}`}><Icon size={22} /></span>; })}
                </span>
                <Price value={ECONOMY.bundle.price} />
            </button>

            <div className="shop-grid">
                {BOOSTERS.map(b => {
                    const { label, blurb, Icon } = INFO[b];
                    const price = ECONOMY.prices[b];
                    return (
                        <button
                            key={b}
                            className={`shop-item is-${b} ${flash === b ? 'is-bought' : ''}`}
                            disabled={coins < price}
                            onClick={() => purchase(b)}
                            aria-label={`Buy ${label} for ${price} coins. You have ${stock[b] ?? 0}.`}
                        >
                            <span className="shop-owned">×{stock[b] ?? 0}</span>
                            <span className="shop-icon"><Icon size={34} /></span>
                            <span className="shop-name">{label}</span>
                            <span className="shop-blurb">{blurb}</span>
                            <Price value={price} />
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default ShopScreen;
