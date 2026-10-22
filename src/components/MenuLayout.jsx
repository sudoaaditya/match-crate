import { selectCoins, useGameStore } from "../utils/store";
import { CoinIcon, HomeIcon, LevelsIcon, ShopIcon } from "./Icons";
import SoundToggle from "./SoundToggle";
import HomeScreen from "./HomeScreen";
import LevelMap from "./LevelMap";
import ShopScreen from "./ShopScreen";

const TABS = [
    { screen: 'shop', label: 'Shop', Icon: ShopIcon },
    { screen: 'home', label: 'Home', Icon: HomeIcon },
    { screen: 'map', label: 'Levels', Icon: LevelsIcon },
];

const CONTENT = { shop: ShopScreen, home: HomeScreen, map: LevelMap };

export const TopBar = () => {
    const coins = useGameStore(selectCoins);
    const setScreen = useGameStore(s => s.setScreen);
    return (
        <header className="top-bar">
            <span className="brand">
                <span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span>
                <span>Match <b>Crate</b></span>
            </span>
            <button className="coin-pill" onClick={() => setScreen('shop')} aria-label={`${coins} coins. Open shop`}>
                <CoinIcon size={22} />
                <span>{coins}</span>
            </button>
            <SoundToggle />
        </header>
    );
};

// Shop | Home | Levels, with the active tab raised (centre tab is home).
const BottomNav = ({ active }) => {
    const setScreen = useGameStore(s => s.setScreen);
    return (
        <nav className="bottom-nav" aria-label="Main">
            {TABS.map(({ screen, label, Icon }) => (
                <button
                    key={screen}
                    className={`nav-tab ${active === screen ? 'is-active' : ''}`}
                    onClick={() => setScreen(screen)}
                    aria-current={active === screen ? 'page' : undefined}
                >
                    <Icon size={26} />
                    <span>{label}</span>
                </button>
            ))}
        </nav>
    );
};

// Frame for the tabbed menu screens (plain HTML; the 3D game is a separate screen).
const MenuLayout = ({ screen }) => {
    const Content = CONTENT[screen];
    return (
        <div className="screen menu">
            <TopBar />
            <main className="menu-content">
                <Content />
            </main>
            <BottomNav active={screen} />
        </div>
    );
};

export default MenuLayout;
