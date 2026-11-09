import { baseDamageStep } from './steps/baseDamage.js';
import { damageModifiersStep } from './steps/damageModifiers.js';
import { damageMultiplierStep } from './steps/mage/damageMultiplier.js';
import { sharpshooterStep } from './steps/archer/sharpshooter.js';
import { criticalDamageStep } from './steps/criticalDamage.js';
import { augmentFinalStep } from './steps/augmentFinal.js';
import { specialAttacksStep } from './steps/specialAttacks.js';
import { ricochetStep } from './steps/archer/ricochet.js';
import { augmentDamageStep } from './steps/augmentDamage.js';
import { attackSpeedStep } from './steps/attackSpeed.js';
import { burstStep } from './steps/burst.js';
import { crystalCombustionStep } from './steps/mage/crystalCombustion.js';
import { supportOrbsStep } from './steps/mage/supportOrbs.js';

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
    damageModifiersStep,
    damageMultiplierStep,
    sharpshooterStep,
    criticalDamageStep,
    augmentFinalStep,
    attackSpeedStep,
    burstStep,
    specialAttacksStep,
    ricochetStep,
    augmentDamageStep,
    crystalCombustionStep,
    supportOrbsStep
];

/**
 * Costruisce il contesto condiviso dalla pipeline.
 * @param {Object} options
 * @param {Record<string, StatTotals>} options.statsValues
 * @param {Record<ClassKey, Record<string, number>>} options.skillValues
 * @param {BuildState} options.build
 * @param {Record<ClassKey, import('../../data/types.js').SkillTreeClass>} [options.skillTrees]
 * @param {import('../../data/types.js').DamageSettings} [options.settings]
 * @param {import('../specialAbilityManager.js').SpecialAbilityManager} [options.specialAbilityManager]
 * @returns {DamageContext}
 */
export function createDamageContext({
    statsValues,
    skillValues,
    build,
    skillTrees,
    settings,
    specialAbilityManager
}) {
    return {
        statsValues,
        skillValues,
        build,
        skillTrees: skillTrees ?? /** @type {Record<ClassKey, import('../../data/types.js').SkillTreeClass>} */ ({}),
        weapon: build.activeEquip.weapon ?? null,
        specialAbilityManager,
        settings: settings ?? {
            slowAttack: false,
            attackInterval: null,
            useBurst: false,
            griefUptime: 100,
            lastSorrowUptime: 100,
            focusStacks: 0,
            potentialChargeKills: 0,
            crystalExplosionOverride: false,
            crystalExplosionsPerSecond: 0,
            disabledSpecialAttacks: [],
            abilityCooldownOverrides: {},
            abilityHitCountOverrides: {},
            abilityDamageOverrides: {},
            executionHpPercent: 50,
            prosecutionHpPercent: 50,
            enragedHpPercent: 50,
            infectedHitsOverride: 0,
            deathburstKillsPerSecond: 0.2,
            calculatedStrikeKillsPerSecond: 0
        },
        results: {},
        cache: {}
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
