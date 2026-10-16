import Experience from "../world/Experience";
import Hud from "./Hud";

// The in-game screen. Loaded lazily by App: it brings three.js, react-three-fiber and
// the physics engine, none of which the menus need.
const GameScreen = () => (
    <>
        <Experience />
        <Hud />
    </>
);

export default GameScreen;
