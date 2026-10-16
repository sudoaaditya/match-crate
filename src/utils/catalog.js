import { palette, colorNames } from "./colors.js";

/*
 * Every matchable item type. Looks are fixed per type (never random) so three of a
 * type always match visually. Shapes are procedural (zero download); models come
 * from /assets/models and are prepared once by prepareModel().
 *
 * Pure data, no three.js: the menus import this (via levels.js). The geometries and
 * materials built from it live in world/itemResources.js.
 *
 * shape items : { shape, color, tex?, collider }
 * model items : { model, recolor?, collider }
 *
 * Generated rather than hand-listed: 9 shapes x 16 colours (+ striped variants) and
 * 9 models x 3 paint jobs. Materials/geometries are only built for types a level uses.
 */

// Black/white pattern masks (256px greyscale WebP). Not used as colour: the striped
// material paints them in two tones of the item's own colour (itemResources.stripedMaterial).
export const TEXTURES = Array.from({ length: 9 }, (_, i) => `/assets/textures/bw_stripes_${i + 1}.webp`);

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

// Shape kinds (geometry factories are in world/itemResources.js).
// `stripes`: the UVs wrap well enough to also offer a striped variant of the shape.
const SHAPES = {
    sphere: { collider: 'ball', stripes: true },
    cube: { collider: 'cuboid', stripes: true },
    slab: { collider: 'cuboid', stripes: false },
    cylinder: { collider: 'hull', stripes: true },
    cone: { collider: 'hull', stripes: false },
    torus: { collider: 'hull', stripes: true },
    capsule: { collider: 'hull', stripes: true },
    octahedron: { collider: 'hull', stripes: false },
    dodecahedron: { collider: 'hull', stripes: false },
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

const getItem = (typeId) => {
    const item = CATALOG[typeId];
    if (!item) throw new Error(`Unknown item type "${typeId}"`);
    return item;
}

const isModelItem = (typeId) => !!getItem(typeId).model;

const getModelUrl = (typeId) => MODELS[getItem(typeId).model];

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
}
