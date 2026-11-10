import { BURST_INTERVAL } from '../../../data/constants.js';
import { computeEnergyState } from '../energy.js';
import {
    getDefaultAttackReverseMultiplier,
    getWeaponClass
} from '../weaponProps.js';
import { getBurstCore, getBurstHitsPerBurst } from '../../classes/core.js';
import { getCoreBuffEffects } from '../../classes/coreBuff.js';
import { getBurstCycleEffects } from '../../classes/mage.js';
import { getStormEchoEffects } from '../../itemPassives.js';
import { getCritTotalHitsPerSecond } from '../critStats.js';

/** @typedef {import('../../../data/types.js').DamageContext} DamageContext */
/** @typedef {import('../../../data/types.js').BurstStepResult} BurstStepResult */

/**
 * Danno di partenza della burst: è lo stesso valore usato dal Mage Core.
 * Prende il danno dopo il critico (e dopo gli augment già applicati), poi lo
 * step applica il reverse del Default Attack e la percentuale del core.
 * @param {DamageContext} context
 * @returns {number}
 */
function getBurstBaseDamage(context) {
    return context.results.augmentFinal?.damage
        ?? context.results.criticalDamage?.damage
        ?? 0;
}

/**
 * Step 6 — Burst DPS.
 *
 * Ogni core ha la propria burst:
 *
 * - Mage Core: 75% per colpo ogni 0.75s, 10s attivi.
 * - Archer Core: Barrage da 30 frecce al 66%, 10s attivi.
 * - Assassin Core: +25% danno per 6s, senza colpi diretti.
 * - Swordsman Core: 200% per proc melee ogni 0.5s, 10s attivi.
 *
 * Il danno dei proc usa lo stesso percorso di Mage/Archer:
 *
 * - Burst DPS = postCritDamage × reverseDefaultAttack × core% × hit/s medi
 * - Costo energetico = 50 / ciclo della burst
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
        const burstCore = getBurstCore(context);
        const available = !!burstCore;
        const useBurst = !!context.settings?.useBurst;
        const visible = available || useBurst;

        /** @type {BurstStepResult} */
        const inactive = {
            visible,
            available,
            coreName: burstCore?.name ?? null,
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
            hasReclamation: false,
            reclamationKillsPerSecond: 0,
            reclamationCooldownReduction: 0,
            hasStormEcho: false,
            stormEchoStacks: 0,
            stormEchoUltimatePercent: 0,
            stormEchoConsumeDps: 0,
            buffDamagePercent: 0,
            buffUptime: 0,
            buffDurationSeconds: 0,
            reason: null,
            attackDps,
            totalDps: attackDps,
            energyPerSecond: attack?.energyPerSecond ?? 0,
            maxEnergy: attack?.maxEnergy ?? 0,
            secondsToEmpty: attack?.secondsToEmpty ?? Infinity,
            sustain: attack?.sustain ?? true,
            potionInterval: attack?.potionInterval ?? Infinity,
            potionSustainable: attack?.potionSustainable ?? true
        };

        if (!useBurst || !burstCore || !attack || attack.damage <= 0) {
            return inactive;
        }

        const weapon = context.weapon ?? context.build?.activeEquip?.weapon;
        if (burstCore.requiresMelee && getWeaponClass(weapon) !== 'melee') {
            return {
                ...inactive,
                reason: 'Requires melee weapon'
            };
        }

        const damage = getBurstBaseDamage(context);
        const reverseMultiplier = getDefaultAttackReverseMultiplier(weapon);
        const potentialCharge = getBurstCycleEffects(context);
        const coreBuff = getCoreBuffEffects(context);
        const stormEcho = getStormEchoEffects(
            context,
            getCritTotalHitsPerSecond(context)
        );

        let burstDamagePerHit = 0;
        let burstHitsPerSecond = 0;
        let burstDps = 0;

        const hitsPerBurst = getBurstHitsPerBurst(burstCore);

        if (burstCore.damagePercent > 0 && hitsPerBurst > 0) {
            burstDamagePerHit = damage
                * reverseMultiplier
                * (burstCore.damagePercent / 100);
            burstHitsPerSecond = hitsPerBurst / potentialCharge.burstCycle;
            burstDps = burstDamagePerHit * burstHitsPerSecond;
        }

        const stormEchoConsumeDps = stormEcho.ultimateConsumePercent > 0
            && potentialCharge.burstCycle > 0
            ? damage
                * reverseMultiplier
                * (stormEcho.ultimateConsumePercent / 100)
                / potentialCharge.burstCycle
            : 0;

        const burstEnergyPerSecond = burstCore.energyCost / potentialCharge.burstCycle;
        const energyPerSecondBurstOnly = -burstEnergyPerSecond;

        const totalDps = attackDps + burstDps + stormEchoConsumeDps;
        const energyPerSecond = attack.energyPerSecond - burstEnergyPerSecond;
        const energyState = computeEnergyState(energyPerSecond, attack.maxEnergy);

        return {
            visible: true,
            available: true,
            coreName: burstCore.name,
            enabled: true,
            burstDps,
            burstDamagePerHit,
            burstHitsPerSecond,
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
            hasReclamation: potentialCharge.hasReclamation,
            reclamationKillsPerSecond: potentialCharge.reclamationKillsPerSecond,
            reclamationCooldownReduction: potentialCharge.reclamationCooldownReduction,
            hasStormEcho: stormEcho.visible,
            stormEchoStacks: stormEcho.averageStacks,
            stormEchoUltimatePercent: stormEcho.ultimateConsumePercent,
            stormEchoConsumeDps,
            buffDamagePercent: coreBuff.buffDamagePercent,
            buffUptime: coreBuff.uptime,
            buffDurationSeconds: coreBuff.activeSeconds,
            reason: null,
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
            return [{ label: 'Burst', value: 'Requires a burst core' }];
        }

        if (result.reason) {
            return [{ label: 'Burst', value: result.reason }];
        }

        if (!result.enabled) {
            return [{ label: 'Burst', value: 'Off' }];
        }

        if ((result.buffDamagePercent ?? 0) > 0) {
            const buffPercent = result.buffDamagePercent ?? 0;
            const buffUptime = result.buffUptime ?? 0;
            return [
                { label: 'Burst Buff', value: buffPercent, unit: '%' },
                { label: 'Buff Duration', value: result.buffDurationSeconds ?? 0, unit: 's' },
                { label: 'Buff Uptime', value: buffUptime * 100, unit: '%' },
                {
                    label: 'Average Buff',
                    value: buffPercent * buffUptime,
                    unit: '%'
                },
                { label: 'Burst Cycle', value: result.burstCycle, unit: 's' },
                ...(result.hasReclamation
                    ? [
                        {
                            label: 'Reclamation Kills / s',
                            value: result.reclamationKillsPerSecond ?? 0,
                            unit: '/s'
                        },
                        {
                            label: 'Reclamation Cooldown',
                            value: -(result.reclamationCooldownReduction ?? 0),
                            unit: 's'
                        }
                    ]
                    : []),
                ...(result.hasStormEcho
                    ? [
                        {
                            label: "Storm's Echo Stacks",
                            value: result.stormEchoStacks ?? 0
                        },
                        {
                            label: "Storm's Echo Consume",
                            value: result.stormEchoUltimatePercent ?? 0,
                            unit: '%'
                        }
                    ]
                    : []),
                {
                    label: 'Energy per Second',
                    value: result.energyPerSecondBurstOnly,
                    unit: '/s'
                }
            ];
        }

        const hitLabel = result.coreName === 'Archer Core'
            ? 'Burst / Arrow'
            : result.coreName === 'Swordsman Core'
                ? 'Burst / Proc'
                : 'Burst / Hit';

        return [
            {
                label: hitLabel,
                value: result.burstDamagePerHit
            },
            ...(result.potentialChargeSeconds > 0
                ? [
                    { label: 'Cooldown Reduction', value: result.cooldownReduction, unit: 's' },
                    { label: 'Burst Cycle', value: result.burstCycle, unit: 's' }
                ]
                : []),
            ...(result.hasReclamation
                ? [
                    {
                        label: 'Reclamation Kills / s',
                        value: result.reclamationKillsPerSecond ?? 0,
                        unit: '/s'
                    },
                    {
                        label: 'Reclamation Cooldown',
                        value: -(result.reclamationCooldownReduction ?? 0),
                        unit: 's'
                    },
                    { label: 'Burst Cycle', value: result.burstCycle, unit: 's' }
                ]
                : []),
            ...(result.hasStormEcho
                ? [
                    {
                        label: "Storm's Echo Stacks",
                        value: result.stormEchoStacks ?? 0
                    },
                    {
                        label: "Storm's Echo Consume",
                        value: result.stormEchoUltimatePercent ?? 0,
                        unit: '%'
                    },
                    {
                        label: "Storm's Echo Consume DPS",
                        value: result.stormEchoConsumeDps ?? 0
                    }
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
