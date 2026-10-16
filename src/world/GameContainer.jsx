import { RigidBody } from "@react-three/rapier"
import { BoxGeometry, MeshStandardMaterial } from "three"
import { shades } from "../utils/colors";

// Shared across renders/levels: created once at module load.
const boxGeometry = new BoxGeometry(1, 1, 1);
const floorMaterial = new MeshStandardMaterial({ color: shades[7], roughness: 0.9 });

export const FLOOR_Y = -4.75;   // top surface of the floor slab
const WALL_HEIGHT = 20;

// `half` is the box's half-width, sized per level (levels.js).
// Walls are invisible (not rendered at all); `includeInvisible` still gives them colliders.
export const GameContainer = ({ half = 3.6 }) => {
    return (
        <RigidBody type="fixed" restitution={0.2} friction={0.3} includeInvisible>

            <mesh
                geometry={boxGeometry}
                material={floorMaterial}
                position={[0, -5, 0]}
                scale={[half * 2, 0.5, half * 2]}
            />

            <mesh visible={false} geometry={boxGeometry} position={[-half, 2, 0]} scale={[0.5, WALL_HEIGHT, half * 2]} />
            <mesh visible={false} geometry={boxGeometry} position={[half, 2, 0]} scale={[0.5, WALL_HEIGHT, half * 2]} />
            <mesh visible={false} geometry={boxGeometry} position={[0, 2, half]} scale={[half * 2, WALL_HEIGHT, 0.5]} />
            <mesh visible={false} geometry={boxGeometry} position={[0, 2, -half]} scale={[half * 2, WALL_HEIGHT, 0.5]} />
        </RigidBody>
    )
}
