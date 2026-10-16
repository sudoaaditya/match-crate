import { lazy, Suspense, useEffect } from "react";
import MenuLayout from "./MenuLayout";
import { useGameStore } from "../utils/store";

// The 3D game (three.js + physics, ~1 MB gzipped) is its own chunk: the menus show
// immediately and the game downloads in the background while the player picks a level.
const loadGameScreen = () => import("./GameScreen");
const GameScreen = lazy(loadGameScreen);

const prefetchGame = () => {
  const idle = window.requestIdleCallback ?? ((fn) => setTimeout(fn, 1200));
  idle(() => loadGameScreen());
};

// Dev shortcut: ?level=37 jumps straight into a level (ignores locks).
const readUrlLevel = () => {
  const params = new URLSearchParams(window.location.search);
  return parseInt(params.get('level'), 10) || null;
};

const Loading = () => <div className="screen screen-loading">Loading…</div>;

const App = () => {
  const screen = useGameStore(s => s.screen);
  const playLevel = useGameStore(s => s.playLevel);

  useEffect(() => {
    const devLevel = readUrlLevel();
    if (devLevel) playLevel(devLevel);
    else prefetchGame();
  }, []);

  // The canvas (and the physics engine) only exists on the game screen; menus are plain HTML.
  return (
    <>
      {screen === 'game' && <Suspense fallback={<Loading />}><GameScreen /></Suspense>}
      {(screen === 'home' || screen === 'map' || screen === 'shop') && <MenuLayout screen={screen} />}
    </>
  );
};

export default App;
