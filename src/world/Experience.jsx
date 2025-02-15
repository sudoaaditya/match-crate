import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei"

import { shades } from '../utils/colors';

export default function Expericence() {
    return (
        <Canvas
            flat
            camera={{
                fov: 45,
                near: 0.1,
                far: 200,
                position: [0, 12, 0],
            }}
        >
            <color args={[shades[4]]} attach="background" />
            <OrbitControls makeDefault />

            <mesh>
                <boxGeometry args={[1, 1, 1]} />
                <meshBasicMaterial color={"red"} />
            </mesh>
        </Canvas>
    )
}