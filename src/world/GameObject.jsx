import { InstancedRigidBodies } from "@react-three/rapier"
import { memo, useMemo, useRef } from "react"
import * as THREE from "three";
import niceColors from 'nice-color-palettes';
import { texRandomizer } from "../utils/helpers";

export const GameObject = memo(({
    geometry = new THREE.SphereGeometry(0.5, 32, 32),
    instancesCount = 15,
    colliderType = "ball",
    forceCoeff = 1
}) => {

    const gameObj = useRef(null);
    const instancedMeshRef = useRef(null);
    const color = niceColors[Math.floor(Math.random() * 25)][Math.floor(Math.random() * 5)];

    const texLoader = useMemo(() => new THREE.TextureLoader(), []);

    const material = useMemo(() => {
        let mat = new THREE.MeshStandardMaterial({ color: color })
        if (colliderType === "ball") {
            const tex = texLoader.load(texRandomizer());
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
            mat.map = tex;
        }
        return mat;
    }, []);

    const getRandomImulse = () => {
        const impulse = new THREE.Vector3();

        impulse.x = (Math.random() * forceCoeff) * (Math.random() < 0.5 ? -1 : 1);
        impulse.y = Math.min(forceCoeff, 0.5);
        impulse.z = (Math.random() * forceCoeff) * (Math.random() < 0.5 ? -1 : 1);

        return impulse;
    }

    const getRandomPos = (limit = 3, isX = true) => {
        const seed = Math.random() * Math.PI * 2;
        return (isX ? Math.sin(seed) : Math.cos(seed)) * (limit) * (seed < 0.5 ? -1 : 1);
    }

    const handleClick = (e) => {
        console.log(e.instanceId)
        if (gameObj.current) {
            gameObj.current[e.instanceId].applyImpulse(getRandomImulse(), true)
        }
    }

    const instancess = useMemo(() => {
        let instance = [];
        for (var i = 0; i < instancesCount; i++) {
            instance.push({
                key: `instance_${i}`,
                position: [getRandomPos(3, true), (Math.random() * 0.5 * (Math.random() < 0.5 ? -1 : 1)), getRandomPos(3, false)]
            })
        }
        return instance;
    }, []);

    /* useEffect(() => {
        // create instanced meshes
        const tempObj = new Object3D();
        for(var i = 0; i < instancesCount; i++) {
            tempObj.position.set(getRandomPos(), 1, getRandomPos());
            tempObj.updateMatrix();
            instancedMeshRef.current.setMatrixAt(i, tempObj.matrix);
        }

        instancedMeshRef.current.instanceMatrix.needsUpdate = true;
    }, []) */

    return (
        <InstancedRigidBodies
            ref={gameObj}
            colliders={colliderType}
            canSleep={false}
            instances={instancess}
            friction={0.1}
            restitution={0}
        >
            <instancedMesh
                ref={instancedMeshRef}
                args={[geometry, material, instancesCount]}
                onClick={handleClick}
            />
        </InstancedRigidBodies>
    )
})

// Maroonish Color : DC465A