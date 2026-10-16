import * as THREE from "three";
import { palette } from "./colors";

/*
 * Every matchable item type. Looks are fixed per type (never random) so three of a
 * type always match visually. Shapes are procedural (zero download); models come
 * from /assets/models and are prepared once by prepareModel().
 *
 * shape items : { shape, color, tex?, collider }
 * model items : { model, recolor?, collider }
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
const SHAPES = {
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

const CATALOG = {
    // shapes
    sphere_red: { shape: 'sphere', color: 0, collider: 'ball' },
    sphere_red_striped: { shape: 'sphere', color: 0, tex: 2, collider: 'ball' },
    sphere_sky: { shape: 'sphere', color: 10, collider: 'ball' },
    cube_blue: { shape: 'cube', color: 5, collider: 'cuboid' },
    cube_yellow_striped: { shape: 'cube', color: 2, tex: 0, collider: 'cuboid' },
    slab_orange: { shape: 'slab', color: 1, collider: 'cuboid' },
    cylinder_purple: { shape: 'cylinder', color: 6, collider: 'hull' },
    cone_lime: { shape: 'cone', color: 3, collider: 'hull' },
    torus_yellow: { shape: 'torus', color: 2, collider: 'hull' },
    torus_pink: { shape: 'torus', color: 7, collider: 'hull' },
    capsule_mint: { shape: 'capsule', color: 11, collider: 'hull' },
    octahedron_teal: { shape: 'octahedron', color: 4, collider: 'hull' },
    dodecahedron_magenta: { shape: 'dodecahedron', color: 12, collider: 'hull' },

    // models (+ recoloured variants: same mesh, swapped material colours)
    tank: { model: 'Tank', collider: 'cuboid' },
    tank_desert: { model: 'Tank', collider: 'cuboid', recolor: { Green: '#c2a36b', DarkGreen: '#8a6f3e' } },
    light_tank: { model: 'LightTank', collider: 'cuboid' },
    jeep: { model: 'Jeep', collider: 'cuboid' },
    truck: { model: 'Truck', collider: 'cuboid' },
    ambulance: { model: 'Ambulance', collider: 'cuboid' },
    helicopter: { model: 'Helicopter', collider: 'cuboid' },
    boat: { model: 'Boat', collider: 'cuboid' },
    bike: { model: 'Bike', collider: 'cuboid' },
    motorbike: { model: 'Motorbike', collider: 'cuboid' },
};

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
        const geo = SHAPES[item.shape]();
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
    getItem,
    isModelItem,
    getModelUrl,
    getItemGeometry,
    hasItemGeometry,
    setItemGeometry,
    getItemMaterial,
    disposeItemResources
}
