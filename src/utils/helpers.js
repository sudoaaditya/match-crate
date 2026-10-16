const getDevicePixelRatio = () => {
    const isMobile = window.matchMedia('(pointer: coarse)').matches;
    return Math.min(isMobile ? 1.0 : 1.5, window.devicePixelRatio);
}

// Deterministic RNG (mulberry32) so a level's pile is identical on every play.
const createRng = (seed = 1) => {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
}

const randRange = (rng, min, max) => min + rng() * (max - min);

const isDebug = () => new URLSearchParams(window.location.search).has('debug');

// Height (px) of the HTML booster row that sits on top of the tray.
const BOOSTER_ROW = 64;
// Height (px) kept clear at the top of the screen for the HUD pills.
const HUD_TOP = 64;

/*
 * Tray size in screen pixels, shared by the tray overlay, the booster row and the camera
 * (which keeps the box clear of both). `y` is the tray centre from the screen centre,
 * `top` is the tray's top edge measured from the bottom of the screen.
 */
const trayMetrics = (width, height, capacity) => {
    const slot = Math.min(height * 0.12, (width * 0.94) / (capacity + 0.3));
    return {
        slot,
        y: -height / 2 + slot * 0.8,
        top: slot * 0.8 + slot * 0.625,
    };
}

// Screen rectangle (px from top-left) left for the box between the HUD and the tray + boosters.
const playRegion = (width, height, capacity) => ({
    left: 12,
    right: width - 12,
    top: HUD_TOP,
    bottom: height - trayMetrics(width, height, capacity).top - BOOSTER_ROW - 8,
});

/*
 * Box half-extents { x, z } for a level: same floor area as a square box of half-width
 * `half`, stretched toward the play region's shape (deeper on tall phones, wider on
 * landscape) so the pile fills the screen instead of leaving empty bands.
 */
const boxShape = (half, width, height, capacity) => {
    const r = playRegion(width, height, capacity);
    const ratio = Math.min(1.7, Math.max(0.7, (r.bottom - r.top) / (r.right - r.left)));
    const k = Math.sqrt(ratio);
    return { x: half / k, z: half * k };
}

export {
    getDevicePixelRatio,
    createRng,
    randRange,
    isDebug,
    BOOSTER_ROW,
    trayMetrics,
    playRegion,
    boxShape,
}
