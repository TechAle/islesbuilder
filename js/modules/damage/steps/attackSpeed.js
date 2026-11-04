import {
    BASE_ATTACK_TIME,
    BASE_ENERGY_REGEN,
    BASE_MAX_ENERGY
} from '../../../data/constants.js';
import { computeEnergyState, getEnergyRegen, getSustainLabel } from '../energy.js';
import { getEnergyCostMultiplier } from '../energyCost.js';
import { getAttackInterval } from '../attackTiming.js';
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
        const previous = context.results.criticalDamage;
        const damage = previous?.damage ?? 0;

        if (damage <= 0) {
            return {
                damage: 0,
                attackInterval: BASE_ATTACK_TIME,
                attacksPerSecond: 0,
                dps: 0,
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
        const dps = damage * attacksPerSecond;

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
            attackEnergyCost,
            energyRegen,
            energyPerSecond,
            maxEnergy,
            ...energyState
        };
    },

    /**
     * @param {AttackSpeedStepResult} result
     * @returns {import('../../../data/types.js').DamageResult[]}
     */
    toResults(result) {
        if (!result || result.damage <= 0) return [];

        const seconds = Number.isFinite(result.secondsToEmpty)
            ? { value: result.secondsToEmpty, unit: 's' }
            : { value: '∞' };

        return [
            { label: 'Attack Interval', value: result.attackInterval, unit: 's' },
            { label: 'Attacks per Second', value: result.attacksPerSecond, unit: '/s' },
            { label: 'DPS', value: result.dps },
            { label: 'Attack Energy Cost', value: result.attackEnergyCost },
            { label: 'Energy Regen', value: result.energyRegen, unit: '/s' },
            { label: 'Energy per Second', value: result.energyPerSecond, unit: '/s' },
            { label: 'Max Energy', value: result.maxEnergy },
            { label: 'Time to 0 Energy', ...seconds },
            { label: 'Sustain', value: getSustainLabel(result) }
        ];
    }
};
