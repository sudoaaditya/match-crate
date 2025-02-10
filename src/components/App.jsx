import { Canvas } from "@react-three/fiber";
import Expericence from "./Experience";

const App = () => {
  return (
    <Canvas
      flat
      camera={{
        fov: 45,
        near: 0.1,
        far: 200,
        position: [1, 2, 6],
      }}
    >
      <Expericence />
    </Canvas>
  );
};

export default App;
