import { useEffect } from "react";
import Experience from "../world/Experience";
import Hud from "./Hud";
import { TEST_LEVEL } from "../utils/levels";
import { useGameStore } from "../utils/store";

const App = () => {
  const startLevel = useGameStore(s => s.startLevel);

  useEffect(() => startLevel(TEST_LEVEL), []);

  return (
    <>
      <Experience />
      <Hud />
    </>
  );
};

export default App;
