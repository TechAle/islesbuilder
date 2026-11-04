import { getCrystalCombustionEffects } from '../../classes/mage.js';

/** @typedef {import('../../../data/types.js').DamageContext} DamageContext */
/** @typedef {import('../../../data/types.js').CrystalCombustionStepResult} CrystalCombustionStepResult */

/**
 * Step 7 — Crystal Combustion.
 *
 * I cristalli che despawnano infliggono `val%` dell'Average Damage.
 * I drop di Recover Crystal e Power Crystal sono indipendenti e limitati
 * da un cooldown di 0.5s ciascuno.
 *
 * @type {import('../../../data/types.js').DamageStep}
 */
export const crystalCombustionStep = {
    id: 'crystalCombustion',
    label: 'Crystal Combustion',

    /**
     * @param {DamageContext} context
     * @returns {CrystalCombustionStepResult}
     */
    run(context) {
        const effects = getCrystalCombustionEffects(context);
        const averageDamage = context.results.criticalDamage?.damage ?? 0;
        const damagePerCrystal = averageDamage * (effects.combustionPercent / 100);
        const combustionDps = effects.crystalsPerSecond * damagePerCrystal;

        const attack = context.results.attackSpeed;
        const burst = context.results.burst;
        const previousTotalDps = burst?.enabled ? burst.totalDps : (attack?.dps ?? 0);

        const enabled = effects.combustionPercent > 0
            && effects.crystalsPerSecond > 0
            && averageDamage > 0;

        return {
            enabled,
            averageDamage,
            hitsPerSecond: effects.hitStats.totalHitsPerSecond,
            critsPerSecond: effects.hitStats.critsPerSecond,
            recoverChancePercent: effects.recoverChancePercent,
            powerChancePercent: effects.powerChancePercent,
            recoverCrystalsPerSecond: effects.recoverCrystalsPerSecond,
            powerCrystalsPerSecond: effects.powerCrystalsPerSecond,
            crystalsPerSecond: effects.crystalsPerSecond,
            combustionPercent: effects.combustionPercent,
            damagePerCrystal,
            combustionDps: enabled ? combustionDps : 0,
            totalDps: previousTotalDps + (enabled ? combustionDps : 0)
        };
    },

    /**
     * @param {CrystalCombustionStepResult} result
     * @returns {boolean}
     */
    isVisible(result) {
        return result?.enabled === true;
    },

    /**
     * @param {CrystalCombustionStepResult} result
     * @returns {import('../../../data/types.js').DamageResult[]}
     */
    toResults(result) {
        if (!result || !result.enabled) return [];

        return [
            { label: 'Hits per Second', value: result.hitsPerSecond, unit: '/s' },
            { label: 'Recover Crystal / s', value: result.recoverCrystalsPerSecond, unit: '/s' },
            { label: 'Power Crystal / s', value: result.powerCrystalsPerSecond, unit: '/s' },
            { label: 'Crystal Combustion DPS', value: result.combustionDps },
            { label: 'Total DPS', value: result.totalDps }
        ];
    }
};
