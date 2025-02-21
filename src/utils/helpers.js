

const getDevicePixelRatio = () => {
    const dPixelRatio = 1.0;
    return Math.min(dPixelRatio, window.devicePixelRatio);
}

const getMultiplierOfThree = () => {
    let number = 21 + Math.floor((Math.random() * 60));
    let mod = number % 3;

    return mod === 0 ? number : (number - mod);
}

export {
    getDevicePixelRatio,
    getMultiplierOfThree
}