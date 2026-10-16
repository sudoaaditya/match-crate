import { RigidBody } from "@react-three/rapier"
import { BoxGeometry, MeshStandardMaterial } from "three"
import { shades } from "../utils/colors";

// Shared across renders/levels: created once at module load.
const boxGeometry = new BoxGeometry(1, 1, 1);
const floorMaterial = new MeshStandardMaterial({ color: shades[7], roughness: 0.9 });

export const FLOOR_Y = -4.75;   // top surface of the floor slab
const WALL_HEIGHT = 20;

// `box` holds the half-extents { x, z }, sized per level and screen shape (helpers.boxShape).
// Walls are invisible (not rendered at all); `includeInvisible` still gives them colliders.
export const GameContainer = ({ box = { x: 3.6, z: 3.6 } }) => {
    const { x, z } = box;
    return (
        <RigidBody type="fixed" restitution={0.2} friction={0.3} includeInvisible>

            <mesh
                geometry={boxGeometry}
                material={floorMaterial}
                position={[0, -5, 0]}
                scale={[x * 2, 0.5, z * 2]}
            />

            <mesh visible={false} geometry={boxGeometry} position={[-x, 2, 0]} scale={[0.5, WALL_HEIGHT, z * 2]} />
            <mesh visible={false} geometry={boxGeometry} position={[x, 2, 0]} scale={[0.5, WALL_HEIGHT, z * 2]} />
            <mesh visible={false} geometry={boxGeometry} position={[0, 2, z]} scale={[x * 2, WALL_HEIGHT, 0.5]} />
            <mesh visible={false} geometry={boxGeometry} position={[0, 2, -z]} scale={[x * 2, WALL_HEIGHT, 0.5]} />
        </RigidBody>
    )
}
