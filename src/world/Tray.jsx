import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { getItemGeometry, getItemMaterial } from "../utils/catalog";
import { shades } from "../utils/colors";
import { FLY_MS, POP_MS, useGameStore } from "../utils/store";

const TRAY_DISTANCE = 6;     // world units in front of the camera
const ARC_HEIGHT = 1.5;

const barGeometry = new THREE.PlaneGeometry(1, 1);
const barMaterial = new THREE.MeshBasicMaterial({ color: shades[1], transparent: true, opacity: 0.9, depthWrite: false });
const slotMaterial = new THREE.MeshBasicMaterial({ color: shades[3], transparent: true, opacity: 0.9, depthWrite: false });

// Display pose relative to the camera: tilted so items read as a 3/4 view.
const DISPLAY_TILT = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.6, -0.6, 0));

const easeInOut = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

/**
 * A row of slots pinned to the bottom of the screen. It lives in world space (so items
 * can fly from the pile into it) but is re-anchored to the camera every frame.
 */
export const Tray = () => {
    const camera = useThree(s => s.camera);
    const tray = useGameStore(s => s.tray);
    const capacity = useGameStore(s => s.trayCapacity);

    const barRef = useRef(null);
    const slotRefs = useRef([]);

    // Shared, mutated in place each frame and read by every TrayItem.
    const layout = useMemo(() => ({
        slot: 0.5,
        positions: Array.from({ length: capacity }, () => new THREE.Vector3()),
        quaternion: new THREE.Quaternion(),
    }), [capacity]);

    // Place a screen-aligned object at (x, y) on the tray plane but `depth` units from the camera,
    // scaled so it projects to the same spot/size (backgrounds sit behind the items).
    const placeBehind = (obj, x, y, depth, sx, sy) => {
        const k = depth / TRAY_DISTANCE;
        obj.position.set(x * k, y * k, -depth).applyMatrix4(camera.matrixWorld);
        obj.quaternion.copy(camera.quaternion);
        obj.scale.set(sx * k, sy * k, 1);
    }

    // Priority -1: runs before the items' frame callbacks so they read this frame's layout.
    useFrame(() => {
        const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * TRAY_DISTANCE;
        const halfW = halfH * camera.aspect;
        const slot = Math.min(halfH * 0.24, (halfW * 2 * 0.94) / capacity);
        const y = -halfH + slot * 0.8;
        const slotX = (i) => (i - (capacity - 1) / 2) * slot;

        layout.slot = slot;
        layout.quaternion.copy(camera.quaternion).multiply(DISPLAY_TILT);
        layout.positions.forEach((p, i) => p.set(slotX(i), y, -TRAY_DISTANCE).applyMatrix4(camera.matrixWorld));

        placeBehind(barRef.current, 0, y, TRAY_DISTANCE + 0.6, slot * (capacity + 0.3), slot * 1.25);
        slotRefs.current.forEach((s, i) => s && placeBehind(s, slotX(i), y, TRAY_DISTANCE + 0.5, slot * 0.88, slot * 0.88));
    }, -1);

    // Matched (clearing) entries don't take a slot: they collapse onto the slot they merge into.
    let slotIndex = 0;
    const items = tray.map(entry => {
        const index = entry.state === 'clearing' ? slotIndex : slotIndex++;
        return <TrayItem key={entry.uid} entry={entry} slotIndex={Math.min(index, capacity - 1)} layout={layout} />;
    });

    return (
        <group>
            <mesh ref={barRef} geometry={barGeometry} material={barMaterial} renderOrder={1} />
            {layout.positions.map((_, i) =>
                <mesh key={i} ref={el => slotRefs.current[i] = el} geometry={barGeometry} material={slotMaterial} renderOrder={2} />
            )}
            {items}
        </group>
    );
}

const TrayItem = ({ entry, slotIndex, layout }) => {
    const ref = useRef(null);
    const geometry = getItemGeometry(entry.typeId);
    const material = getItemMaterial(entry.typeId);

    const anim = useMemo(() => ({
        t: 0,
        start: new THREE.Vector3(...entry.from.position),
        startQuat: new THREE.Quaternion(...entry.from.quaternion),
    }), [entry.uid]);

    useFrame((_, delta) => {
        const mesh = ref.current;
        const target = layout.positions[slotIndex];
        const restScale = (layout.slot * 0.4) / geometry.boundingSphere.radius;

        if (anim.t < 1) {
            anim.t = Math.min(1, anim.t + (delta * 1000) / FLY_MS);
            const k = easeInOut(anim.t);
            mesh.position.lerpVectors(anim.start, target, k);
            mesh.position.y += Math.sin(Math.PI * k) * ARC_HEIGHT;
            mesh.quaternion.slerpQuaternions(anim.startQuat, layout.quaternion, k);
            mesh.scale.setScalar(THREE.MathUtils.lerp(1, restScale, k));
            return;
        }

        // Landed: glide when neighbours shift, pop out when part of a match.
        mesh.position.lerp(target, 1 - Math.exp(-delta * 16));
        mesh.quaternion.copy(layout.quaternion);

        let scale = restScale;
        if (entry.state === 'clearing') {
            const p = THREE.MathUtils.clamp((performance.now() - entry.popAt) / POP_MS, 0, 1);
            scale = restScale * (1 + 0.35 * Math.sin(p * Math.PI)) * (1 - p * p);
        }
        mesh.scale.setScalar(Math.max(scale, 0.0001));
    });

    return (
        <mesh
            ref={ref}
            geometry={geometry}
            material={material}
            position={entry.from.position}
            quaternion={entry.from.quaternion}
            renderOrder={3}
        />
    );
}
