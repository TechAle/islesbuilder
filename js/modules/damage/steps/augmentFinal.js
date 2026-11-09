import { getAugmentEffects, getAugmentStatBonuses } from '../../augmentManager.js';
import { getItemSetEffects } from '../../itemSets.js';
import { getCritTotalHitsPerSecond } from '../critStats.js';

/** @typedef {import('../../../data/types.js').DamageContext} DamageContext */
/** @typedef {import('../../../data/types.js').AugmentFinalStepResult} AugmentFinalStepResult */

/**
 * Step finale degli augment.
 *
 * Viene eseguito dopo Damage Modifiers, Damage Multiplier e Critical Damage:
 * quindi dopo blue orb, critici e tutti gli altri moltiplicatori.
 * Da qui in poi parte il calcolo del DPS.
 *
 * @type {import('../../../data/types.js').DamageStep}
 */
export const augmentFinalStep = {
    id: 'augmentFinal',
    label: 'Augments',

    /**
     * @param {DamageContext} context
     * @returns {AugmentFinalStepResult}
     */
    run(context) {
        const previous = context.results.criticalDamage;
        const baseDamageBefore = previous?.baseDamage ?? 0;
        const damageBefore = previous?.damage ?? 0;
        const effects = getAugmentEffects(context);
        const itemSets = getItemSetEffects(context);
        const setExecutionPercent = itemSets.executionPercent;

        const totalHitsPerSecond = getCritTotalHitsPerSecond(context);
        const infectedHitOverride = Number(context.settings?.infectedHitsOverride) || 0;
        const estimatedTtk = Number(context.settings?.estimatedTimeToKill);
        const infectedPercent = context.settings?.firstHit
            ? 0
            : effects.infected.reduce((sum, effect) => {
                const activeDuration = Number.isFinite(estimatedTtk) && estimatedTtk > 0
                    ? Math.min(effect.duration, estimatedTtk)
                    : effect.duration;
                const autoHits = totalHitsPerSecond * activeDuration;
                const hits = infectedHitOverride > 0
                    ? Math.min(effect.maxHits, infectedHitOverride)
                    : Math.min(effect.maxHits, autoHits);
                return sum + hits * effect.perHit;
            }, 0);

        const firstStrikePercent = context.settings?.firstHit
            ? effects.firstStrikePercent
            : 0;

        // Augment di statistica del tipo di danno (es. Arcane Damage%).
        // Valgono solo se il tipo coincide con quello dell'arma equipaggiata.
        const damageType = context.results.baseDamage?.damageType ?? null;
        const damageStatPercent = damageType
            ? getAugmentStatBonuses(context.build)
                .filter(bonus => bonus.percent && bonus.stat === `${damageType} Damage`)
                .reduce((sum, bonus) => sum + bonus.value, 0)
            : 0;

        // Nature's Bless aggiunge Elemental Power flat. Applicato alla fine,
        // equivale a ricalcolare il moltiplicatore elementale con EP aumentato.
        // Sul first hit non è ancora attivo: richiede un colpo elementale precedente.
        const natureBlessFlat = context.settings?.firstHit ? 0 : effects.natureBlessFlat;
        const damageModifiers = context.results.damageModifiers;
        const elementalPower = damageModifiers?.elementalPower ?? 0;
        const elementalPowerPercent = damageModifiers?.elementalPowerPercent ?? 0;
        const elementalDamagePercent = damageModifiers?.elementalDamagePercent ?? 0;
        const natureBlessMultiplier = getNatureBlessMultiplier(
            natureBlessFlat,
            elementalPower,
            elementalPowerPercent,
            elementalDamagePercent
        );

        const augmentPercent = effects.enragedPercent
            + effects.executionPercent
            + setExecutionPercent
            + effects.hunterPercent
            + effects.prosecutionPercent
            + infectedPercent
            + firstStrikePercent
            + damageStatPercent;

        const multiplier = (1 + augmentPercent / 100) * natureBlessMultiplier;
        const enabled = effects.hasEffects
            || damageStatPercent !== 0
            || itemSets.hasExecution;

        return {
            enabled,
            hasExecution: effects.hasExecution,
            hasSetExecution: itemSets.hasExecution,
            hasProsecution: effects.hasProsecution,
            hasHunter: effects.hasHunter,
            hasEnraged: effects.hasEnraged,
            hasInfected: effects.hasInfected,
            hasFirstStrike: effects.hasFirstStrike,
            baseDamageBefore,
            damageBefore,
            augmentPercent,
            damageType,
            damageStatPercent,
            natureBlessFlat,
            natureBlessMultiplier,
            infectedPercent,
            enragedPercent: effects.enragedPercent,
            executionPercent: effects.executionPercent,
            setExecutionPercent,
            hunterPercent: effects.hunterPercent,
            prosecutionPercent: effects.prosecutionPercent,
            firstStrikePercent,
            multiplier,
            baseDamage: baseDamageBefore * multiplier,
            damage: damageBefore * multiplier
        };
    },

    /**
     * @param {AugmentFinalStepResult} result
     * @returns {boolean}
     */
    isVisible(result) {
        return result?.enabled === true;
    },

    /**
     * @param {AugmentFinalStepResult} result
     * @returns {import('../../../data/types.js').DamageResult[]}
     */
    toResults(result) {
        if (!result || !result.enabled) return [];

        /** @type {import('../../../data/types.js').DamageResult[]} */
        const rows = [];

        if (result.hasExecution) {
            rows.push({ label: 'Execution Damage%', value: result.executionPercent, unit: '%' });
        }
        if (result.setExecutionPercent > 0) {
            rows.push({ label: 'Aetherbloom Execution', value: result.setExecutionPercent, unit: '%' });
        }
        if (result.hasProsecution) {
            rows.push({ label: 'Prosecution Damage%', value: result.prosecutionPercent, unit: '%' });
        }
        if (result.hasHunter) {
            rows.push({ label: 'Hunter Damage%', value: result.hunterPercent, unit: '%' });
        }
        if (result.hasEnraged) {
            rows.push({ label: 'Enraged Damage%', value: result.enragedPercent, unit: '%' });
        }
        if (result.hasInfected) {
            rows.push({ label: 'Infected Damage%', value: result.infectedPercent, unit: '%' });
        }
        if (result.hasFirstStrike) {
            rows.push({ label: 'First Strike Damage%', value: result.firstStrikePercent, unit: '%' });
        }
        if (result.damageStatPercent !== 0) {
            rows.push({
                label: result.damageType ? `${result.damageType} Damage%` : 'Damage%',
                value: result.damageStatPercent,
                unit: '%'
            });
        }
        if (result.natureBlessFlat !== 0) {
            rows.push({ label: "Nature's Bless EP", value: result.natureBlessFlat });
        }
        if (result.augmentPercent !== 0) {
            rows.push({ label: 'Augments Damage%', value: result.augmentPercent, unit: '%' });
        }

        return rows;
    }
};

/**
 * Fattore moltiplicativo dato da Nature's Bless applicato come ultimo passo.
 *
 * L'Elemental Power aumenta il danno elementale tramite
 * `1 + elementalDamage% * EP / 10000`. Aggiungere EP flat alla fine equivale
 * a moltiplicare il danno per il rapporto tra il fattore con e senza bonus.
 *
 * @param {number} flat
 * @param {number} elementalPower
 * @param {number} elementalPowerPercent
 * @param {number} elementalDamagePercent
 * @returns {number}
 */
function getNatureBlessMultiplier(flat, elementalPower, elementalPowerPercent, elementalDamagePercent) {
    if (!flat || elementalPower <= 0 || elementalDamagePercent === 0) return 1;

    const boostedPower = elementalPower + flat * (1 + elementalPowerPercent / 100);
    const baseFactor = 1 + elementalDamagePercent * elementalPower / 10000;
    const boostedFactor = 1 + elementalDamagePercent * boostedPower / 10000;

    if (baseFactor <= 0) return 1;
    return boostedFactor / baseFactor;
}
