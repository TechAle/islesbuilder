import {
    BURST_ACTIVE_SECONDS,
    BURST_DAMAGE_PERCENT,
    BURST_ENERGY_COST,
    BURST_HIT_INTERVAL,
    BURST_INTERVAL
} from '../../../data/constants.js';
import { computeEnergyState } from '../energy.js';
import { getDefaultAttackReverseMultiplier } from '../weaponProps.js';
import { getBurstCycleEffects, hasMageCore } from '../../classes/mage.js';

/** @typedef {import('../../../data/types.js').DamageContext} DamageContext */
/** @typedef {import('../../../data/types.js').BurstStepResult} BurstStepResult */

/**
 * Step 6 — Burst DPS.
 *
 * Con il Mage Core equipaggiato, ogni secondo per 10 secondi infligge il 75%
 * dell'Average Damage riportato al danno base dell'arma (reverse del
 * Default Attack). Poi ci sono 20 secondi di cooldown, quindi su 30 secondi
 * l'effetto è attivo solo per 10.
 *
 * - Burst DPS = averageDamage × reverseDefaultAttack × 75% × 10 / 30
 * - Costo energetico = 50 / 30 al secondo
 *
 * @type {import('../../../data/types.js').DamageStep}
 */
export const burstStep = {
    id: 'burst',
    label: 'Burst DPS',

    /**
     * @param {DamageContext} context
     * @returns {BurstStepResult}
     */
    run(context) {
        const attack = context.results.attackSpeed;
        const attackDps = attack?.dps ?? 0;
        const available = hasMageCore(context);
        const useBurst = !!context.settings?.useBurst;
        const visible = available || useBurst;

        /** @type {BurstStepResult} */
        const inactive = {
            visible,
            available,
            enabled: false,
            burstDps: 0,
            burstDamagePerHit: 0,
            energyPerSecondBurstOnly: 0,
            reverseMultiplier: 0,
            burstEnergyPerSecond: 0,
            potentialChargeSeconds: 0,
            potentialChargeKills: 0,
            cooldownReduction: 0,
            burstCooldown: 0,
            effectiveBurstCooldown: 0,
            burstCycle: BURST_INTERVAL,
            burstCastsPerSecond: 0,
            secondWindChancePercent: 0,
            secondWindCooldownSeconds: 0,
            secondWindResetsPerSecond: 0,
            hasSecondWind: false,
            attackDps,
            totalDps: attackDps,
            energyPerSecond: attack?.energyPerSecond ?? 0,
            maxEnergy: attack?.maxEnergy ?? 0,
            secondsToEmpty: attack?.secondsToEmpty ?? Infinity,
            sustain: attack?.sustain ?? true,
            potionInterval: attack?.potionInterval ?? Infinity,
            potionSustainable: attack?.potionSustainable ?? true
        };

        if (!useBurst || !available || !attack || attack.damage <= 0) {
            return inactive;
        }

        const damage = context.results.augmentFinal?.damage ?? context.results.criticalDamage?.damage ?? 0;
        const weapon = context.weapon ?? context.build?.activeEquip?.weapon;
        const reverseMultiplier = getDefaultAttackReverseMultiplier(weapon);
        const burstDamagePerHit = damage
            * reverseMultiplier
            * (BURST_DAMAGE_PERCENT / 100);

        const potentialCharge = getBurstCycleEffects(context);

        const burstHitsPerSecond = (BURST_ACTIVE_SECONDS / BURST_HIT_INTERVAL)
            / potentialCharge.burstCycle;
        const burstDps = burstDamagePerHit * burstHitsPerSecond;
        const burstEnergyPerSecond = BURST_ENERGY_COST / potentialCharge.burstCycle;
        const energyPerSecondBurstOnly = -burstEnergyPerSecond;

        const totalDps = attackDps + burstDps;
        const energyPerSecond = attack.energyPerSecond - burstEnergyPerSecond;
        const energyState = computeEnergyState(energyPerSecond, attack.maxEnergy);

        return {
            visible: true,
            available: true,
            enabled: true,
            burstDps,
            burstDamagePerHit,
            energyPerSecondBurstOnly,
            reverseMultiplier,
            burstEnergyPerSecond,
            potentialChargeSeconds: potentialCharge.potentialChargeSeconds,
            potentialChargeKills: potentialCharge.potentialChargeKills,
            cooldownReduction: potentialCharge.cooldownReduction,
            burstCooldown: potentialCharge.burstCooldown,
            effectiveBurstCooldown: potentialCharge.effectiveBurstCooldown,
            burstCycle: potentialCharge.burstCycle,
            burstCastsPerSecond: potentialCharge.burstCastsPerSecond,
            secondWindChancePercent: potentialCharge.secondWindChancePercent,
            secondWindCooldownSeconds: potentialCharge.secondWindCooldownSeconds,
            secondWindResetsPerSecond: potentialCharge.secondWindResetsPerSecond,
            hasSecondWind: potentialCharge.hasSecondWind,
            attackDps,
            totalDps,
            energyPerSecond,
            maxEnergy: attack.maxEnergy,
            ...energyState
        };
    },

    /**
     * @param {BurstStepResult} result
     * @returns {boolean}
     */
    isVisible(result) {
        return result?.visible === true;
    },

    /**
     * @param {BurstStepResult} result
     * @returns {Array<{label: string, dps: number}>}
     */
    getDpsParts(result) {
        return result?.enabled && result.burstDps > 0
            ? [{ label: 'Burst', dps: result.burstDps }]
            : [];
    },

    /**
     * @param {BurstStepResult} result
     * @returns {import('../../../data/types.js').DamageResult[]}
     */
    toResults(result) {
        if (!result || !result.visible) return [];

        if (!result.available) {
            return [{ label: 'Burst', value: 'Requires Mage Core' }];
        }

        if (!result.enabled) {
            return [{ label: 'Burst', value: 'Off' }];
        }

        return [
            { label: 'Burst / Hit', value: result.burstDamagePerHit },
            ...(result.potentialChargeSeconds > 0
                ? [
                    { label: 'Cooldown Reduction', value: result.cooldownReduction, unit: 's' },
                    { label: 'Burst Cycle', value: result.burstCycle, unit: 's' }
                ]
                : []),
            ...(result.hasSecondWind
                ? [
                    { label: 'Second Wind', value: result.secondWindChancePercent, unit: '%' },
                    { label: 'Ultimate Reset / s', value: result.secondWindResetsPerSecond }
                ]
                : []),
            { label: 'Burst DPS', value: result.burstDps },
            {
                label: 'Energy per Second',
                value: result.energyPerSecondBurstOnly,
                unit: '/s'
            }
        ];
    }
};
