import { InstancedRigidBodies } from "@react-three/rapier"
import { useFrame } from "@react-three/fiber";
import { memo, useLayoutEffect, useMemo, useRef } from "react"
import * as THREE from "three";
import { createRng, randRange } from "../utils/helpers";
import { useGameStore } from "../utils/store";
import { registerGroup } from "../utils/pile";
import { FLOOR_Y } from "./GameContainer";

// Every group's body list, so a pick can wake the whole pile (sleeping bodies won't fall into the gap).
const allBodies = new Set();
export const wakeAllBodies = () => allBodies.forEach(ref => ref.current.forEach(body => body?.wakeUp()));

const forEachActiveBody = (fn) => allBodies.forEach(ref => ref.current.forEach(body => {
    if (body && body.isEnabled()) fn(body);
}));

const SETTLE_CHECK = 0.25;      // s between checks
const SETTLE_AFTER = 1;         // s the pile must stay calm
const CALM_LINEAR = 0.3;        // units/s
const CALM_ANGULAR = 1;         // rad/s

/*
 * Rapier only sleeps a group of touching bodies once *all* of them are nearly still. A deep
 * pile keeps a little solver jitter forever (measured: ~0.1 u/s, ~0.5 rad/s on level 100),
 * so it never slept and physics cost full price every frame (~7 ms/frame on 120 items).
 * Once the whole pile has been calm for a second, put it to sleep ourselves; every pick,
 * undo, magnet and shuffle wakes it again via wakeAllBodies().
 */
export const PileSettler = () => {
    const state = useRef({ since: 0, calmFor: 0 });
    useFrame((_, delta) => {
        const s = state.current;
        s.since += delta;
        if (s.since < SETTLE_CHECK) return;
        const step = s.since;
        s.since = 0;

        let awake = 0, calm = true;
        forEachActiveBody(body => {
            if (body.isSleeping()) return;
            awake++;
            const v = body.linvel(), w = body.angvel();
            if (Math.hypot(v.x, v.y, v.z) > CALM_LINEAR || Math.hypot(w.x, w.y, w.z) > CALM_ANGULAR) calm = false;
        });

        s.calmFor = awake && calm ? s.calmFor + step : 0;
        if (s.calmFor >= SETTLE_AFTER) {
            forEachActiveBody(body => body.sleep());
            s.calmFor = 0;
        }
    });
    return null;
}

// Picked instances are disabled and parked far below the box; the instanced matrix follows them there.
const HIDDEN_POS = { x: 0, y: -500, z: 0 };

// Instances move every frame, so a computed bounding sphere goes stale and breaks culling/raycasting.
// A fixed sphere around the whole box is cheaper and always correct.
const PILE_BOUNDS = new THREE.Sphere(new THREE.Vector3(0, 2, 0), 18);

// The item under the pointer, read every frame by <HoverOutline>. A plain object rather
// than React state, so pointer movement never re-renders anything.
export const hovered = { mesh: null, instanceId: -1 };

const setHover = (mesh, instanceId) => {
    hovered.mesh = mesh;
    hovered.instanceId = instanceId;
    document.body.style.cursor = mesh ? 'pointer' : 'auto';
}

const rand = (min, max) => min + Math.random() * (max - min);

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
    boxX = 3.6,
    boxZ = 3.6,
    spawnHeight = 8
}) => {

    const bodies = useRef([]);
    const meshRef = useRef(null);
    const picked = useRef(new Set());
    const pick = useGameStore(s => s.pick);

    const instances = useMemo(() => {
        const rng = createRng(seed);
        const sx = Math.max(0.6, boxX - 1.2), sz = Math.max(0.6, boxZ - 1.2);
        const bottom = FLOOR_Y + 1;
        return Array.from({ length: count }, (_, i) => ({
            key: `${typeId}_${i}`,
            position: [randRange(rng, -sx, sx), randRange(rng, bottom, bottom + spawnHeight), randRange(rng, -sz, sz)],
            rotation: [rng() * Math.PI * 2, rng() * Math.PI * 2, rng() * Math.PI * 2],
        }));
    }, [typeId, count, seed, boxX, boxZ, spawnHeight]);

    // Move one instance from the pile into the tray (tap or magnet). Returns whether the tray took it.
    const pickInstance = (id) => {
        const body = bodies.current[id];
        if (!body || picked.current.has(id)) return false;

        const t = body.translation();
        const r = body.rotation();
        const accepted = pick(typeId, {
            position: [t.x, t.y, t.z],
            quaternion: [r.x, r.y, r.z, r.w],
        }, id);
        if (!accepted) return false;

        picked.current.add(id);
        if (hovered.mesh === meshRef.current && hovered.instanceId === id) setHover(null, -1);
        body.setEnabled(false);
        body.setTranslation(HIDDEN_POS, false);
        wakeAllBodies();
        return true;
    }

    const remainingIds = () => bodies.current.map((_, id) => id).filter(id => !picked.current.has(id));

    // Booster/continue hooks for the store (see utils/pile.js).
    const api = useMemo(() => ({
        typeId,
        available: () => remainingIds().length,

        // Top-most first: what a player would grab.
        autoPick: (n) => remainingIds()
            .sort((a, b) => bodies.current[b].translation().y - bodies.current[a].translation().y)
            .slice(0, n)
            .reduce((done, id) => done + (pickInstance(id) ? 1 : 0), 0),

        // Drop a picked item back in, from above the middle of the pile.
        restore: (id) => {
            const body = bodies.current[id];
            if (!body || !picked.current.has(id)) return;
            const sx = Math.max(0.4, boxX - 1.6), sz = Math.max(0.4, boxZ - 1.6);
            body.setTranslation({ x: rand(-sx, sx), y: FLOOR_Y + spawnHeight * 0.6, z: rand(-sz, sz) }, false);
            body.setLinvel({ x: 0, y: 0, z: 0 }, false);
            body.setAngvel({ x: rand(-2, 2), y: rand(-2, 2), z: rand(-2, 2) }, false);
            body.setEnabled(true);
            picked.current.delete(id);
            wakeAllBodies();
        },

        // Toss every remaining item up and sideways; impulses scale with mass so all types jump alike.
        shuffle: () => {
            remainingIds().forEach(id => {
                const body = bodies.current[id];
                const m = body.mass();
                body.applyImpulse({ x: rand(-2.5, 2.5) * m, y: rand(5, 8) * m, z: rand(-2.5, 2.5) * m }, true);
                body.applyTorqueImpulse({ x: rand(-0.4, 0.4) * m, y: rand(-0.4, 0.4) * m, z: rand(-0.4, 0.4) * m }, true);
            });
        },
    }), [typeId, boxX, boxZ, spawnHeight]);

    useLayoutEffect(() => {
        meshRef.current.boundingSphere = PILE_BOUNDS;
        allBodies.add(bodies);
        const unregister = registerGroup(typeId, api);
        return () => {
            allBodies.delete(bodies);
            unregister();
            if (hovered.mesh === meshRef.current) setHover(null, -1);
        };
    }, [api]);

    const handlePick = (e) => {
        const id = e.instanceId;
        // Already-picked instance: don't stop propagation so whatever is behind it gets the tap.
        if (id === undefined || picked.current.has(id)) return;
        e.stopPropagation();
        pickInstance(id);
    }

    // Only the front-most item under the pointer is hovered (stopPropagation).
    const handleHover = (e) => {
        const id = e.instanceId;
        if (id === undefined || picked.current.has(id)) return;
        e.stopPropagation();
        if (hovered.mesh !== meshRef.current || hovered.instanceId !== id) setHover(meshRef.current, id);
    }

    const handleLeave = () => {
        if (hovered.mesh === meshRef.current) setHover(null, -1);
    }

    // Touch has no hover: don't leave an outline behind when the finger lifts.
    const handleUp = (e) => {
        if (e.pointerType !== 'mouse') handleLeave();
    }

    return (
        <InstancedRigidBodies
            ref={bodies}
            colliders={collider}
            instances={instances}
            friction={0.6}
            restitution={0.05}
            linearDamping={0.3}
            angularDamping={1.2}
        >
            <instancedMesh
                ref={meshRef}
                args={[geometry, material, count]}
                onClick={handlePick}
                onPointerOver={handleHover}
                onPointerMove={handleHover}
                onPointerOut={handleLeave}
                onPointerUp={handleUp}
            />
        </InstancedRigidBodies>
    )
})
