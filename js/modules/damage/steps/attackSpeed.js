import {
    BASE_ATTACK_TIME,
    BASE_ENERGY_REGEN,
    BASE_MAX_ENERGY
} from '../../../data/constants.js';
import { computeEnergyState, getEnergyRegen, getSustainLabel } from '../energy.js';
import { getEnergyCostMultiplier } from '../energyCost.js';
import { getAttackInterval } from '../attackTiming.js';
import { getPassiveHitStats } from '../../classes/mage.js';
import { findFlat, findPercentMultiplier } from '../statLookup.js';
import { getWeaponClass } from '../weaponProps.js';

/** @typedef {import('../../../data/types.js').DamageContext} DamageContext */
/** @typedef {import('../../../data/types.js').AttackSpeedStepResult} AttackSpeedStepResult */

/**
 * Step 5 — Attack Speed, DPS ed energia.
 *
 * - Intervallo tra attacchi: 0.6s base, ridotto da `Attack Cooldown%`.
 *   Se l'opzione "Slow attack" è attiva, l'intervallo viene sovrascritto.
 * - DPS: danno medio per colpo / intervallo.
 * - Energy Regen: (10 base + flat) * (1 + percent / 100).
 * - Costo attacco: `Attack Energy` ridotto da `Attack Costs%` e dal consumo
 *   della classe arma (Melee/Ranged/Magic Energy Consumption).
 * - Max Energy: (100 base + flat) * (1 + percent / 100).
 *
 * @type {import('../../../data/types.js').DamageStep}
 */
export const attackSpeedStep = {
    id: 'attackSpeed',
    label: 'Attack Speed & Energy',

    /**
     * @param {DamageContext} context
     * @returns {AttackSpeedStepResult}
     */
    run(context) {
        const previous = context.results.augmentFinal ?? context.results.criticalDamage;
        const damage = previous?.damage ?? 0;

        if (damage <= 0) {
            return {
                damage: 0,
                attackInterval: BASE_ATTACK_TIME,
                attacksPerSecond: 0,
                dps: 0,
                passiveDps: 0,
                passiveHitsPerSecond: 0,
                passiveBreakdown: [],
                attackEnergyCost: 0,
                energyRegen: BASE_ENERGY_REGEN,
                energyPerSecond: 0,
                maxEnergy: BASE_MAX_ENERGY,
                secondsToEmpty: Infinity,
                sustain: true,
                potionInterval: Infinity,
                potionSustainable: true
            };
        }

        const attackInterval = getAttackInterval(context);

        const attacksPerSecond = 1 / attackInterval;
        const attackDps = damage * attacksPerSecond;
        const passiveHits = getPassiveHitStats(context);
        const passiveDamage = context.specialAbilityManager
            ? context.specialAbilityManager.applyDamagePassives(
                context,
                damage,
                passiveHits.nonPassiveHitsPerSecond
            )
            : { dps: 0, applied: [] };
        const dps = attackDps + passiveDamage.dps;

        const baseAttackEnergy = findFlat(context.statsValues, 'Attack Energy');

        // Attack Costs% e consumo della classe arma si sommano.
        const weaponClass = getWeaponClass(context.weapon);
        const attackEnergyCost = Math.max(0,
            baseAttackEnergy * getEnergyCostMultiplier(context.statsValues, 'Attack Costs', weaponClass)
        );

        const energyRegen = getEnergyRegen(context);

        const energyPerSecond = energyRegen - attackEnergyCost * attacksPerSecond;

        // Max Energy: prima (base + flat), poi aumento percentuale.
        const maxEnergyBase = BASE_MAX_ENERGY + findFlat(context.statsValues, 'Max Energy');
        const maxEnergy = Math.max(0,
            maxEnergyBase * findPercentMultiplier(context.statsValues, 'Max Energy')
        );

        const energyState = computeEnergyState(energyPerSecond, maxEnergy);

        return {
            damage,
            attackInterval,
            attacksPerSecond,
            dps,
            passiveDps: passiveDamage.dps,
            passiveHitsPerSecond: passiveHits.hitsPerSecond,
            passiveBreakdown: passiveDamage.applied,
            attackEnergyCost,
            energyRegen,
            energyPerSecond,
            maxEnergy,
            ...energyState
        };
    },

    /**
     * @param {AttackSpeedStepResult} result
     * @returns {Array<{label: string, dps: number}>}
     */
    getDpsParts(result) {
        const passiveDps = result.passiveDps ?? 0;
        const baseAttack = Math.max(0, (result.dps ?? 0) - passiveDps);
        /** @type {Array<{label: string, dps: number}>} */
        const parts = [];

        if (baseAttack > 0) parts.push({ label: 'Attack', dps: baseAttack });
        (result.passiveBreakdown ?? []).forEach(passive => {
            if (passive.dps > 0) parts.push({ label: passive.name, dps: passive.dps });
        });

        return parts;
    },

    /**
     * @param {AttackSpeedStepResult} result
     * @returns {import('../../../data/types.js').DamageResult[]}
     */
    toResults(result) {
        if (!result || result.damage <= 0) return [];

        /**
         * @param {number} value
         * @returns {{value: number|string, unit?: string}}
         */
        const formatSeconds = value => Number.isFinite(value)
            ? { value, unit: 's' }
            : { value: '∞' };

        /** @type {import('../../../data/types.js').DamageResult[]} */
        const rows = [
            { label: 'Attack Interval', value: result.attackInterval, unit: 's' },
            { label: 'Attacks per Second', value: result.attacksPerSecond, unit: '/s' },
            ...(typeof result.firstHitDamage === 'number'
                ? [{
                    label: 'First Hit',
                    value: result.firstHitDamage,
                    help: 'Danno di un singolo colpo con tutti i modificatori, senza DPS di passive o abilità.'
                }]
                : []),
            ...(result.passiveDps > 0
                ? result.passiveBreakdown.flatMap(passive => [
                    { label: `${passive.name} DPS`, value: passive.dps },
                    { label: `${passive.name} Hits / s`, value: passive.hitsPerSecond, unit: '/s' }
                ])
                : []),
            { label: 'DPS', value: result.dps },
            { label: 'DPS (all)', value: result.dpsAll ?? result.dps }
        ];

        rows.push(
            { label: 'Energy Regen', value: result.energyRegen, unit: '/s' },
            { label: 'Energy per Second', value: result.energyPerSecond, unit: '/s' },
            { label: 'Sustain', value: getSustainLabel(result) },
            { label: 'Time to 0 Energy', ...formatSeconds(result.secondsToEmpty) }
        );

        if (typeof result.energyPerSecondAttackBurst === 'number') {
            rows.push(
                {
                    label: 'Energy per Second (A+B)',
                    value: result.energyPerSecondAttackBurst,
                    unit: '/s',
                    ...(typeof result.energyPerSecondAttackBurstSpecial === 'number'
                        ? {}
                        : { help: 'A = Attack, B = Burst, S = Special Attack' })
                },
                { label: 'Sustain (A+B)', value: result.sustainAttackBurst ?? '' },
                {
                    label: 'Time to 0 Energy (A+B)',
                    ...formatSeconds(result.secondsToEmptyAttackBurst ?? Infinity)
                }
            );
        }

        if (typeof result.energyPerSecondAttackBurstSpecial === 'number') {
            rows.push(
                {
                    label: 'Energy per Second (A+B+S)',
                    value: result.energyPerSecondAttackBurstSpecial,
                    unit: '/s',
                    help: 'A = Attack, B = Burst, S = Special Attack'
                },
                {
                    label: 'Sustain (A+B+S)',
                    value: result.sustainAttackBurstSpecial ?? ''
                },
                {
                    label: 'Time to 0 Energy (A+B+S)',
                    ...formatSeconds(result.secondsToEmptyAttackBurstSpecial ?? Infinity)
                }
            );
        }

        return rows;
    }
};
