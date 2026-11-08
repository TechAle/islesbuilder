import { MAX_AUGMENTS_PER_ITEM } from '../../js/data/constants.js';

/** @returns {import('../../js/data/types.js').EquipSlotData} */
export function makeEmptySlot() {
    return {
        name: '',
        stats: {},
        augments: Array(MAX_AUGMENTS_PER_ITEM).fill(''),
        upgradeLevel: 0,
        abilitiesEdited: false
    };
}

/**
 * @param {Object} [options]
 * @param {{name: string, stats: Record<string, any>}|null} [options.weapon]
 * @param {{name: string, stats: Record<string, any>}|null} [options.core]
 * @param {Array<{name: string, stats: Record<string, any>}|null>} [options.armor]
 * @param {string[]} [options.augments]
 * @param {number} [options.upgradeLevel]
 * @param {Record<string, number>|Map<string, number>} [options.treeLevels]
 * @param {string} [options.currentClass]
 * @param {Array<{stat: string, val: number, perLevel: number, percent: boolean}>} [options.elixirs]
 * @returns {any}
 */
export function makeBuild({
    weapon = null,
    core = null,
    armor = [],
    augments = [],
    upgradeLevel = 0,
    treeLevels = {},
    currentClass = 'mage',
    elixirs = []
} = {}) {
    const activeEquip = {};
    for (const slot of ['weapon', 'glove', 'helmet', 'amulet', 'chestplate', 'ring1', 'ring2', 'leggings', 'boots', 'feet', 'core', 'pets']) {
        activeEquip[slot] = makeEmptySlot();
    }

    if (weapon) {
        activeEquip.weapon = {
            ...makeEmptySlot(),
            ...weapon,
            stats: { ...(weapon.stats || {}) },
            upgradeLevel,
            augments: [...augments, '', ''].slice(0, MAX_AUGMENTS_PER_ITEM)
        };
    }

    if (core) {
        activeEquip.core = {
            ...makeEmptySlot(),
            ...core,
            stats: { ...(core.stats || {}) }
        };
    }

    armor.forEach((item, index) => {
        if (!item) return;
        const slot = ['helmet', 'chestplate', 'leggings', 'boots'][index];
        if (!slot) return;
        activeEquip[slot] = {
            ...makeEmptySlot(),
            ...item,
            stats: { ...(item.stats || {}) }
        };
    });

    const mageLevels = treeLevels instanceof Map
        ? treeLevels
        : new Map(Object.entries(treeLevels).filter(([, level]) => level > 0));

    return {
        sharedPoints: 80,
        currentClass,
        activeEquip,
        elixirs,
        treeLevels: {
            warrior: new Map(),
            archer: new Map(),
            mage: mageLevels
        }
    };
}

/** @param {Record<string, any>} [overrides] */
export function makeSettings(overrides = {}) {
    return {
        slowAttack: false,
        attackInterval: null,
        useBurst: false,
        griefUptime: 100,
        lastSorrowUptime: 100,
        focusStacks: 0,
        potentialChargeKills: 0,
        crystalExplosionOverride: false,
        crystalExplosionsPerSecond: 0,
        disabledSpecialAttacks: [],
        abilityCooldownOverrides: {},
        abilityHitCountOverrides: {},
        abilityDamageOverrides: {},
        executionHpPercent: 50,
        prosecutionHpPercent: 50,
        enragedHpPercent: 100,
        infectedHitsOverride: 0,
        deathburstKillsPerSecond: 0.2,
        ...overrides
    };
}

/** @param {Record<string, any>} [statsOverrides] */
export function makeArcaneWeapon(statsOverrides = {}) {
    return {
        name: 'Test Weapon',
        stats: {
            'Damage Type': 'Arcane',
            'Default Attack': 100,
            'Weapon Type': 'magic',
            'Arcane Damage': 100,
            ...statsOverrides
        }
    };
}

export const MAGE_CORE = {
    name: 'Mage Core',
    stats: { 'Arcane Damage': '20%' }
};
