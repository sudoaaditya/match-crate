import { useEffect } from "react";
import Experience from "../world/Experience";
import Hud from "./Hud";
import HomeScreen from "./HomeScreen";
import ModeSelect from "./ModeSelect";
import LevelMap from "./LevelMap";
import { MODES } from "../utils/levels";
import { useGameStore } from "../utils/store";

// Dev shortcut: ?level=37&mode=hard jumps straight into a level (ignores locks).
const readUrlLevel = () => {
  const params = new URLSearchParams(window.location.search);
  const id = parseInt(params.get('level'), 10);
  if (!id) return null;
  const mode = MODES[params.get('mode')] ? params.get('mode') : useGameStore.getState().mode;
  return { id, mode };
};

const App = () => {
  const screen = useGameStore(s => s.screen);
  const playLevel = useGameStore(s => s.playLevel);

  useEffect(() => {
    const dev = readUrlLevel();
    if (dev) playLevel(dev.id, dev.mode);
  }, []);

  // The 3D canvas (and the physics engine) only exists on the game screen; menus are plain HTML.
  return (
    <>
      {screen === 'game' && <><Experience /><Hud /></>}
      {screen === 'home' && <HomeScreen />}
      {screen === 'modes' && <ModeSelect />}
      {screen === 'map' && <LevelMap />}
    </>
  );
};

export default App;
