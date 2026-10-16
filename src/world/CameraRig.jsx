import { useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import * as THREE from "three";
import { BOX_HALF } from "./GameContainer";

const VIEW_DIR = new THREE.Vector3(0, 1, 0.42).normalize();
const TARGET = new THREE.Vector3(0, -3, 1.2);   // shifted toward the camera so the box sits above the tray

/**
 * Fixed 3/4 top-down camera, pulled back far enough that the whole box fits
 * in both portrait and landscape (bottom ~20% of the screen is reserved for the tray).
 */
export const CameraRig = () => {
    const camera = useThree(s => s.camera);
    const size = useThree(s => s.size);

    useLayoutEffect(() => {
        const aspect = size.width / size.height;
        const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
        const fitWidth = (BOX_HALF + 0.6) / (tanHalf * aspect);
        const fitHeight = (BOX_HALF + 1.2) / (tanHalf * 0.8);
        const distance = Math.max(fitWidth, fitHeight);

        camera.position.copy(TARGET).addScaledVector(VIEW_DIR, distance);
        camera.lookAt(TARGET);
        camera.far = distance + 40;
        camera.updateProjectionMatrix();
        camera.updateMatrixWorld();
    }, [camera, size]);

    return null;
}
