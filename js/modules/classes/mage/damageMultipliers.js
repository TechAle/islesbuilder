import { getMageNodeValue, MAGE_NODES } from './shared.js';

/** @typedef {import('../../../data/types.js').DamageContext} DamageContext */

/**
 * Grief Infliction: percentuale di danno extra subita dai nemici afflitti.
 * @param {DamageContext} context
 * @returns {number}
 */
export function getGriefInflictionPercent(context) {
    return getMageNodeValue(context, MAGE_NODES.griefInfliction);
}

/**
 * Grief Infliction applicato all'uptime scelto.
 * @param {DamageContext} context
 * @param {number} uptimePercent
 * @returns {{griefInflictionPercent: number, griefUptime: number, griefDamagePercent: number}}
 */
export function getGriefInflictionEffects(context, uptimePercent) {
    const griefInflictionPercent = getGriefInflictionPercent(context);
    const griefUptime = Math.min(100, Math.max(0, uptimePercent));
    const griefDamagePercent = griefInflictionPercent * (griefUptime / 100);

    return { griefInflictionPercent, griefUptime, griefDamagePercent };
}

/**
 * Last Sorrow: danno extra sul colpo successivo quando Grief scade.
 * @param {DamageContext} context
 * @returns {number}
 */
export function getLastSorrowPercent(context) {
    return getMageNodeValue(context, MAGE_NODES.lastSorrow);
}

/**
 * Last Sorrow applicato all'uptime scelto.
 * @param {DamageContext} context
 * @param {number} uptimePercent
 * @returns {{lastSorrowPercent: number, lastSorrowUptime: number, lastSorrowDamagePercent: number}}
 */
export function getLastSorrowEffects(context, uptimePercent) {
    const lastSorrowPercent = getLastSorrowPercent(context);
    const lastSorrowUptime = Math.min(100, Math.max(0, uptimePercent));
    const lastSorrowDamagePercent = lastSorrowPercent * (lastSorrowUptime / 100);

    return { lastSorrowPercent, lastSorrowUptime, lastSorrowDamagePercent };
}

/**
 * Focus Stacks: danno% per stack e capacità massima.
 * @param {DamageContext} context
 * @returns {{focusStacksPercent: number, focusCapacity: number, maxStacks: number}}
 */
export function getFocusStacks(context) {
    const focusStacksPercent = getMageNodeValue(context, MAGE_NODES.focusStacks);
    const focusCapacity = getMageNodeValue(context, MAGE_NODES.focusCapacity);

    return {
        focusStacksPercent,
        focusCapacity,
        maxStacks: 3 + focusCapacity
    };
}

/**
 * Focus Stacks applicati agli stack medi scelti, con clamp alla capacità.
 * @param {DamageContext} context
 * @param {number} selectedStacks
 * @returns {{
 *   focusStacksPercent: number,
 *   focusCapacity: number,
 *   maxStacks: number,
 *   focusStacks: number,
 *   focusDamagePercent: number
 * }}
 */
export function getFocusStacksEffects(context, selectedStacks) {
    const focus = getFocusStacks(context);
    const focusStacks = Math.min(focus.maxStacks, Math.max(0, selectedStacks));
    const focusDamagePercent = focusStacks * focus.focusStacksPercent;

    return {
        ...focus,
        focusStacks,
        focusDamagePercent
    };
}
