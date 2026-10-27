/**
 * @typedef {Object} ItemStats
 * @property {number|string} [HP]
 * @property {number|string} [Defense]
 * @property {number|string} [Speed]
 * @property {number|string} [Strength]
 * @property {number|string} [Agility]
 * @property {number|string} [Intelligence]
 * @property {number|string} ['Crit Chance']
 * @property {number|string} ['Crit Damage']
 * @property {number|string} ['Mana Regen']
 * @property {Record<string, number|string>} [customStat]
 */

/**
 * @typedef {Object} Augment
 * @property {string} name
 * @property {ItemStats} stats
 */

/**
 * @typedef {Object} ItemPreset
 * @property {string} name
 * @property {ItemStats} stats
 */

/**
 * @typedef {Object} Elixir
 * @property {string} id
 * @property {string} name
 * @property {string} stat
 * @property {number} val
 */

/**
 * @typedef {Object} SkillNode
 * @property {number} x - Percentuale coordinata X (0-100)
 * @property {number} y - Percentuale coordinata Y (0-100)
 * @property {number} max - Livello massimo del nodo
 * @property {number} costBase - Costo base in punti SP
 * @property {boolean} [center] - Se il nodo è il punto d'origine iniziale
 */

/**
 * @typedef {Object} SkillTreeClass
 * @property {Record<string, SkillNode>} nodes
 * @property {Array<[string, string]>} edges
 */

export const APIurl = "https://isleswiki.net/api/v1"

/** @type {Augment[]} */
export let AUGMENT_DATABASE = [
];

/** @type {Record<string, ItemPreset[]>} */
export let ITEM_DATABASE = {
    weapon: [
    ],
    glove: [
    ],
    helmet: [
    ],
    amulet: [
    ],
    chestplate: [
    ],
    ring1: [
    ],
    leggings: [
    ],
    boots: [
    ],
    feet: [
    ],
    core: [
    ],
    pets: [
        // { name: 'Fenice', stats: { HP: 150, 'Mana Regen': 10 } } Per ricordare cosa danno
    ]
};

/** @type {Elixir[]} */
export let INITIAL_ELIXIRS = [
];

/** @type {Record<'warrior'|'archer'|'mage', SkillTreeClass>} */
export let CLASS_SKILL_TREES = {
    warrior: {
        nodes: {
            'C':   { x: 50, y: 50, max: 10, costBase: 1, center: true },
            'UL':  { x: 42, y: 32, max: 8, costBase: 2 }, 'UR': { x: 58, y: 32, max: 8, costBase: 2 },
            'DL':  { x: 42, y: 68, max: 4, costBase: 4 }, 'DR': { x: 58, y: 68, max: 4, costBase: 4 },
            'L':   { x: 28, y: 50, max: 6, costBase: 3 }, 'R':  { x: 72, y: 50, max: 6, costBase: 3 },
            'UL1': { x: 34, y: 16, max: 3, costBase: 2 }, 'UL2':{ x: 43, y: 16, max: 3, costBase: 2 },
            'UR1': { x: 57, y: 16, max: 3, costBase: 2 }, 'UR2':{ x: 66, y: 16, max: 3, costBase: 2 },
            'DL1': { x: 34, y: 84, max: 5, costBase: 2 }, 'DL2':{ x: 43, y: 84, max: 5, costBase: 2 },
            'DR1': { x: 57, y: 84, max: 5, costBase: 2 }, 'DR2':{ x: 66, y: 84, max: 5, costBase: 2 },
            'L1':  { x: 18, y: 32, max: 4, costBase: 1 }, 'L2': { x: 18, y: 68, max: 4, costBase: 1 },
            'L1a': { x: 8,  y: 22, max: 5, costBase: 1 }, 'L1b':{ x: 8,  y: 42, max: 5, costBase: 1 },
            'L2a': { x: 8,  y: 58, max: 5, costBase: 1 }, 'L2b':{ x: 8,  y: 78, max: 5, costBase: 1 },
            'R1':  { x: 82, y: 32, max: 4, costBase: 1 }, 'R2': { x: 82, y: 68, max: 4, costBase: 1 },
            'R1a': { x: 92, y: 22, max: 5, costBase: 1 }, 'R1b':{ x: 92, y: 42, max: 5, costBase: 1 },
            'R2a': { x: 92, y: 58, max: 5, costBase: 1 }, 'R2b':{ x: 92, y: 78, max: 5, costBase: 1 }
        },
        edges: [
            ['C','L'], ['C','R'], ['C','UL'], ['C','UR'], ['C','DL'], ['C','DR'],
            ['UL','UL1'], ['UL','UL2'], ['UR','UR1'], ['UR','UR2'],
            ['DL','DL1'], ['DL','DL2'], ['DR','DR1'], ['DR','DR2'],
            ['L','L1'], ['L','L2'], ['R','R1'], ['R','R2'],
            ['L1','L1a'], ['L1','L1b'], ['L2','L2a'], ['L2','L2b'],
            ['R1','R1a'], ['R1','R1b'], ['R2','R2a'], ['R2','R2b']
        ]
    },
    archer: {
        nodes: {
            'C':   { x: 50, y: 50, max: 10, costBase: 1, center: true },
            'UL':  { x: 42, y: 32, max: 5, costBase: 3 }, 'UR': { x: 58, y: 32, max: 5, costBase: 3 },
            'DL':  { x: 42, y: 68, max: 5, costBase: 3 }, 'DR': { x: 58, y: 68, max: 5, costBase: 3 },
            'L':   { x: 30, y: 50, max: 5, costBase: 3 }, 'R':  { x: 70, y: 50, max: 5, costBase: 3 },
            'UL1': { x: 34, y: 16, max: 5, costBase: 1 }, 'UL2':{ x: 43, y: 16, max: 5, costBase: 1 },
            'UR1': { x: 57, y: 16, max: 5, costBase: 1 }, 'UR2':{ x: 66, y: 16, max: 5, costBase: 1 },
            'DL1': { x: 34, y: 84, max: 5, costBase: 1 }, 'DL2':{ x: 43, y: 84, max: 5, costBase: 1 },
            'DR1': { x: 57, y: 84, max: 5, costBase: 1 }, 'DR2':{ x: 66, y: 84, max: 5, costBase: 1 },
            'L1':  { x: 20, y: 32, max: 5, costBase: 1 }, 'L2': { x: 20, y: 68, max: 5, costBase: 1 },
            'L1a': { x: 10, y: 22, max: 5, costBase: 1 }, 'L1b':{ x: 10, y: 42, max: 5, costBase: 1 },
            'L2a': { x: 10, y: 58, max: 5, costBase: 1 }, 'L2b':{ x: 10, y: 78, max: 5, costBase: 1 },
            'R1':  { x: 80, y: 32, max: 5, costBase: 1 }, 'R2': { x: 80, y: 68, max: 5, costBase: 1 },
            'R1a': { x: 90, y: 22, max: 5, costBase: 1 }, 'R1b':{ x: 90, y: 42, max: 5, costBase: 1 },
            'R2a': { x: 90, y: 58, max: 5, costBase: 1 }, 'R2b':{ x: 90, y: 78, max: 5, costBase: 1 }
        },
        edges: [
            ['C','L'], ['C','R'], ['C','UL'], ['C','UR'], ['C','DL'], ['C','DR'],
            ['UL','UL1'], ['UL','UL2'], ['UR','UR1'], ['UR','UR2'],
            ['DL','DL1'], ['DL','DL2'], ['DR','DR1'], ['DR','DR2'],
            ['L','L1'], ['L','L2'], ['R','R1'], ['R','R2'],
            ['L1','L1a'], ['L1','L1b'], ['L2','L2a'], ['L2','L2b'],
            ['R1','R1a'], ['R1','R1b'], ['R2','R2a'], ['R2','R2b']
        ]
    },
    mage: {
        nodes: {
            'C':   { x: 50, y: 50, max: 12, costBase: 1, center: true },
            'UL':  { x: 38, y: 30, max: 6, costBase: 2 }, 'UR': { x: 62, y: 30, max: 6, costBase: 2 },
            'DL':  { x: 38, y: 70, max: 6, costBase: 2 }, 'DR': { x: 62, y: 70, max: 6, costBase: 2 },
            'L':   { x: 26, y: 50, max: 4, costBase: 4 }, 'R':  { x: 74, y: 50, max: 4, costBase: 4 },
            'UL1': { x: 28, y: 14, max: 4, costBase: 3 }, 'UL2':{ x: 42, y: 14, max: 4, costBase: 3 },
            'UR1': { x: 58, y: 14, max: 4, costBase: 3 }, 'UR2':{ x: 72, y: 14, max: 4, costBase: 3 },
            'DL1': { x: 28, y: 86, max: 4, costBase: 3 }, 'DL2':{ x: 42, y: 86, max: 4, costBase: 3 },
            'DR1': { x: 58, y: 86, max: 4, costBase: 3 }, 'DR2':{ x: 72, y: 86, max: 4, costBase: 3 },
            'L1':  { x: 16, y: 36, max: 5, costBase: 2 }, 'L2': { x: 16, y: 64, max: 5, costBase: 2 },
            'L1a': { x: 6,  y: 26, max: 3, costBase: 2 }, 'L1b':{ x: 6,  y: 44, max: 3, costBase: 2 },
            'L2a': { x: 6,  y: 56, max: 3, costBase: 2 }, 'L2b':{ x: 6,  y: 74, max: 3, costBase: 2 },
            'R1':  { x: 84, y: 36, max: 5, costBase: 2 }, 'R2': { x: 84, y: 64, max: 5, costBase: 2 },
            'R1a': { x: 94, y: 26, max: 3, costBase: 2 }, 'R1b':{ x: 94, y: 44, max: 3, costBase: 2 },
            'R2a': { x: 94, y: 56, max: 3, costBase: 2 }, 'R2b':{ x: 94, y: 74, max: 3, costBase: 2 }
        },
        edges: [
            ['C','L'], ['C','R'], ['C','UL'], ['C','UR'], ['C','DL'], ['C','DR'],
            ['UL','UL1'], ['UL','UL2'], ['UR','UR1'], ['UR','UR2'],
            ['DL','DL1'], ['DL','DL2'], ['DR','DR1'], ['DR','DR2'],
            ['L','L1'], ['L','L2'], ['R','R1'], ['R','R2'],
            ['L1','L1a'], ['L1','L1b'], ['L2','L2a'], ['L2','L2b'],
            ['R1','R1a'], ['R1','R1b'], ['R2','R2a'], ['R2','R2b']
        ]
    }
};