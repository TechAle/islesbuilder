import { MAX_ITEM_UPGRADE_LEVEL } from '../data/constants.js';

/** @typedef {import('../data/types.js').EquipSlotData} EquipSlotData */

/**
 * Legge il livello base dell'oggetto.
 * @param {EquipSlotData|{stats?: Record<string, any>}|null|undefined} item
 * @returns {number}
 */
export function getItemBaseLevel(item) {
    const raw = item?.stats?.['Level'];
    const value = typeof raw === 'number' ? raw : Number.parseFloat(String(raw ?? ''));
    return Number.isFinite(value) ? value : 0;
}

/**
 * Livello massimo di upgrade per un oggetto.
 * Il livello finale non può superare MAX_ITEM_UPGRADE_LEVEL.
 * @param {EquipSlotData|{stats?: Record<string, any>}|null|undefined} item
 * @returns {number}
 */
export function getMaxUpgradeLevel(item) {
    return Math.max(0, MAX_ITEM_UPGRADE_LEVEL - getItemBaseLevel(item));
}

/**
 * Limita il livello di upgrade dell'oggetto.
 * @param {EquipSlotData|{stats?: Record<string, any>}|null|undefined} item
 * @param {number} value
 * @returns {number}
 */
export function clampUpgradeLevel(item, value) {
    const parsed = Number.isFinite(value) ? Math.trunc(value) : 0;
    return Math.min(getMaxUpgradeLevel(item), Math.max(0, parsed));
}
