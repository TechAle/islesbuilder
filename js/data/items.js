import './types.js';

/** @type {Record<string, import('./types.js').ItemPreset[]>} */
export const ITEM_DATABASE = {
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
    ring: [
    ],
    leggings: [
    ],
    boots: [
    ],
    feet: [
    ],
    core: [
        {name: "Archer Core", stats: {"Pierce Damage": "20%"}},
        {name: "Assassin Core", stats: {"Stab Damage": "20%"}}
    ],
    pets: [
        // { name: 'Fenice', stats: { HP: 150, 'Mana Regen': 10 } } Per ricordare cosa danno
    ]
};
