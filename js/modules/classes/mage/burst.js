import { BURST_ACTIVE_SECONDS, BURST_HIT_INTERVAL, BURST_INTERVAL } from '../../../data/constants.js';
import { getAugmentEffects } from '../../augmentManager.js';
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
 * Ciclo effettivo della burst, considerando sia Potential Charge sia i reset
 * di Ultimate Cooldown (Second Wind).
 *
 * Second Wind è un processo di reset: con rate λ = kills/s × chance, il tempo
 * atteso per il prossimo reset entro il cooldown C è
 * `(1 - e^(-λC)) / λ`. Il cooldown interno dell'augment limita λ.
 *
 * @param {DamageContext} context
 * @returns {{
 *   potentialChargeSeconds: number,
 *   potentialChargeKills: number,
 *   cooldownReduction: number,
 *   burstCooldown: number,
 *   effectiveBurstCooldown: number,
 *   burstCycle: number,
 *   burstCastsPerSecond: number,
 *   secondWindChancePercent: number,
 *   secondWindCooldownSeconds: number,
 *   secondWindResetsPerSecond: number,
 *   hasSecondWind: boolean
 * }}
 */
export function getBurstCycleEffects(context) {
    const potentialCharge = getPotentialChargeEffects(
        context,
        context.settings?.potentialChargeKills ?? 0
    );
    const augmentEffects = getAugmentEffects(context);

    const secondWindChancePercent = Math.max(
        0,
        augmentEffects.secondWindChancePercent
    );
    const secondWindCooldownSeconds = Math.max(
        0,
        augmentEffects.secondWindCooldownSeconds
    );
    const killsSetting = Number(context.settings?.ultimateKillsPerSecond);
    const killsPerSecond = Number.isFinite(killsSetting)
        ? Math.max(0, killsSetting)
        : 0;

    const resetRate = secondWindChancePercent > 0 && secondWindCooldownSeconds > 0
        ? Math.min(
            killsPerSecond * (secondWindChancePercent / 100),
            1 / secondWindCooldownSeconds
        )
        : 0;

    // Cooldown atteso quando i reset di Second Wind possono accorciarlo.
    const effectiveBurstCooldown = resetRate > 0
        ? (1 - Math.exp(-resetRate * potentialCharge.burstCooldown)) / resetRate
        : potentialCharge.burstCooldown;
    const burstCycle = BURST_ACTIVE_SECONDS + effectiveBurstCooldown;

    return {
        ...potentialCharge,
        effectiveBurstCooldown,
        burstCycle,
        burstCastsPerSecond: burstCycle > 0 ? 1 / burstCycle : 0,
        secondWindChancePercent,
        secondWindCooldownSeconds,
        secondWindResetsPerSecond: resetRate,
        hasSecondWind: augmentEffects.hasSecondWind
    };
}

/**
 * Hits al secondo aggiunti dalla burst, mediati sul ciclo della burst.
 * @param {DamageContext} context
 * @returns {number}
 */
export function getBurstHitsPerSecond(context) {
    if (!context.settings?.useBurst || !hasMageCore(context)) return 0;

    const burstCycle = getBurstCycleEffects(context).burstCycle;

    return (BURST_ACTIVE_SECONDS / BURST_HIT_INTERVAL) / burstCycle;
}
