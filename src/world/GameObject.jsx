import { RigidBody } from "@react-three/rapier"
import { useRef } from "react"
import { Vector3 } from "three";
import { tints } from "../utils/colors";

export const GameObject = () => {

    const gameObj = useRef(null);

    const getRandomImulse = () => {
        const impulse = new Vector3();

        impulse.x = (Math.random() * 10) * (Math.random() < 0.5 ? -1 : 1);
        impulse.y = (Math.random() * 10) * (Math.random() < 0.5 ? -1 : 1);
        impulse.z = (Math.random() * 10) * (Math.random() < 0.5 ? -1 : 1);

        return impulse;
    }

    const handleClick = (e) => {
        if(gameObj.current) {
            gameObj.current.applyImpulse(getRandomImulse())
        }
    }

    return (
        <RigidBody
            ref={gameObj}
            colliders="ball"
            canSleep={false}
            restitution={0.2}
            friction={1}
            position={[0, 1, 0]}
            linearDamping={0.5}
            angularDamping={0.5}
        >
            <mesh onClick={handleClick}>
                <sphereGeometry args={[0.7, 32, 32]} />
                <meshBasicMaterial color={tints[8]} />
            </mesh>
        </RigidBody>
    )
}