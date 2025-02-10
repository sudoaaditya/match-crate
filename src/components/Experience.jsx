
import { OrbitControls } from "@react-three/drei"

export default function Expericence() {

    return (<>
        <OrbitControls makeDefault />

        <mesh>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color={"red"} />
        </mesh>
    </>)
}