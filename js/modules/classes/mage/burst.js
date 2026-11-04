import { BURST_ACTIVE_SECONDS, BURST_HIT_INTERVAL, BURST_INTERVAL } from '../../../data/constants.js';
import { getMageNodeValue, hasMageCore, MAGE_NODES } from './shared.js';

/** @typedef {import('../../../data/types.js').DamageContext} DamageContext */

/**
 * Potential Charge: riduce il cooldown della burst in base ai kill.
 * @param {DamageContext} context
 * @param {number} kills
 * @returns {{
 *   potentialChargeSeconds: number,
 *   potentialChargeKills: number,
 *   cooldownReduction: number,
 *   burstCooldown: number,
 *   burstCycle: number
 * }}
 */
export function getPotentialChargeEffects(context, kills) {
    const potentialChargeSeconds = getMageNodeValue(context, MAGE_NODES.potentialCharge);
    const potentialChargeKills = Math.min(30, Math.max(0, kills));
    const cooldownReduction = potentialChargeSeconds * potentialChargeKills;

    const baseCooldown = Math.max(0, BURST_INTERVAL - BURST_ACTIVE_SECONDS);
    const burstCooldown = Math.max(0, baseCooldown - cooldownReduction);
    const burstCycle = BURST_ACTIVE_SECONDS + burstCooldown;

    return {
        potentialChargeSeconds,
        potentialChargeKills,
        cooldownReduction,
        burstCooldown,
        burstCycle
    };
}

/**
 * Hits al secondo aggiunti dalla burst, mediati sul ciclo della burst.
 * @param {DamageContext} context
 * @returns {number}
 */
export function getBurstHitsPerSecond(context) {
    if (!context.settings?.useBurst || !hasMageCore(context)) return 0;

    const potentialCharge = getPotentialChargeEffects(
        context,
        context.settings?.potentialChargeKills ?? 0
    );

    return (BURST_ACTIVE_SECONDS / BURST_HIT_INTERVAL) / potentialCharge.burstCycle;
}
