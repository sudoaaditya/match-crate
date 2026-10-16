
const shades = [
    '#434e60',
    '#3c4656',
    '#353e4c',
    '#2e3643',
    '#282e39',
    '#212730',
    '#1a1f26',
    '#14171c',
    '#0d0f13',
    '#060709',
    '#000000',
]

const tints = [
    '#434e60',
    '#555f6f',
    '#68717f',
    '#7b838f',
    '#8e949f',
    '#a1a6af',
    '#b3b8bf',
    '#c6c9cf',
    '#d9dbdf',
    '#ecedef',
    '#ffffff',
]

// Item colours: picked to stay distinguishable from each other on the dark background.
const palette = [
    '#e63946', // 0  red
    '#f4a261', // 1  orange
    '#ffd166', // 2  yellow
    '#8ac926', // 3  lime
    '#2a9d8f', // 4  teal
    '#1982c4', // 5  blue
    '#6a4c93', // 6  purple
    '#ff70a6', // 7  pink
    '#f1faee', // 8  white
    '#8d6e63', // 9  brown
    '#4cc9f0', // 10 sky
    '#06d6a0', // 11 mint
    '#b5179e', // 12 magenta
    '#ff9f1c', // 13 amber
    '#adb5bd', // 14 grey
    '#3a0ca3', // 15 indigo
]

// Names for palette indices, used to build catalog ids (e.g. "sphere_red").
const colorNames = [
    'red', 'orange', 'yellow', 'lime', 'teal', 'blue', 'purple', 'pink',
    'white', 'brown', 'sky', 'mint', 'magenta', 'amber', 'grey', 'indigo',
]

// Colour pairs that read as "almost the same" in a busy pile: used by super hard levels.
const lookalikeColors = [
    ['orange', 'amber'],
    ['teal', 'mint'],
    ['blue', 'sky'],
    ['blue', 'indigo'],
    ['purple', 'magenta'],
    ['red', 'pink'],
    ['white', 'grey'],
    ['yellow', 'amber'],
]

export { shades, tints, palette, colorNames, lookalikeColors };