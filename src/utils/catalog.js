import * as THREE from "three";
import { palette, colorNames } from "./colors.js";

/*
 * Every matchable item type. Looks are fixed per type (never random) so three of a
 * type always match visually. Shapes are procedural (zero download); models come
 * from /assets/models and are prepared once by prepareModel().
 *
 * shape items : { shape, color, tex?, collider }
 * model items : { model, recolor?, collider }
 *
 * Generated rather than hand-listed: 9 shapes x 16 colours (+ striped variants) and
 * 9 models x 3 paint jobs. Materials/geometries are only built for types a level uses.
 */

const TEXTURES = [
    '/assets/textures/bw_stripes_1.jpg',
    '/assets/textures/bw_stripes_2.jpg',
    '/assets/textures/bw_stripes_3.jpg',
    '/assets/textures/bw_stripes_4.jpg',
    '/assets/textures/bw_stripes_5.jpg',
    '/assets/textures/bw_stripes_6.jpg',
    '/assets/textures/bw_stripes_7.jpg',
    '/assets/textures/bw_stripes_8.png',
    '/assets/textures/bw_stripes_9.png',
];

const MODELS = {
    Ambulance: '/assets/models/Ambulance_Car.glb',
    Bike: '/assets/models/Bike.glb',
    Helicopter: '/assets/models/Helicopter.glb',
    Jeep: '/assets/models/Jeep.glb',
    LightTank: '/assets/models/Light_Tank.glb',
    Boat: '/assets/models/Military_Boat.glb',
    Motorbike: '/assets/models/Military_Motorbike.glb',
    Tank: '/assets/models/Tank.glb',
    Truck: '/assets/models/Truck.glb',
};

// Geometry factories, all sized to roughly 0.8–0.9 units across.
// `stripes`: the UVs wrap well enough to also offer a striped variant of the shape.
const SHAPES = {
    sphere: { make: () => new THREE.SphereGeometry(0.42, 16, 12), collider: 'ball', stripes: true },
    cube: { make: () => new THREE.BoxGeometry(0.75, 0.75, 0.75), collider: 'cuboid', stripes: true },
    slab: { make: () => new THREE.BoxGeometry(0.9, 0.25, 0.6), collider: 'cuboid', stripes: false },
    cylinder: { make: () => new THREE.CylinderGeometry(0.32, 0.32, 0.8, 16), collider: 'hull', stripes: true },
    cone: { make: () => new THREE.ConeGeometry(0.4, 0.85, 16), collider: 'hull', stripes: false },
    torus: { make: () => new THREE.TorusGeometry(0.3, 0.13, 8, 20), collider: 'hull', stripes: true },
    capsule: { make: () => new THREE.CapsuleGeometry(0.22, 0.45, 4, 12), collider: 'hull', stripes: true },
    octahedron: { make: () => new THREE.OctahedronGeometry(0.45), collider: 'hull', stripes: false },
    dodecahedron: { make: () => new THREE.DodecahedronGeometry(0.42), collider: 'hull', stripes: false },
};

// Catalog id -> key in MODELS.
const MODEL_ITEMS = {
    tank: 'Tank',
    light_tank: 'LightTank',
    jeep: 'Jeep',
    truck: 'Truck',
    ambulance: 'Ambulance',
    helicopter: 'Helicopter',
    boat: 'Boat',
    bike: 'Bike',
    motorbike: 'Motorbike',
};

// Model paint jobs: material-name prefix -> colour. Every model has some green parts.
const RECOLORS = {
    desert: { Green: '#c2a36b', DarkGreen: '#8a6f3e', LightGreen: '#d8c08a' },
    navy: { Green: '#3d5a80', DarkGreen: '#293f5c', LightGreen: '#98c1d9' },
};

// Models that look alike in a pile (super hard levels pair them up).
const LOOKALIKE_MODELS = [
    ['tank', 'light_tank'],
    ['bike', 'motorbike'],
    ['jeep', 'truck'],
];

const shapeId = (shape, colorName, striped = false) => `${shape}_${colorName}${striped ? '_striped' : ''}`;
const modelId = (model, paint) => paint ? `${model}_${paint}` : model;

const CATALOG = {};
for (const [shape, def] of Object.entries(SHAPES)) {
    colorNames.forEach((name, color) => {
        CATALOG[shapeId(shape, name)] = { shape, color, collider: def.collider };
        if (def.stripes) {
            CATALOG[shapeId(shape, name, true)] = { shape, color, tex: color % TEXTURES.length, collider: def.collider };
        }
    });
}
for (const [id, model] of Object.entries(MODEL_ITEMS)) {
    CATALOG[modelId(id)] = { model, collider: 'cuboid' };
    for (const [paint, recolor] of Object.entries(RECOLORS)) {
        CATALOG[modelId(id, paint)] = { model, recolor, collider: 'cuboid' };
    }
}

/* ---------- shared resource cache (one geometry/material per item type) ---------- */

const geometries = new Map();
const materials = new Map();
const textures = new Map();
const textureLoader = new THREE.TextureLoader();

const getTexture = (idx) => {
    if (!textures.has(idx)) {
        const tex = textureLoader.load(TEXTURES[idx]);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.colorSpace = THREE.SRGBColorSpace;
        textures.set(idx, tex);
    }
    return textures.get(idx);
}

const getItem = (typeId) => {
    const item = CATALOG[typeId];
    if (!item) throw new Error(`Unknown item type "${typeId}"`);
    return item;
}

const isModelItem = (typeId) => !!getItem(typeId).model;

const getModelUrl = (typeId) => MODELS[getItem(typeId).model];

// Shapes are created lazily; model geometries are registered by ModelObject once loaded.
const getItemGeometry = (typeId) => {
    if (!geometries.has(typeId)) {
        const item = getItem(typeId);
        if (item.model) throw new Error(`Model geometry for "${typeId}" not prepared yet`);
        const geo = SHAPES[item.shape].make();
        geo.computeBoundingSphere();
        geometries.set(typeId, geo);
    }
    return geometries.get(typeId);
}

const hasItemGeometry = (typeId) => geometries.has(typeId);
const setItemGeometry = (typeId, geometry) => geometries.set(typeId, geometry);

const getItemMaterial = (typeId) => {
    if (!materials.has(typeId)) {
        const item = getItem(typeId);
        const mat = item.model
            ? new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 })
            : new THREE.MeshStandardMaterial({ color: palette[item.color], roughness: 0.5 });
        if (item.tex !== undefined) mat.map = getTexture(item.tex);
        materials.set(typeId, mat);
    }
    return materials.get(typeId);
}

// Free geometries/materials of types the current level doesn't use (textures are few; kept).
const releaseUnusedItems = (keepIds) => {
    const keep = new Set(keepIds);
    for (const cache of [geometries, materials]) {
        cache.forEach((res, id) => {
            if (keep.has(id)) return;
            res.dispose();
            cache.delete(id);
        });
    }
}

const disposeItemResources = () => {
    geometries.forEach(g => g.dispose());
    materials.forEach(m => m.dispose());
    textures.forEach(t => t.dispose());
    geometries.clear();
    materials.clear();
    textures.clear();
}

export {
    CATALOG,
    MODELS,
    SHAPES,
    MODEL_ITEMS,
    RECOLORS,
    LOOKALIKE_MODELS,
    shapeId,
    modelId,
    getItem,
    isModelItem,
    getModelUrl,
    getItemGeometry,
    hasItemGeometry,
    setItemGeometry,
    getItemMaterial,
    releaseUnusedItems,
    disposeItemResources
}
