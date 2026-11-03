import { BASE_CRIT_DAMAGE } from '../../../data/constants.js';
import { findPercent } from '../statLookup.js';

/** @typedef {import('../../../data/types.js').DamageContext} DamageContext */
/** @typedef {import('../../../data/types.js').CriticalDamageStepResult} CriticalDamageStepResult */

/**
 * Limita un valore tra min e max.
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

/**
 * Step 3 — Critical Damage.
 *
 * - Crit Damage totale = 50% base + `Crit Damage%` dalle statistiche.
 * - Colpo critico = danno × (1 + critDamage / 100).
 * - Danno medio = non crit × (1 - critChance) + critico × critChance.
 *
 * Il Crit Chance viene limitato tra 0% e 100%, perché nell'API può essere
 * anche negativo.
 *
 * @type {import('../../../data/types.js').DamageStep}
 */
export const criticalDamageStep = {
    id: 'criticalDamage',
    label: 'Critical Damage',

    /**
     * @param {DamageContext} context
     * @returns {CriticalDamageStepResult}
     */
    run(context) {
        const previous = context.results.damageModifiers;
        const baseDamage = previous?.damage ?? 0;

        if (baseDamage <= 0) {
            return {
                baseDamage: 0,
                critChance: 0,
                critDamagePercent: BASE_CRIT_DAMAGE,
                criticalHit: 0,
                averageDamage: 0,
                damage: 0
            };
        }

        const critChance = clamp(findPercent(context.statsValues, 'Crit Chance'), 0, 100);
        const critDamagePercent = BASE_CRIT_DAMAGE + findPercent(context.statsValues, 'Crit Damage');

        const criticalHit = baseDamage * (1 + critDamagePercent / 100);
        const averageDamage = baseDamage * (1 - critChance / 100) + criticalHit * (critChance / 100);

        return {
            baseDamage,
            critChance,
            critDamagePercent,
            criticalHit,
            averageDamage,
            damage: averageDamage
        };
    },

    /**
     * @param {CriticalDamageStepResult} result
     * @returns {import('../../../data/types.js').DamageResult[]}
     */
    toResults(result) {
        if (!result || result.baseDamage <= 0) return [];

        return [
            { label: 'Critical Hit', value: result.criticalHit },
            { label: 'Average Damage', value: result.averageDamage }
        ];
    }
};
