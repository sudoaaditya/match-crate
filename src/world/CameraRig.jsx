import { useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import * as THREE from "three";
import { useGameStore } from "../utils/store";

const VIEW_DIR = new THREE.Vector3(0, 1, 0.42).normalize();

/**
 * Fixed 3/4 top-down camera, pulled back far enough that the level's box fits
 * in both portrait and landscape (bottom ~20% of the screen is reserved for the tray).
 */
export const CameraRig = () => {
    const camera = useThree(s => s.camera);
    const size = useThree(s => s.size);
    const half = useGameStore(s => s.level?.box ?? 3.6);

    useLayoutEffect(() => {
        const aspect = size.width / size.height;
        const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
        const fitWidth = (half + 0.6) / (tanHalf * aspect);
        const fitHeight = (half + 1.2) / (tanHalf * 0.8);
        const distance = Math.max(fitWidth, fitHeight);

        // Aim slightly toward the camera so the box sits above the tray.
        const target = new THREE.Vector3(0, -3, half / 3);
        camera.position.copy(target).addScaledVector(VIEW_DIR, distance);
        camera.lookAt(target);
        camera.far = distance + 40;
        camera.updateProjectionMatrix();
        camera.updateMatrixWorld();
    }, [camera, size, half]);

    return null;
}
