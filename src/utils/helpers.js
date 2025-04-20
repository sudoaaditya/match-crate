const LEVELS = {
    EASY: 0,
    MEDIUM: 1,
    HARD: 2,
    EXPERT: 3,
    INSANE: 4,
}

const getDevicePixelRatio = () => {
    const dPixelRatio = 1.0;
    return Math.min(dPixelRatio, window.devicePixelRatio);
}

const getMultiplierOfThree = (gameLevel = LEVELS.EASY) => {
    const MIN = 3, MAX = 18;
    let number = (MIN * gameLevel) + Math.floor((Math.random() * (MAX * (gameLevel !== 0 ? gameLevel : 1))));
    let mod = number % MIN;

    return mod === 0 ? number : (number - mod);
}

const texRandomizer = () => {
    const texArray = [
        '/assets/textures/bw_stripes_1.jpg',
        '/assets/textures/bw_stripes_2.jpg',
        '/assets/textures/bw_stripes_3.jpg',
        '/assets/textures/bw_stripes_4.jpg',
        '/assets/textures/bw_stripes_5.jpg',
        '/assets/textures/bw_stripes_6.jpg',
        '/assets/textures/bw_stripes_7.jpg',
        '/assets/textures/bw_stripes_8.png',
        '/assets/textures/bw_stripes_9.png',
    ];

    let randomTexIdx = Math.floor(Math.random() * texArray.length)
    return texArray[randomTexIdx];
}

const modelRandomizer = (requiredUrls = 2) => {
    const modelArray = [
        '/assets/models/Ambulance_Car.glb',
        '/assets/models/Bike.glb',
        '/assets/models/Helicopter.glb',
        '/assets/models/Jeep.glb',
        '/assets/models/Light_Tank.glb',
        '/assets/models/Military_Boat.glb',
        '/assets/models/Military_Motorbike.glb',
        '/assets/models/Tank.glb',
        '/assets/models/Truck.glb'
    ];

    let randomModelUrls = [];
    while (randomModelUrls.length < requiredUrls) {
        let randomModelIdx = Math.floor(Math.random() * modelArray.length);
        if (!randomModelUrls.includes(modelArray[randomModelIdx])) {
            randomModelUrls.push(modelArray[randomModelIdx]);
        }
    }

    return randomModelUrls;

}

export {
    getDevicePixelRatio,
    getMultiplierOfThree,
    texRandomizer,
    modelRandomizer
}