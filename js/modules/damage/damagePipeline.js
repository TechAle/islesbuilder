import { baseDamageStep } from './steps/baseDamage.js';
import { damageModifiersStep } from './steps/damageModifiers.js';

/** @typedef {import('../../data/types.js').BuildState} BuildState */
/** @typedef {import('../../data/types.js').ClassKey} ClassKey */
/** @typedef {import('../../data/types.js').DamageContext} DamageContext */
/** @typedef {import('../../data/types.js').DamageStep} DamageStep */
/** @typedef {import('../../data/types.js').StatTotals} StatTotals */

/**
 * Ordine degli step di calcolo del danno.
 * Per aggiungere uno step basta aggiungerlo in fondo a questo array: ogni step
 * può leggere `context.results` con i risultati degli step precedenti.
 * @type {DamageStep[]}
 */
export const DAMAGE_STEPS = [
    baseDamageStep,
    damageModifiersStep
];

/**
 * Costruisce il contesto condiviso dalla pipeline.
 * @param {Object} options
 * @param {Record<string, StatTotals>} options.statsValues
 * @param {Record<ClassKey, Record<string, number>>} options.skillValues
 * @param {BuildState} options.build
 * @returns {DamageContext}
 */
export function createDamageContext({ statsValues, skillValues, build }) {
    return {
        statsValues,
        skillValues,
        build,
        weapon: build.activeEquip.weapon ?? null,
        results: {}
    };
}

/**
 * Esegue tutti gli step in ordine e restituisce i risultati per id.
 * @param {DamageContext} context
 * @returns {DamageContext['results']}
 */
export function runDamagePipeline(context) {
    const results = /** @type {DamageContext['results']} */ ({});

    DAMAGE_STEPS.forEach(step => {
        results[step.id] = step.run({ ...context, results });
    });

    return results;
}
