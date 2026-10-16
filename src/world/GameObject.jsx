import { InstancedRigidBodies } from "@react-three/rapier"
import { memo, useLayoutEffect, useMemo, useRef } from "react"
import * as THREE from "three";
import { createRng, randRange } from "../utils/helpers";
import { useGameStore } from "../utils/store";
import { FLOOR_Y } from "./GameContainer";

// Every group's body list, so a pick can wake the whole pile (sleeping bodies won't fall into the gap).
const allBodies = new Set();
export const wakeAllBodies = () => allBodies.forEach(ref => ref.current.forEach(body => body?.wakeUp()));

// Picked instances are disabled and parked far below the box; the instanced matrix follows them there.
const HIDDEN_POS = { x: 0, y: -500, z: 0 };

// Instances move every frame, so a computed bounding sphere goes stale and breaks culling/raycasting.
// A fixed sphere around the whole box is cheaper and always correct.
const PILE_BOUNDS = new THREE.Sphere(new THREE.Vector3(0, 2, 0), 16);

const setCursor = (value) => () => { document.body.style.cursor = value; };

/**
 * One instanced, physics-driven group of identical items (shape or prepared model).
 */
export const GameObject = memo(({
    typeId,
    geometry,
    material,
    count,
    collider = "ball",
    seed = 1,
    boxHalf = 3.6,
    spawnHeight = 8
}) => {

    const bodies = useRef([]);
    const meshRef = useRef(null);
    const picked = useRef(new Set());
    const pick = useGameStore(s => s.pick);

    const instances = useMemo(() => {
        const rng = createRng(seed);
        const spread = Math.max(0.6, boxHalf - 1.2);
        const bottom = FLOOR_Y + 1;
        return Array.from({ length: count }, (_, i) => ({
            key: `${typeId}_${i}`,
            position: [randRange(rng, -spread, spread), randRange(rng, bottom, bottom + spawnHeight), randRange(rng, -spread, spread)],
            rotation: [rng() * Math.PI * 2, rng() * Math.PI * 2, rng() * Math.PI * 2],
        }));
    }, [typeId, count, seed, boxHalf, spawnHeight]);

    useLayoutEffect(() => {
        meshRef.current.boundingSphere = PILE_BOUNDS;
        allBodies.add(bodies);
        return () => allBodies.delete(bodies);
    }, []);

    const handlePick = (e) => {
        const id = e.instanceId;
        // Already-picked instance: don't stop propagation so whatever is behind it gets the tap.
        if (id === undefined || picked.current.has(id)) return;
        e.stopPropagation();

        const body = bodies.current[id];
        if (!body) return;

        const t = body.translation();
        const r = body.rotation();
        const accepted = pick(typeId, {
            position: [t.x, t.y, t.z],
            quaternion: [r.x, r.y, r.z, r.w],
        });
        if (!accepted) return;

        picked.current.add(id);
        body.setEnabled(false);
        body.setTranslation(HIDDEN_POS, false);
        wakeAllBodies();
    }

    return (
        <InstancedRigidBodies
            ref={bodies}
            colliders={collider}
            instances={instances}
            friction={0.4}
            restitution={0.05}
            linearDamping={0.2}
            angularDamping={0.6}
        >
            <instancedMesh
                ref={meshRef}
                args={[geometry, material, count]}
                onClick={handlePick}
                onPointerOver={setCursor('pointer')}
                onPointerOut={setCursor('auto')}
            />
        </InstancedRigidBodies>
    )
})
