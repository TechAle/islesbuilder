import { WARRIOR_NODES, getWarriorNodeLevel, getWarriorNodeValue } from './shared.js';

/** @typedef {import('../../../data/types.js').DamageContext} DamageContext */

/** Ogni quanti hit si applica il bonus di Chained Strike. */
export const CHAINED_STRIKE_HIT_INTERVAL = 5;

/**
 * Chained Strike.
 *
 * Ogni 5° hit infligge `val%` in più. Su una sequenza di hit equivalenti il
 * bonus medio è quindi:
 *
 *   damagePercent = val / 5
 *
 * Esempio: 5/5 = 30% sul 5° hit → +6% di danno medio.
 *
 * @param {DamageContext} context
 * @returns {{
 *   visible: boolean,
 *   enabled: boolean,
 *   level: number,
 *   nodePercent: number,
 *   hitInterval: number,
 *   damagePercent: number,
 *   reason: string|null
 * }}
 */
export function getChainedStrikeEffects(context) {
    const nodePercent = getWarriorNodeValue(context, WARRIOR_NODES.chainedStrike);
    const level = getWarriorNodeLevel(context, WARRIOR_NODES.chainedStrike);
    const damagePercent = nodePercent / CHAINED_STRIKE_HIT_INTERVAL;
    const visible = nodePercent > 0;

    return {
        visible,
        enabled: damagePercent > 0,
        level,
        nodePercent,
        hitInterval: CHAINED_STRIKE_HIT_INTERVAL,
        damagePercent,
        reason: visible ? null : 'Requires Chained Strike'
    };
}
