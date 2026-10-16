import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

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

/**
 * Turns a loaded low-poly GLB scene into a single geometry that can be instanced:
 * every material's flat colour is baked into a vertex colour attribute, all parts
 * are merged, centred and scaled so the longest side equals `targetSize`.
 * `recolor` maps a material name prefix (e.g. "Green") to a replacement colour.
 */
const prepareModel = (scene, { targetSize = 1.25, recolor = {} } = {}) => {
    const parts = [];
    const color = new THREE.Color();
    scene.updateMatrixWorld(true);

    scene.traverse((child) => {
        if (!child.isMesh) return;
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        let geo = child.geometry.clone().applyMatrix4(child.matrixWorld);
        if (geo.index) geo = geo.toNonIndexed();

        // Support multi-material meshes by colouring per draw group.
        const groups = geo.groups.length ? geo.groups : [{ start: 0, count: geo.attributes.position.count, materialIndex: 0 }];
        const colors = new Float32Array(geo.attributes.position.count * 3);
        for (const group of groups) {
            const mat = materials[group.materialIndex] || materials[0];
            const prefix = (mat.name || '').split('_')[0];
            if (recolor[prefix]) color.set(recolor[prefix]);
            else color.copy(mat.color || color.set('#ffffff'));
            for (let i = group.start; i < group.start + group.count; i++) {
                colors[i * 3] = color.r;
                colors[i * 3 + 1] = color.g;
                colors[i * 3 + 2] = color.b;
            }
        }

        const clean = new THREE.BufferGeometry();
        clean.setAttribute('position', geo.attributes.position);
        clean.setAttribute('normal', geo.attributes.normal);
        clean.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        parts.push(clean);
        geo.dispose();
    });

    const merged = mergeGeometries(parts, false);
    parts.forEach(p => p.dispose());

    merged.computeBoundingBox();
    const box = merged.boundingBox;
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    merged.translate(-center.x, -center.y, -center.z);
    merged.scale(...Array(3).fill(targetSize / Math.max(size.x, size.y, size.z)));
    merged.computeBoundingBox();
    merged.computeBoundingSphere();

    return merged;
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
    prepareModel
}
