// Tiny inline icons (no icon font or image downloads). All use currentColor.

const Svg = ({ size = 20, children, ...props }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>{children}</svg>
);

export const StarIcon = (props) => (
    <Svg {...props}><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z" /></Svg>
);

export const LockIcon = (props) => (
    <Svg {...props}><path d="M7 10V7.5a5 5 0 0 1 10 0V10h1a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1zm2 0h6V7.5a3 3 0 0 0-6 0z" /></Svg>
);

export const PauseIcon = (props) => (
    <Svg {...props}><rect x="6" y="5" width="4" height="14" rx="1.2" /><rect x="14" y="5" width="4" height="14" rx="1.2" /></Svg>
);

export const BackIcon = (props) => (
    <Svg {...props}><path d="M15.4 5.4L9 12l6.4 6.6-1.8 1.8L5.4 12l8.2-8.4z" /></Svg>
);

export const PlayIcon = (props) => (
    <Svg {...props}><path d="M8 5.2v13.6a1 1 0 0 0 1.5.9l10.6-6.8a1 1 0 0 0 0-1.7L9.5 4.3A1 1 0 0 0 8 5.2z" /></Svg>
);

// Hard levels
export const BoltIcon = (props) => (
    <Svg {...props}><path d="M13.5 2L4.8 13.4h6L9.9 22l8.9-11.6h-6.1z" /></Svg>
);

// Super hard levels
export const SkullIcon = (props) => (
    <Svg {...props}><path d="M12 2.5c-4.7 0-8.5 3.5-8.5 8 0 2.7 1.3 4.9 3.3 6.3V20a1.5 1.5 0 0 0 1.5 1.5h7.4a1.5 1.5 0 0 0 1.5-1.5v-3.2c2-1.4 3.3-3.6 3.3-6.3 0-4.5-3.8-8-8.5-8zM8.6 14.2a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm6.8 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4zM10.6 19v-2h1v2zm2 0v-2h1v2z" /></Svg>
);

/* ---------- boosters ---------- */

export const UndoIcon = (props) => (
    <Svg {...props}><path d="M9.5 5.5V2L3 7.5 9.5 13V9.5h4a4.5 4.5 0 0 1 0 9H8v3h5.5a7.5 7.5 0 0 0 0-15z" /></Svg>
);

export const MagnetIcon = (props) => (
    <Svg {...props}><path d="M4 3h5v8a3 3 0 0 0 6 0V3h5v8a8 8 0 0 1-16 0zm2 2v2h1V5zm10 0v2h1V5z" /></Svg>
);

export const ShuffleIcon = (props) => (
    <Svg {...props}><path d="M16 3h5v5l-1.8-1.8-3.6 3.6-1.4-1.4 3.6-3.6zM3 5.6L4.4 4.2 19.2 19 21 17.2V21h-4l1.8-1.8zm11.4 9.2l1.4-1.4 2.8 2.8L17.2 17.6zM4.4 19.8L3 18.4l5.4-5.4 1.4 1.4z" /></Svg>
);

export const FreezeIcon = (props) => (
    <Svg {...props}><path d="M11 2h2v4.2l2.3-2.3 1.4 1.4L13 9v2h2l3.7-3.7 1.4 1.4L17.8 11H22v2h-4.2l2.3 2.3-1.4 1.4L15 13h-2v2l3.7 3.7-1.4 1.4-2.3-2.3V22h-2v-4.2l-2.3 2.3-1.4-1.4L11 15v-2H9l-3.7 3.7-1.4-1.4L6.2 13H2v-2h4.2L3.9 8.7l1.4-1.4L9 11h2V9L7.3 5.3l1.4-1.4L11 6.2z" /></Svg>
);

/* ---------- sound ---------- */

export const SoundOnIcon = (props) => (
    <Svg {...props}><path d="M3 9v6h4l5 5V4L7 9zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z" /></Svg>
);

export const SoundOffIcon = (props) => (
    <Svg {...props}><path d="M3 9v6h4l5 5V4L7 9zm13.6 3l2.7-2.7-1.4-1.4-2.7 2.7-2.7-2.7-1.4 1.4 2.7 2.7-2.7 2.7 1.4 1.4 2.7-2.7 2.7 2.7 1.4-1.4z" /></Svg>
);

/* ---------- menus ---------- */

export const ShopIcon = (props) => (
    <Svg {...props}><path d="M7 7V6a5 5 0 0 1 10 0v1h3a1 1 0 0 1 1 1.1l-1.2 12A1 1 0 0 1 18.8 21H5.2a1 1 0 0 1-1-.9L3 8.1A1 1 0 0 1 4 7zm2 0h6V6a3 3 0 0 0-6 0zm-1 3a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm8 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2z" /></Svg>
);

export const HomeIcon = (props) => (
    <Svg {...props}><path d="M12 3.2l9 7.6-1.3 1.5L19 11.7V20a1 1 0 0 1-1 1h-4v-6h-4v6H6a1 1 0 0 1-1-1v-8.3l-.7.6L3 10.8z" /></Svg>
);

export const LevelsIcon = (props) => (
    <Svg {...props}><path d="M4 4h4v4H4zm6 0h4v4h-4zm6 0h4v4h-4zM4 10h4v4H4zm6 0h4v4h-4zm6 0h4v4h-4zM4 16h4v4H4zm6 0h4v4h-4zm6 0h4v4h-4z" /></Svg>
);

// Coin: drawn with its own colours so it reads as a coin anywhere.
export const CoinIcon = ({ size = 20, ...props }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...props}>
        <circle cx="12" cy="12" r="10" fill="#f5b82e" />
        <circle cx="12" cy="12" r="7.2" fill="#ffd166" stroke="#d99a1e" strokeWidth="1.4" />
        <path d="M12 8.2l1.2 2.5 2.7.3-2 1.9.5 2.7-2.4-1.3-2.4 1.3.5-2.7-2-1.9 2.7-.3z" fill="#d99a1e" />
    </svg>
);

export const ArrowDownIcon = (props) => (
    <Svg {...props}><path d="M11 4h2v11.2l4.6-4.6 1.4 1.4-7 7-7-7 1.4-1.4 4.6 4.6z" /></Svg>
);

// Daily gift: wrapped box with a bow.
export const GiftIcon = (props) => (
    <Svg {...props}><path d="M4 11h7v10H5a1 1 0 0 1-1-1zm9 0h7v9a1 1 0 0 1-1 1h-6zM3 7.5a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1V10H3zM11 6.5h2V10h-2zM12 6.3C10.6 3.6 8.4 2.6 7.3 3.5c-1.1.9-.4 2.8 2.2 3zm0 0c1.4-2.7 3.6-3.7 4.7-2.8 1.1.9.4 2.8-2.2 3z" /></Svg>
);

// Star chest: lid, body and clasp.
export const ChestIcon = (props) => (
    <Svg {...props}><path d="M5 4h14a2 2 0 0 1 2 2v4H3V6a2 2 0 0 1 2-2zM3 11.5h7.5V13a1.5 1.5 0 0 0 3 0v-1.5H21V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM11.2 9h1.6v4a.8.8 0 0 1-1.6 0z" /></Svg>
);
