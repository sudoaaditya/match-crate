import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei"
import * as THREE from "three";
import { useMemo } from "react";

import { shades } from '../utils/colors';
import { Physics } from "@react-three/rapier";
import { GameContainer } from "./GameConttainer";
import { GameObject } from "./GameObject";

export default function Expericence() {

    const gameObjects = useMemo(() => ([
        { geometry: new THREE.SphereGeometry(0.45, 16, 16), instancesCount: 40, colliderType: "ball" },
        { geometry: new THREE.SphereGeometry(0.3, 16, 16), instancesCount: 35, colliderType: "ball" },
        { geometry: new THREE.IcosahedronGeometry(0.2, 16), instancesCount: 30, colliderType: "ball" },
        { geometry: new THREE.BoxGeometry(0.9, 0.9, 0.9), instancesCount: 15, colliderType: "cuboid" },
        { geometry: new THREE.BoxGeometry(0.8, 0.2, 0.6), instancesCount: 20, colliderType: "cuboid" },
        { geometry: new THREE.BoxGeometry(0.2, 0.4, 0.3), instancesCount: 15, colliderType: "cuboid" },
        // { geometry: new THREE.ConeGeometry(0.4, 1, 8, 8), instancesCount: 20, colliderType: "trimesh" },
    ]), [])

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
            <ambientLight intensity={2} />

            <Physics /* debug */>

                <GameContainer />
                {gameObjects.map((obj, idx) => 
                    <GameObject 
                        key={idx} 
                        geometry={obj.geometry} 
                        instancesCount={obj.instancesCount}
                        colliderType={obj.colliderType}
                    />
                )}
            </Physics>
        </Canvas>
    )
}