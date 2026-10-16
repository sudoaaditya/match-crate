import { useGameStore } from "../utils/store";
import { HomeIcon, LevelsIcon } from "./Icons";

// Leave the level: Home or Level map. Shared by the pause menu and the result card.
const ExitButtons = () => {
    const quitTo = useGameStore(s => s.quitTo);
    return (
        <div className="card-exits">
            <button className="btn btn-ghost" onClick={() => quitTo('home')}><HomeIcon size={18} /> Home</button>
            <button className="btn btn-ghost" onClick={() => quitTo('map')}><LevelsIcon size={18} /> Level map</button>
        </div>
    );
};

export default ExitButtons;
