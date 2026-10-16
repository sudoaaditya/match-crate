import { useFrame, useThree } from "@react-three/fiber";
import { Hud, OrthographicCamera, PerspectiveCamera } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { getItem } from "../utils/catalog";
import { getItemGeometry, getItemMaterial } from "./itemResources";
import { shades } from "../utils/colors";
import { FLY_MS, MERGE_MS, useGameStore } from "../utils/store";
import { trayMetrics } from "../utils/helpers";

/*
 * The tray is drawn in a screen-space overlay (<Hud>) with an orthographic camera in
 * pixel units, so every slot looks identical: no perspective skew toward the edges.
 * Items fly in a second overlay drawn above the tray (a perspective camera mirroring the
 * main one, so flights start exactly over the pile) and hand over to the tray overlay
 * when they land: the flight ends exactly where, and as big as, the tray item appears.
 */

const FLIGHT_DEPTH = 6;      // world units in front of the camera where flights end
const ARC_HEIGHT = 1.5;
const FILL = 0.74;           // fraction of a slot an item's silhouette fills
const LAND_MS = 200;

const barMaterial = new THREE.MeshBasicMaterial({ color: shades[1], transparent: true, opacity: 0.92, depthWrite: false });
const slotMaterial = new THREE.MeshBasicMaterial({ color: shades[3], transparent: true, opacity: 0.95, depthWrite: false });

const roundedRect = (w, h, r) => {
    const s = new THREE.Shape();
    const x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y);
    s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r);
    s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h);
    s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r);
    s.quadraticCurveTo(x, y, x + r, y);
    return new THREE.ShapeGeometry(s, 4);
}

// Unit slot (scaled uniformly by slot size each frame).
const slotGeometry = roundedRect(0.88, 0.88, 0.16);

/*
 * Display pose per item kind, in screen space (+Y up, +Z toward the viewer).
 * Chosen so each item reads at a glance: 3/4 views for solids/models, rings face-on, tubes upright.
 */
const pose = (x, y, z = 0) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z));
const POSES = {
    model: pose(0.55, -0.75),
    sphere: pose(0.4, -0.5),
    cube: pose(0.55, -0.62),
    slab: pose(0.75, -0.45),
    cylinder: pose(0.4, 0),
    cone: pose(0.3, 0),
    torus: pose(0.35, 0.25),
    capsule: pose(0.25, 0, 0.5),
    octahedron: pose(0.3, -0.45),
    dodecahedron: pose(0.4, -0.5),
};
const poseFor = (typeId) => {
    const item = getItem(typeId);
    return item.model ? POSES.model : (POSES[item.shape] ?? POSES.sphere);
}

/*
 * Fit, per item type: project every vertex in its display pose and measure the
 * silhouette. Gives a scale that fills the slot evenly (rings, slabs, tanks and cubes
 * all look the same size) and the offset that centres the silhouette in the slot.
 */
const fitCache = new WeakMap();
const _v = new THREE.Vector3();
const getFit = (geometry, quat) => {
    let byPose = fitCache.get(geometry);
    if (!byPose) fitCache.set(geometry, byPose = new Map());
    if (!byPose.has(quat)) {
        const pos = geometry.attributes.position;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (let i = 0; i < pos.count; i++) {
            _v.fromBufferAttribute(pos, i).applyQuaternion(quat);
            minX = Math.min(minX, _v.x); maxX = Math.max(maxX, _v.x);
            minY = Math.min(minY, _v.y); maxY = Math.max(maxY, _v.y);
        }
        byPose.set(quat, {
            size: Math.max(maxX - minX, maxY - minY),
            center: new THREE.Vector3((minX + maxX) / 2, (minY + maxY) / 2, 0),
        });
    }
    return byPose.get(quat);
}

const itemLook = (typeId) => {
    const geometry = getItemGeometry(typeId);
    const displayPose = poseFor(typeId);
    return { geometry, material: getItemMaterial(typeId), displayPose, fit: getFit(geometry, displayPose) };
}

const easeInOut = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

export const Tray = () => {
    const camera = useThree(s => s.camera);
    const size = useThree(s => s.size);
    const tray = useGameStore(s => s.tray);
    const capacity = useGameStore(s => s.trayCapacity);
    const landed = useGameStore(s => s.landed);

    // Shared layout in screen pixels (origin at screen centre), updated every frame.
    const layout = useMemo(() => {
        const l = {
            camera,
            slot: 50, spacing: 50, columns: capacity, y: 0,
            slotX: (i) => (i - (l.columns - 1) / 2) * l.spacing,
            // World units per pixel at FLIGHT_DEPTH (perspective camera).
            worldPerPx: () => (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * FLIGHT_DEPTH) / size.height,
            // World point that the perspective camera shows at pixel (x, y), offset by `offsetPx`.
            toWorld: (x, y, out, offsetPx) => {
                const k = l.worldPerPx();
                out.set(x, y, 0);
                if (offsetPx) out.sub(offsetPx);
                out.multiplyScalar(k);
                out.z = -FLIGHT_DEPTH;
                return out.applyMatrix4(camera.matrixWorld);
            },
        };
        return l;
    }, [camera, size, capacity]);

    // Priority -1: before the items' callbacks, so they read this frame's layout.
    useFrame(() => {
        const metrics = trayMetrics(size.width, size.height, capacity);
        layout.slot = metrics.slot;
        layout.y = metrics.y;
        // While a merging triplet and new items briefly overflow the tray, squeeze them in.
        layout.columns = Math.max(capacity, tray.length);
        layout.spacing = layout.slot * capacity / layout.columns;
    }, -1);

    // A merging triplet converges on its middle item.
    const mergeTargets = new Map();
    tray.forEach((e, i) => {
        if (!e.matchId) return;
        const list = mergeTargets.get(e.matchId) ?? [];
        list.push(i);
        mergeTargets.set(e.matchId, list);
    });

    return (
        <>
            <Hud renderPriority={1}>
                <OrthographicCamera makeDefault position={[0, 0, 500]} near={1} far={1000} />
                <ambientLight intensity={1.4} />
                <directionalLight position={[3, 5, 10]} intensity={2.2} />
                <TrayBackground capacity={capacity} layout={layout} />
                {tray.map((entry, i) => {
                    const group = entry.matchId ? mergeTargets.get(entry.matchId) : null;
                    return (
                        <SlotItem
                            key={entry.uid}
                            entry={entry}
                            slotIndex={i}
                            mergeIndex={group ? group[Math.floor(group.length / 2)] : i}
                            layout={layout}
                        />
                    );
                })}
            </Hud>

            <Hud renderPriority={2}>
                <FlightCamera source={camera} />
                <ambientLight intensity={1.4} />
                <directionalLight position={[4, 12, 6]} intensity={2.2} />
                {tray.map((entry, i) => !entry.landed &&
                    <FlyingItem key={entry.uid} entry={entry} slotIndex={i} layout={layout} onLanded={landed} />
                )}
            </Hud>
        </>
    );
}

// Mirrors the main camera so flights in the top overlay line up with the pile below.
const FlightCamera = ({ source }) => {
    const ref = useRef(null);
    useFrame(() => {
        const cam = ref.current;
        cam.position.copy(source.position);
        cam.quaternion.copy(source.quaternion);
        if (cam.fov !== source.fov || cam.far !== source.far) {
            cam.fov = source.fov;
            cam.far = source.far;
            cam.updateProjectionMatrix();
        }
        cam.updateMatrixWorld();
    }, -2);
    return <PerspectiveCamera ref={ref} makeDefault near={0.1} />;
}

const TrayBackground = ({ capacity, layout }) => {
    const barRef = useRef(null);
    const slotRefs = useRef([]);
    const barGeometry = useMemo(() => roundedRect(capacity + 0.3, 1.25, 0.3), [capacity]);
    useEffect(() => () => barGeometry.dispose(), [barGeometry]);

    useFrame(() => {
        barRef.current.position.set(0, layout.y, -200);
        barRef.current.scale.setScalar(layout.slot);
        slotRefs.current.forEach((s, i) => {
            if (!s) return;
            s.position.set((i - (capacity - 1) / 2) * layout.slot, layout.y, -150);
            s.scale.setScalar(layout.slot);
        });
    });

    return (
        <>
            <mesh ref={barRef} geometry={barGeometry} material={barMaterial} />
            {Array.from({ length: capacity }, (_, i) =>
                <mesh key={i} ref={el => slotRefs.current[i] = el} geometry={slotGeometry} material={slotMaterial} />
            )}
        </>
    );
}

// 3D flight from the pile to the screen spot of its slot; unmounts once landed.
const FlyingItem = ({ entry, slotIndex, layout, onLanded }) => {
    const ref = useRef(null);
    const { geometry, material, displayPose, fit } = itemLook(entry.typeId);

    const anim = useMemo(() => ({
        t: 0,
        done: false,
        start: new THREE.Vector3(...entry.from.position),
        startQuat: new THREE.Quaternion(...entry.from.quaternion),
        target: new THREE.Vector3(),
        quat: new THREE.Quaternion(),
        offset: new THREE.Vector3(),
    }), [entry.uid]);

    useFrame((_, delta) => {
        if (anim.done) return;
        const mesh = ref.current;
        const pxScale = (layout.slot * FILL) / fit.size;

        anim.offset.copy(fit.center).multiplyScalar(pxScale);
        layout.toWorld(layout.slotX(slotIndex), layout.y, anim.target, anim.offset);
        anim.quat.copy(layout.camera.quaternion).multiply(displayPose);

        anim.t = Math.min(1, anim.t + (delta * 1000) / FLY_MS);
        const k = easeInOut(anim.t);
        mesh.position.lerpVectors(anim.start, anim.target, k);
        mesh.position.y += Math.sin(Math.PI * k) * ARC_HEIGHT;
        mesh.quaternion.slerpQuaternions(anim.startQuat, anim.quat, k);
        mesh.scale.setScalar(THREE.MathUtils.lerp(1, pxScale * layout.worldPerPx(), k));

        if (anim.t === 1) {
            anim.done = true;
            onLanded(entry.uid);
        }
    });

    return (
        <mesh
            ref={ref}
            geometry={geometry}
            material={material}
            position={entry.from.position}
            quaternion={entry.from.quaternion}
        />
    );
}

// Orthographic item in the tray overlay: shown once landed; slides, bounces and merges.
const SlotItem = ({ entry, slotIndex, mergeIndex, layout }) => {
    const ref = useRef(null);
    const { geometry, material, displayPose, fit } = itemLook(entry.typeId);
    const anim = useMemo(() => ({ placed: false, landedAt: 0, target: new THREE.Vector3(), from: new THREE.Vector3() }), [entry.uid]);

    useFrame((_, delta) => {
        const mesh = ref.current;
        mesh.visible = entry.landed;
        if (!entry.landed) return;

        const scale = (layout.slot * FILL) / fit.size;
        const at = (i, out) => out.set(layout.slotX(i) - fit.center.x * scale, layout.y - fit.center.y * scale, 0);
        at(slotIndex, anim.target);

        const now = performance.now();
        if (!anim.placed) {
            anim.placed = true;
            anim.landedAt = now;
            mesh.position.copy(anim.target);
        }

        if (entry.state === 'clearing') {
            // Converge on the middle item, swell, then shrink away.
            const p = THREE.MathUtils.clamp((now - entry.mergeAt) / MERGE_MS, 0, 1);
            at(mergeIndex, anim.from);
            mesh.position.lerpVectors(anim.target, anim.from, easeInOut(Math.min(1, p / 0.55)));
            const swell = p < 0.55 ? 1 + 0.18 * (p / 0.55) : 1.18 * (1 - (p - 0.55) / 0.45);
            mesh.scale.setScalar(Math.max(scale * swell, 0.0001));
            return;
        }

        // Settled: glide when neighbours shift, small bounce right after landing.
        mesh.position.lerp(anim.target, 1 - Math.exp(-delta * 16));
        const b = Math.min(1, (now - anim.landedAt) / LAND_MS);
        mesh.scale.setScalar(scale * (1 + 0.12 * Math.sin(b * Math.PI)));
    });

    return <mesh ref={ref} geometry={geometry} material={material} quaternion={displayPose} visible={false} />;
}
