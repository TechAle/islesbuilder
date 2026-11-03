import { ITEM_OVERRIDES } from '../data/itemOverrides.js';

/** @typedef {import('../data/types.js').ItemStats} ItemStats */

/**
 * Cerca un override per nome, senza distinguere maiuscole/minuscole.
 * @param {string} name
 * @param {Record<string, ItemStats>} [overrides]
 * @returns {ItemStats|null}
 */
export function findItemOverride(name, overrides = ITEM_OVERRIDES) {
    const target = name.trim().toLowerCase();
    if (!target) return null;

    const key = Object.keys(overrides).find(entry => entry.trim().toLowerCase() === target);
    return key ? overrides[key] : null;
}

/**
 * Applica gli override a un oggetto: i valori dell'override hanno la precedenza,
 * quelli non presenti restano quelli dell'API.
 * @param {string} name
 * @param {ItemStats} stats
 * @param {Record<string, ItemStats>} [overrides]
 * @returns {ItemStats}
 */
export function applyItemOverride(name, stats, overrides = ITEM_OVERRIDES) {
    const override = findItemOverride(name, overrides);
    if (!override) return stats;

    return { ...stats, ...override };
}
