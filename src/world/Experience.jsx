import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei"
import { Suspense, useEffect, useMemo, useState } from "react";
import { Physics } from "@react-three/rapier";

import { shades } from '../utils/colors';
import { disposeItemResources, getItem, getItemGeometry, getItemMaterial, getModelUrl, isModelItem } from "../utils/catalog";
import { getDevicePixelRatio, isDebug } from "../utils/helpers";
import { MATCH_SIZE, useGameStore } from "../utils/store";

import { CameraRig } from "./CameraRig";
import { GameContainer } from "./GameContainer";
import { GameObject } from "./GameObject";
import { ModelObject } from "./ModelObject";
import { Tray } from "./Tray";

const DEBUG = isDebug();

// Mounted inside <Suspense>, so the countdown only starts once every asset is loaded.
const GameClock = () => {
    const tick = useGameStore(s => s.tick);
    useFrame((_, delta) => tick(Math.min(delta, 0.1)));
    return null;
}

export default function Experience() {

    const [dpr] = useState(getDevicePixelRatio);
    const [frameloop, setFrameloop] = useState('always');
    const level = useGameStore(s => s.level);
    const runId = useGameStore(s => s.runId);
    const status = useGameStore(s => s.status);

    useEffect(() => {
        const handleVisibilityChange = () => setFrameloop(document.hidden ? 'never' : 'always');
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    useEffect(() => disposeItemResources, []);

    const groups = useMemo(() => {
        if (!level) return [];
        return level.items.map(([typeId, triplets], idx) => ({
            typeId,
            count: triplets * MATCH_SIZE,
            collider: getItem(typeId).collider,
            seed: level.seed * 31 + idx * 977,
        }));
    }, [level]);

    // Kick off every model download in parallel instead of one suspense at a time.
    useMemo(() => groups.filter(g => isModelItem(g.typeId)).forEach(g => useGLTF.preload(getModelUrl(g.typeId))), [groups]);

    return (
        <Canvas
            flat
            camera={{ fov: 45, near: 0.1, far: 200 }}
            dpr={dpr}
            frameloop={frameloop}
        >
            <color args={[shades[4]]} attach="background" />
            <CameraRig />
            {DEBUG && <OrbitControls makeDefault />}

            <ambientLight intensity={1.4} />
            <directionalLight position={[4, 12, 6]} intensity={2.2} />

            <Suspense fallback={null}>
                <Physics key={runId} debug={DEBUG} paused={status !== 'playing'}>
                    <GameContainer />
                    {groups.map(g => isModelItem(g.typeId)
                        ? <ModelObject key={g.typeId} {...g} />
                        : <GameObject
                            key={g.typeId}
                            {...g}
                            geometry={getItemGeometry(g.typeId)}
                            material={getItemMaterial(g.typeId)}
                        />
                    )}
                </Physics>
                <Tray />
                <GameClock />
            </Suspense>
        </Canvas>
    )
}
