import { useEffect } from "react";
import Experience from "../world/Experience";
import Hud from "./Hud";
import { DEFAULT_MODE, MODES } from "../utils/levels";
import { useGameStore } from "../utils/store";

// Until the menus land (Phase 3), the level and mode come from the URL: ?level=37&mode=hard
const readUrlLevel = () => {
  const params = new URLSearchParams(window.location.search);
  const id = parseInt(params.get('level'), 10) || 1;
  const mode = MODES[params.get('mode')] ? params.get('mode') : DEFAULT_MODE;
  return { id, mode };
};

const App = () => {
  const playLevel = useGameStore(s => s.playLevel);

  useEffect(() => {
    const { id, mode } = readUrlLevel();
    playLevel(id, mode);
  }, []);

  return (
    <>
      <Experience />
      <Hud />
    </>
  );
};

export default App;
