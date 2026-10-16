import { useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import * as THREE from "three";
import { useGameStore } from "../utils/store";
import { playRegion } from "../utils/helpers";
import { FLOOR_Y } from "./GameContainer";

const VIEW_DIR = new THREE.Vector3(0, 1, 0.42).normalize();
const PILE_HEIGHT = 2.2;     // world units of pile above the floor to keep in frame

const _v = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3();

/**
 * Fixed 3/4 top-down camera, framed so the level's box fills the space between the HUD
 * and the tray + booster row on any aspect ratio. Projects the box corners and corrects
 * distance and aim a few times (cheap; only runs on resize or level change).
 */
export const CameraRig = ({ box }) => {
    const camera = useThree(s => s.camera);
    const size = useThree(s => s.size);
    const capacity = useGameStore(s => s.trayCapacity);

    useLayoutEffect(() => {
        const { width, height } = size;
        const region = playRegion(width, height, capacity);

        const corners = [];
        for (const x of [-box.x, box.x]) for (const z of [-box.z, box.z]) for (const y of [FLOOR_Y, FLOOR_Y + PILE_HEIGHT]) {
            corners.push(new THREE.Vector3(x, y, z));
        }

        const target = new THREE.Vector3(0, FLOOR_Y + 1, 0);
        let distance = 20;
        for (let i = 0; i < 8; i++) {
            camera.position.copy(target).addScaledVector(VIEW_DIR, distance);
            camera.lookAt(target);
            camera.updateMatrixWorld();
            camera.updateProjectionMatrix();

            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            for (const c of corners) {
                _v.copy(c).project(camera);
                const px = (_v.x + 1) / 2 * width, py = (1 - _v.y) / 2 * height;
                minX = Math.min(minX, px); maxX = Math.max(maxX, px);
                minY = Math.min(minY, py); maxY = Math.max(maxY, py);
            }

            // Fit: on-screen size is roughly inversely proportional to distance.
            const scale = Math.max((maxX - minX) / (region.right - region.left), (maxY - minY) / (region.bottom - region.top));
            // Centre: slide the aim point in the screen plane by the pixel error.
            const worldPerPx = (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * distance) / height;
            _right.setFromMatrixColumn(camera.matrixWorld, 0);
            _up.setFromMatrixColumn(camera.matrixWorld, 1);
            target.addScaledVector(_right, ((minX + maxX) / 2 - (region.left + region.right) / 2) * worldPerPx);
            target.addScaledVector(_up, -((minY + maxY) / 2 - (region.top + region.bottom) / 2) * worldPerPx);
            distance *= THREE.MathUtils.clamp(scale, 0.5, 2);
        }

        camera.position.copy(target).addScaledVector(VIEW_DIR, distance);
        camera.lookAt(target);
        camera.far = distance + 40;
        camera.updateProjectionMatrix();
        camera.updateMatrixWorld();
    }, [camera, size, box, capacity]);

    return null;
}
