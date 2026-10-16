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
