import { RigidBody } from "@react-three/rapier"
import { BoxGeometry, FrontSide, MeshBasicMaterial } from "three"
import { shades } from "../utils/colors";


export const GameContainer = () => {

    const boxGeometry = new BoxGeometry(1, 1, 1, 2, 2, 2);

    const wallMaterial = new MeshBasicMaterial({
        color: shades[0], transparent: true,
        opacity: 0, alphaTest: 0.1,
        side: FrontSide,
    })

    const wallBottomMaterial = new MeshBasicMaterial({ color: shades[7] })

    return (
        <RigidBody type="fixed" restitution={0.2} friction={0}>

            <mesh
                geometry={boxGeometry}
                material={wallBottomMaterial}
                position={[0, -5, 0]}
                scale={[10, 0.5, 10]}
            />

            <mesh
                geometry={boxGeometry}
                material={wallMaterial}
                position={[-5, 2, 0]}
                scale={[0.5, 20, 10]}
            />

            <mesh
                geometry={boxGeometry}
                material={wallMaterial}
                position={[5, 2, 0]}
                scale={[0.5, 20, 10]}
            />

            <mesh
                geometry={boxGeometry}
                material={wallMaterial}
                position={[0, 2, 5]}
                scale={[10, 20, 0.5]}
            />

            <mesh
                geometry={boxGeometry}
                material={wallMaterial}
                position={[0, 2, -5]}
                scale={[10, 20, 0.5]}
            />
        </RigidBody>
    )
}