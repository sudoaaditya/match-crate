import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { getItem, TEXTURES } from "../utils/catalog";
import { palette } from "../utils/colors";

/*
 * Everything that turns catalog entries into three.js objects. Lives with the 3D code
 * (not in utils/catalog.js) so the menus, which only need the catalog data, don't pull
 * three.js into the first download.
 *
 * One geometry and one material per item type, created on first use and shared by
 * the pile and the tray.
 */

// Geometry factories per catalog shape, all roughly 0.8–0.9 units across.
const SHAPE_GEOMETRY = {
    sphere: () => new THREE.SphereGeometry(0.42, 16, 12),
    cube: () => new THREE.BoxGeometry(0.75, 0.75, 0.75),
    slab: () => new THREE.BoxGeometry(0.9, 0.25, 0.6),
    cylinder: () => new THREE.CylinderGeometry(0.32, 0.32, 0.8, 16),
    cone: () => new THREE.ConeGeometry(0.4, 0.85, 16),
    torus: () => new THREE.TorusGeometry(0.3, 0.13, 8, 20),
    capsule: () => new THREE.CapsuleGeometry(0.22, 0.45, 4, 12),
    octahedron: () => new THREE.OctahedronGeometry(0.45),
    dodecahedron: () => new THREE.DodecahedronGeometry(0.42),
};

const geometries = new Map();
const materials = new Map();
const textures = new Map();
const textureLoader = new THREE.TextureLoader();

const getTexture = (idx) => {
    if (!textures.has(idx)) {
        const tex = textureLoader.load(TEXTURES[idx]);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.anisotropy = 4;     // keeps fine patterns crisp on surfaces seen at an angle
        textures.set(idx, tex);
    }
    return textures.get(idx);
}

// Shapes are created lazily; model geometries are registered by ModelObject once loaded.
export const getItemGeometry = (typeId) => {
    if (!geometries.has(typeId)) {
        const item = getItem(typeId);
        if (item.model) throw new Error(`Model geometry for "${typeId}" not prepared yet`);
        const geo = SHAPE_GEOMETRY[item.shape]();
        geo.computeBoundingSphere();
        geometries.set(typeId, geo);
    }
    return geometries.get(typeId);
}

export const hasItemGeometry = (typeId) => geometries.has(typeId);
export const setItemGeometry = (typeId, geometry) => geometries.set(typeId, geometry);

/*
 * Striped items: the pattern mask picks between the item's colour and a contrasting tone
 * of the same hue (darker for light colours, lighter for dark ones). Multiplying the
 * colour by the black/white mask instead turned half of every pattern black, so
 * striped items looked dirty and the pattern vanished on dark colours.
 */
const WHITE = new THREE.Color(1, 1, 1);
// Mixed in sRGB (perceptual) space: a linear-space mix toward white washes colours out.
const stripeTone = (hex) => {
    const srgb = new THREE.Color(hex).convertLinearToSRGB();
    const luma = 0.2126 * srgb.r + 0.7152 * srgb.g + 0.0722 * srgb.b;
    const tone = luma > 0.55 ? srgb.multiplyScalar(0.55) : srgb.lerp(WHITE, 0.3);
    return tone.convertSRGBToLinear();
}

const stripedMaterial = (hex, texIdx) => {
    const mat = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.5, map: getTexture(texIdx) });
    const stripeColor = stripeTone(hex);
    mat.onBeforeCompile = (shader) => {
        shader.uniforms.stripeColor = { value: stripeColor };
        shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', '#include <common>\nuniform vec3 stripeColor;')
            .replace('#include <map_fragment>', `#ifdef USE_MAP
    float stripeMask = smoothstep(0.35, 0.65, texture2D(map, vMapUv).r);
    diffuseColor.rgb = mix(stripeColor, diffuseColor.rgb, stripeMask);
#endif`);
    };
    // Every striped material shares one compiled program; only the uniform differs.
    mat.customProgramCacheKey = () => 'striped-two-tone';
    return mat;
}

export const getItemMaterial = (typeId) => {
    if (!materials.has(typeId)) {
        const item = getItem(typeId);
        const mat = item.model
            ? new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 })
            : item.tex !== undefined
                ? stripedMaterial(palette[item.color], item.tex)
                : new THREE.MeshStandardMaterial({ color: palette[item.color], roughness: 0.5 });
        materials.set(typeId, mat);
    }
    return materials.get(typeId);
}

// Free geometries/materials of types the current level doesn't use (textures are few; kept).
export const releaseUnusedItems = (keepIds) => {
    const keep = new Set(keepIds);
    for (const cache of [geometries, materials]) {
        cache.forEach((res, id) => {
            if (keep.has(id)) return;
            res.dispose();
            cache.delete(id);
        });
    }
}

export const disposeItemResources = () => {
    geometries.forEach(g => g.dispose());
    materials.forEach(m => m.dispose());
    textures.forEach(t => t.dispose());
    geometries.clear();
    materials.clear();
    textures.clear();
}

/* ---------- vehicle models ---------- */

// Copy any attribute (incl. quantized/normalized int) into plain floats so it can be transformed.
const toFloatAttribute = (attr) => {
    const out = new Float32Array(attr.count * attr.itemSize);
    for (let i = 0; i < attr.count; i++) {
        for (let c = 0; c < attr.itemSize; c++) out[i * attr.itemSize + c] = attr.getComponent(i, c);
    }
    return new THREE.BufferAttribute(out, attr.itemSize);
}

/**
 * Turns a loaded low-poly GLB scene into a single geometry that can be instanced:
 * every material's flat colour is baked into a vertex colour attribute, all parts
 * are merged, centred and scaled so the longest side equals `targetSize`.
 * `recolor` maps a material name prefix (e.g. "Green") to a replacement colour.
 *
 * The shipped GLBs are meshopt-compressed and quantized with normals stripped (see
 * utils/optimizeModels.mjs), so positions are converted to floats before transforming
 * and flat normals are computed here, matching the low-poly look.
 */
export const prepareModel = (scene, { targetSize = 1.25, recolor = {} } = {}) => {
    const parts = [];
    const color = new THREE.Color();
    scene.updateMatrixWorld(true);

    scene.traverse((child) => {
        if (!child.isMesh) return;
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        let geo = new THREE.BufferGeometry();
        geo.setAttribute('position', toFloatAttribute(child.geometry.attributes.position));
        if (child.geometry.index) geo.setIndex(child.geometry.index.clone());
        child.geometry.groups.forEach(g => geo.addGroup(g.start, g.count, g.materialIndex));
        geo.applyMatrix4(child.matrixWorld);
        if (geo.index) geo = geo.toNonIndexed();
        geo.computeVertexNormals();     // non-indexed => flat, faceted normals

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
