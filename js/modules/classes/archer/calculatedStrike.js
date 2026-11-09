import { ARCHER_NODES, getArcherNodeValue } from './shared.js';

/** @typedef {import('../../../data/types.js').DamageContext} DamageContext */

/**
 * Calculated Strike: ogni kill ha una probabilità di resettare il cooldown
 * dell'attacco. Un reset vale un attacco immediato in più, quindi il bonus
 * non è una riduzione percentuale del cooldown ma attacchi extra al secondo:
 *
 *   reset/s = (valore nodo / 100) × kill/s
 *
 * @param {DamageContext} context
 * @param {number} killsPerSecond
 * @returns {{
 *   calculatedStrikePercent: number,
 *   killsPerSecond: number,
 *   extraAttacksPerSecond: number
 * }}
 */
export function getCalculatedStrikeEffects(context, killsPerSecond) {
    const calculatedStrikePercent = getArcherNodeValue(
        context,
        ARCHER_NODES.calculatedStrike
    );
    const kills = Math.min(4, Math.max(0, Number(killsPerSecond) || 0));
    const extraAttacksPerSecond = (calculatedStrikePercent / 100) * kills;

    return {
        calculatedStrikePercent,
        killsPerSecond: kills,
        extraAttacksPerSecond
    };
}
