import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import { getItem, getModelUrl } from "../utils/catalog";
import { getItemGeometry, getItemMaterial, hasItemGeometry, prepareModel, setItemGeometry } from "./itemResources";
import { GameObject } from "./GameObject";

/**
 * Loads a low-poly GLB (suspends until ready), bakes it into one vertex-coloured
 * geometry the first time it's needed, then renders it like any other item group.
 */
export const ModelObject = (props) => {
    const { typeId } = props;
    const { scene } = useGLTF(getModelUrl(typeId));

    const geometry = useMemo(() => {
        if (!hasItemGeometry(typeId)) {
            setItemGeometry(typeId, prepareModel(scene, { recolor: getItem(typeId).recolor }));
        }
        return getItemGeometry(typeId);
    }, [typeId, scene]);

    return <GameObject {...props} geometry={geometry} material={getItemMaterial(typeId)} />;
}
