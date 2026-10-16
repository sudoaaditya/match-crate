import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useGameStore } from "../utils/store";
import { hovered } from "./GameObject";

const OUTLINE_WIDTH = 0.035;    // world units

/*
 * Inverted-hull outline: the hovered item's shape pushed outward along *smoothed* normals
 * (the average of every face meeting at a corner) and drawn back-faces-only in a flat
 * colour, so only a rim of even thickness shows around it. Scaling a copy instead leaves
 * gaps on flat-sided items (cube edges facing the camera); extruding along the item's own
 * per-face normals splits the shell apart at hard edges.
 */
const outlineMaterial = new THREE.MeshBasicMaterial({ color: '#fff3c4', side: THREE.BackSide });
outlineMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.outlineWidth = { value: OUTLINE_WIDTH };
    shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float outlineWidth;')
        .replace('#include <begin_vertex>', 'vec3 transformed = position + normal * outlineWidth;');
};

// Non-indexed copy of the geometry whose normals are averaged over every vertex sharing
// a position, so hard edges and corners extrude into a closed shell.
const buildOutlineGeometry = (source) => {
    const geo = (source.index ? source.toNonIndexed() : source.clone());
    const pos = geo.attributes.position;
    const key = (i) => `${pos.getX(i).toFixed(4)},${pos.getY(i).toFixed(4)},${pos.getZ(i).toFixed(4)}`;

    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    const sums = new Map();
    for (let i = 0; i < pos.count; i += 3) {
        a.fromBufferAttribute(pos, i);
        b.fromBufferAttribute(pos, i + 1);
        c.fromBufferAttribute(pos, i + 2);
        // Area-weighted face normal: big faces dominate, slivers don't skew corners.
        const n = b.clone().sub(a).cross(c.clone().sub(a));
        for (let k = 0; k < 3; k++) {
            const id = key(i + k);
            sums.set(id, (sums.get(id) ?? new THREE.Vector3()).add(n));
        }
    }

    const normals = new Float32Array(pos.count * 3);
    const n = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
        n.copy(sums.get(key(i))).normalize();
        normals.set([n.x, n.y, n.z], i * 3);
    }

    const out = new THREE.BufferGeometry();
    out.setAttribute('position', pos);
    out.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    out.boundingSphere = source.boundingSphere?.clone() ?? null;
    if (out.boundingSphere) out.boundingSphere.radius += OUTLINE_WIDTH;
    return out;
}

const _instance = new THREE.Matrix4();

/**
 * Outlines the pile item under the pointer (set by GameObject's pointer handlers).
 * Follows the item every frame, so it stays attached while the pile moves.
 */
export const HoverOutline = () => {
    const ref = useRef(null);
    // One outline geometry per item geometry, built the first time that type is hovered.
    const cache = useMemo(() => new Map(), []);
    useEffect(() => () => cache.forEach(g => g.dispose()), [cache]);

    useFrame(() => {
        const outline = ref.current;
        const { mesh, instanceId } = hovered;
        const show = !!mesh && instanceId >= 0 && useGameStore.getState().status === 'playing';
        outline.visible = show;
        if (!show) return;

        if (!cache.has(mesh.geometry)) cache.set(mesh.geometry, buildOutlineGeometry(mesh.geometry));
        outline.geometry = cache.get(mesh.geometry);

        mesh.getMatrixAt(instanceId, _instance);
        outline.matrix.copy(mesh.matrixWorld).multiply(_instance);
        outline.matrixWorldNeedsUpdate = true;
    });

    return <mesh ref={ref} material={outlineMaterial} matrixAutoUpdate={false} visible={false} />;
}
