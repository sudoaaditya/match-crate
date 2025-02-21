import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei"
import { useEffect, useMemo, useState } from "react";

import { shades } from '../utils/colors';
import { Physics } from "@react-three/rapier";

import { GameContainer } from "./GameConttainer";
import { GameObject } from "./GameObject";

import { getDevicePixelRatio, getMultiplierOfThree } from "../utils/helpers";

export default function Expericence() {

    const [dpr, setDpr] = useState(getDevicePixelRatio());
    const [frameloop, setFrameloop] = useState('always');

    useEffect(() => {
        const handleVisibilityChange = () => setFrameloop(document.hidden ? 'never' : 'always');
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    const gameObjects = useMemo(() => ([
        { 
            geometry: new THREE.SphereGeometry(0.45, 16, 16), 
            instancesCount: getMultiplierOfThree(), 
            colliderType: "ball", 
            forceCoeff: 1.5 
        },
        { 
            geometry: new THREE.SphereGeometry(0.3, 16, 16), 
            instancesCount: getMultiplierOfThree(), 
            colliderType: "ball", 
            forceCoeff: 1 
        },
        { 
            geometry: new THREE.IcosahedronGeometry(0.2, 16), 
            instancesCount: getMultiplierOfThree(), 
            colliderType: "ball", 
            forceCoeff: 0.2 
        },
        { 
            geometry: new THREE.BoxGeometry(0.9, 0.9, 0.9), 
            instancesCount: getMultiplierOfThree(), 
            colliderType: "cuboid", 
            forceCoeff: 2 
        },
        { 
            geometry: new THREE.BoxGeometry(0.8, 0.2, 0.6), 
            instancesCount: getMultiplierOfThree(), 
            colliderType: "cuboid", 
            forceCoeff: 0.4 
        },
        { 
            geometry: new THREE.BoxGeometry(0.2, 0.4, 0.3), 
            instancesCount: getMultiplierOfThree(), 
            colliderType: "cuboid", 
            forceCoeff: 0.2 
        }
    ]), []);

    let sum = 0;
    gameObjects.map(gm => sum += gm.instancesCount)
    console.log(gameObjects.map(gm => gm.instancesCount), sum);

    return (
        <Canvas
            flat
            camera={{
                fov: 45,
                near: 0.1,
                far: 200,
                position: [0, 12, 0],
            }}
            dpr={dpr}
            frameloop={frameloop}
        >
            <color args={[shades[4]]} attach="background" />
            {/* <OrbitControls makeDefault /> */}
            <ambientLight intensity={2} />

            <Physics /* debug */>

                <GameContainer />
                {gameObjects.map((obj, idx) => 
                    <GameObject 
                        key={idx} 
                        geometry={obj.geometry} 
                        instancesCount={obj.instancesCount}
                        colliderType={obj.colliderType}
                        forceCoeff={obj.forceCoeff}
                    />
                )}
            </Physics>
        </Canvas>
    )
}