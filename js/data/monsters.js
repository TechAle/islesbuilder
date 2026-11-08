/**
 * @typedef {Object} MonsterPreset
 * @property {string} id
 * @property {string} name
 * @property {number} health
 * @property {number} defense
 * @property {Record<string, number>} resistances - Resistenza per elemento (es. { radiant: -20 })
 */

/** @type {MonsterPreset[]} */
export const MONSTER_PRESETS = [
    { id: 'goblin', name: 'Goblin', health: 162, defense: 7, resistances: {} },
    { id: 'tooms', name: 'Tooms', health: 117, defense: 16, resistances: {} },
    { id: 'citizen', name: 'Citizen', health: 386, defense: 125, resistances: {} },
    {
        id: 'maw',
        name: 'Maw',
        health: 25797,
        defense: 100,
        resistances: { void: 20, radiant: -20 }
    },
    {
        id: 'void-storm',
        name: 'Void Storm',
        health: 101562,
        defense: 110,
        resistances: {}
    }
];

/**
 * Resistenza del mostro per un elemento.
 * @param {MonsterPreset|null|undefined} monster
 * @param {string|null|undefined} element
 * @returns {number}
 */
export function getMonsterResistance(monster, element) {
    const key = String(element ?? '').trim().toLowerCase();
    if (!monster || !key) return 0;
    return monster.resistances[key] ?? 0;
}

/**
 * Damage% di default: una resistenza negativa aumenta il danno.
 * Esempio: Maw ha -20% radiant → +20% damage.
 * @param {MonsterPreset|null|undefined} monster
 * @param {string|null|undefined} element
 * @returns {number}
 */
export function getDefaultDamagePercent(monster, element) {
    const value = -getMonsterResistance(monster, element);
    return value === 0 ? 0 : value;
}
