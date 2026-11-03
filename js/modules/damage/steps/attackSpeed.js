import {
    BASE_ATTACK_TIME,
    BASE_ENERGY_REGEN,
    BASE_MAX_ENERGY
} from '../../../data/constants.js';
import { computeEnergyState, getSustainLabel } from '../energy.js';
import { findFlat, findPercent } from '../statLookup.js';

/** @typedef {import('../../../data/types.js').DamageContext} DamageContext */
/** @typedef {import('../../../data/types.js').AttackSpeedStepResult} AttackSpeedStepResult */

/**
 * Step 4 — Attack Speed, DPS ed energia.
 *
 * - Intervallo tra attacchi: 0.6s base, ridotto da `Attack Cooldown%`.
 *   Se l'opzione "Slow attack" è attiva, l'intervallo viene sovrascritto.
 * - DPS: danno medio per colpo / intervallo.
 * - Energy Regen: (10 base + flat) * (1 + percent / 100).
 * - Costo attacco: `Attack Energy` ridotto da `Attack Costs%`.
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

        const cooldownPercent = findPercent(context.statsValues, 'Attack Cooldown');
        const computedInterval = BASE_ATTACK_TIME * (1 + cooldownPercent / 100);

        const override = context.settings?.slowAttack ? context.settings.attackInterval : null;
        const validOverride = typeof override === 'number' && Number.isFinite(override) && override > 0;
        const attackInterval = Math.max(0.05, validOverride ? override : computedInterval);

        const attacksPerSecond = 1 / attackInterval;
        const dps = damage * attacksPerSecond;

        const baseAttackEnergy = findFlat(context.statsValues, 'Attack Energy');
        const attackCostsPercent = findPercent(context.statsValues, 'Attack Costs');
        const attackEnergyCost = Math.max(0, baseAttackEnergy * (1 + attackCostsPercent / 100));

        const energyRegen = (BASE_ENERGY_REGEN + findFlat(context.statsValues, 'Energy Regen'))
            * (1 + findPercent(context.statsValues, 'Energy Regen') / 100);

        const energyPerSecond = energyRegen - attackEnergyCost * attacksPerSecond;

        const maxEnergy = Math.max(0,
            (BASE_MAX_ENERGY + findFlat(context.statsValues, 'Max Energy'))
            * (1 + findPercent(context.statsValues, 'Max Energy') / 100)
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
