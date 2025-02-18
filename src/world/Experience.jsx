import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei"

import { shades } from '../utils/colors';
import { Physics } from "@react-three/rapier";
import { GameContainer } from "./GameConttainer";
import { GameObject } from "./GameObject";

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

            <Physics debug>

                <GameContainer />
                <GameObject />
            </Physics>
        </Canvas>
    )
}