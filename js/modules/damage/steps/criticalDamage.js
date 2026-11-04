import { BASE_CRIT_DAMAGE } from '../../../data/constants.js';
import { getNaturalDistillationPercent } from '../../classes/mage.js';
import { findPercent } from '../statLookup.js';

/** @typedef {import('../../../data/types.js').DamageContext} DamageContext */
/** @typedef {import('../../../data/types.js').CriticalDamageStepResult} CriticalDamageStepResult */

/**
 * Step 4 — Critical Damage.
 *
 * - Crit Damage totale = 50% base + `Crit Damage%` dalle statistiche.
 * - Natural Distillation converte una parte del Crit Damage in Elemental Power:
 *   il Crit Damage usato qui viene ridotto della stessa percentuale.
 * - Colpo critico = danno × (1 + effectiveCritDamage / 100).
 * - Danno medio = non crit × (1 - critChanceEff) + critico × critChanceEff.
 *
 * Il Crit Chance viene limitato solo verso il basso (0), perché nell'API può
 * essere negativo. Sopra il 100% non viene tagliato: il critico ha sempre
 * successo e l'eccesso resta disponibile in `critChanceOverflow`.
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
        const previous = context.results.damageMultiplier ?? context.results.damageModifiers;
        const baseDamage = previous?.damage ?? 0;

        if (baseDamage <= 0) {
            return {
                baseDamage: 0,
                critChance: 0,
                effectiveCritChance: 0,
                critChanceOverflow: 0,
                critDamagePercent: BASE_CRIT_DAMAGE,
                effectiveCritDamagePercent: BASE_CRIT_DAMAGE,
                distillationPercent: 0,
                convertedCritDamagePercent: 0,
                criticalHit: 0,
                averageDamage: 0,
                damage: 0
            };
        }

        const critChance = Math.max(0, findPercent(context.statsValues, 'Crit Chance'));
        const effectiveCritChance = Math.min(100, critChance);
        const critChanceOverflow = Math.max(0, critChance - 100);
        const critDamagePercent = BASE_CRIT_DAMAGE + findPercent(context.statsValues, 'Crit Damage');
        const distillationPercent = getNaturalDistillationPercent(context);
        const convertedCritDamagePercent = critDamagePercent * (distillationPercent / 100);
        const effectiveCritDamagePercent = critDamagePercent - convertedCritDamagePercent;

        const criticalHit = baseDamage * (1 + effectiveCritDamagePercent / 100);
        const averageDamage = baseDamage * (1 - effectiveCritChance / 100)
            + criticalHit * (effectiveCritChance / 100);

        return {
            baseDamage,
            critChance,
            effectiveCritChance,
            critChanceOverflow,
            critDamagePercent,
            effectiveCritDamagePercent,
            distillationPercent,
            convertedCritDamagePercent,
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
