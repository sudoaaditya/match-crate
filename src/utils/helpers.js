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
    prepareModel
}
