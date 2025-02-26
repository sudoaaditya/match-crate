

const getDevicePixelRatio = () => {
    const dPixelRatio = 1.0;
    return Math.min(dPixelRatio, window.devicePixelRatio);
}

const getMultiplierOfThree = () => {
    let number = 15 + Math.floor((Math.random() * 60));
    let mod = number % 3;

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

export {
    getDevicePixelRatio,
    getMultiplierOfThree,
    texRandomizer
}