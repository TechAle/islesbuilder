import { BASE_CRIT_DAMAGE } from '../../../data/constants.js';
import { getNaturalDistillationEffects } from '../../classes/mage.js';
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
        const previous = context.results.sharpshooter
            ?? context.results.damageMultiplier
            ?? context.results.damageModifiers;
        const baseDamage = previous?.damage ?? 0;
        const sharpshooter = context.results.sharpshooter;

        if (baseDamage <= 0) {
            return {
                baseDamage: 0,
                critChance: 0,
                effectiveCritChance: 0,
                critChanceOverflow: 0,
                critDamagePercent: BASE_CRIT_DAMAGE,
                effectiveCritDamagePercent: BASE_CRIT_DAMAGE,
                sharpshooterCritChancePercent: 0,
                sharpshooterCritDamagePercent: 0,
                distillationPercent: 0,
                convertedCritDamagePercent: 0,
                criticalHit: 0,
                averageDamage: 0,
                damage: 0
            };
        }

        const sharpshooterCritChance = sharpshooter?.hotStreakCritChancePercent ?? 0;
        const sharpshooterCritDamage = sharpshooter?.hotStreakCritDamagePercent ?? 0;
        const critChance = Math.max(0,
            findPercent(context.statsValues, 'Crit Chance') + sharpshooterCritChance
        );
        const effectiveCritChance = Math.min(100, critChance);
        const critChanceOverflow = Math.max(0, critChance - 100);
        let critDamagePercent = BASE_CRIT_DAMAGE
            + findPercent(context.statsValues, 'Crit Damage')
            + sharpshooterCritDamage;
        const critDamageRawPercent = critDamagePercent;
        const naturalDistillation = getNaturalDistillationEffects(context, critDamagePercent);
        const critDamageModifierNaturalDistillation = naturalDistillation.critDamageModifier;
        critDamagePercent += critDamageModifierNaturalDistillation;

        const distillationPercent = naturalDistillation.distillationPercent;
        const convertedCritDamagePercent = naturalDistillation.convertedCritDamagePercent;
        const effectiveCritDamagePercent = critDamagePercent;

        const criticalHit = baseDamage * (1 + effectiveCritDamagePercent / 100);
        const averageDamage = baseDamage * (1 - effectiveCritChance / 100)
            + criticalHit * (effectiveCritChance / 100);

        return {
            baseDamage,
            critChance,
            effectiveCritChance,
            critChanceOverflow,
            critDamagePercent: critDamageRawPercent,
            effectiveCritDamagePercent,
            sharpshooterCritChancePercent: sharpshooterCritChance,
            sharpshooterCritDamagePercent: sharpshooterCritDamage,
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
