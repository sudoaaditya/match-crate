import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerformanceMonitor, useGLTF } from "@react-three/drei"
import { Suspense, useEffect, useMemo, useState } from "react";
import { Physics } from "@react-three/rapier";

import { shades } from '../utils/colors';
import { getItem, getModelUrl, isModelItem } from "../utils/catalog";
import { disposeItemResources, getItemGeometry, getItemMaterial, releaseUnusedItems } from "./itemResources";
import { boxShape, isDebug, loadQualityTier, qualityTiers, saveQualityTier } from "../utils/helpers";
import { MATCH_SIZE, useGameStore } from "../utils/store";

import { CameraRig } from "./CameraRig";
import { GameContainer } from "./GameContainer";
import { GameObject, PileSettler } from "./GameObject";
import { ModelObject } from "./ModelObject";
import { Tray } from "./Tray";
import { HoverOutline } from "./HoverOutline";

const DEBUG = isDebug();

// Mounted inside <Suspense>, so the countdown only starts once every asset is loaded.
const GameClock = () => {
    const tick = useGameStore(s => s.tick);
    useFrame((_, delta) => tick(Math.min(delta, 0.1)));
    return null;
}

export default function Experience() {

    const [tiers] = useState(qualityTiers);
    const [tier, setTier] = useState(() => Math.min(loadQualityTier(), tiers.length - 1));
    const changeTier = (step) => setTier(t => {
        const next = Math.min(tiers.length - 1, Math.max(0, t + step));
        saveQualityTier(next);
        return next;
    });
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

    // Runs after the previous level's objects have unmounted.
    useEffect(() => {
        if (level) releaseUnusedItems(level.items.map(([typeId]) => typeId));
    }, [level]);

    // Box shape is fixed per attempt (from the screen at level start): physics can't reshape mid-level.
    const box = useMemo(() => level
        ? boxShape(level.box, window.innerWidth, window.innerHeight, level.tray ?? 7)
        : { x: 3.6, z: 3.6 }, [level]);

    const groups = useMemo(() => {
        if (!level) return [];
        // Spread the drop over enough height that items don't spawn inside each other.
        const total = level.items.reduce((sum, [, n]) => sum + n * MATCH_SIZE, 0);
        const floorArea = (2 * box.x - 1) * (2 * box.z - 1);
        const spawnHeight = Math.min(14, Math.max(6, (total * 1.5) / floorArea));
        return level.items.map(([typeId, triplets], idx) => ({
            typeId,
            count: triplets * MATCH_SIZE,
            collider: getItem(typeId).collider,
            seed: level.seed * 31 + idx * 977,
            boxX: box.x,
            boxZ: box.z,
            spawnHeight,
        }));
    }, [level, box]);

    // Kick off every model download in parallel instead of one suspense at a time.
    useMemo(() => groups.filter(g => isModelItem(g.typeId)).forEach(g => useGLTF.preload(getModelUrl(g.typeId))), [groups]);

    return (
        <Canvas
            flat
            camera={{ fov: 45, near: 0.1, far: 200 }}
            dpr={tiers[tier]}
            frameloop={frameloop}
        >
            {/* Drops resolution a step when frames fall behind, raises it again with headroom. */}
            <PerformanceMonitor flipflops={4} onDecline={() => changeTier(1)} onIncline={() => changeTier(-1)} />
            <color args={[shades[4]]} attach="background" />
            <CameraRig box={box} />
            {DEBUG && <OrbitControls makeDefault />}

            <ambientLight intensity={1.4} />
            <directionalLight position={[4, 12, 6]} intensity={2.2} />

            <Suspense fallback={null}>
                <Physics key={runId} debug={DEBUG} paused={status !== 'playing'}>
                    <GameContainer box={box} />
                    <PileSettler />
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
                <HoverOutline />
                <Tray />
                <GameClock />
            </Suspense>
        </Canvas>
    )
}
