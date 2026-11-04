import { BASE_ENERGY_REGEN } from '../../../data/constants.js';
import { getMageNodeParameter, getMageNodeValue, MAGE_NODES } from './shared.js';

/** @typedef {import('../../../data/types.js').DamageContext} DamageContext */
/** @typedef {import('../../../data/types.js').ElementalKnowledgeEffect} ElementalKnowledgeEffect */

/**
 * Ogni 1% di Elemental Knowledge aumenta il danno finale del 9%.
 * @type {number}
 */
const ELEMENTAL_KNOWLEDGE_MULTIPLIER = 9;

/**
 * Elemental Channeling: danno elementale extra per ogni elemento.
 * @param {DamageContext} context
 * @returns {number}
 */
export function getElementalChannelingPercent(context) {
    return getMageNodeValue(context, MAGE_NODES.elementalChanneling);
}

/**
 * Elemental Knowledge: moltiplicatore del danno finale.
 * @param {DamageContext} context
 * @returns {ElementalKnowledgeEffect}
 */
export function getElementalKnowledge(context) {
    const elementalKnowledgePercent = getMageNodeValue(context, MAGE_NODES.elementalKnowledge);
    const damageMultiplierPercent = elementalKnowledgePercent * ELEMENTAL_KNOWLEDGE_MULTIPLIER;

    return {
        elementalKnowledgePercent,
        damageMultiplierPercent,
        damageMultiplier: 1 + damageMultiplierPercent / 100
    };
}

/**
 * Natural Distillation applicata a un dato Crit Damage totale.
 * @param {DamageContext} context
 * @param {number} critDamagePercent
 * @returns {import('../../../data/types.js').NaturalDistillationEffect}
 */
export function getNaturalDistillationEffects(context, critDamagePercent) {
    const distillationPercent = getMageNodeValue(context, MAGE_NODES.naturalDistillation);
    const convertedCritDamagePercent = critDamagePercent * (distillationPercent / 100);

    return {
        distillationPercent,
        convertedCritDamagePercent,
        critDamageModifier: -convertedCritDamagePercent,
        elementalPowerFlat: convertedCritDamagePercent * 2
    };
}

/**
 * Elemental Synergy: EP flat per ogni punto intero di Energy Regen sopra 10/s.
 * @param {DamageContext} context
 * @param {number} energyRegen
 * @returns {{
 *   a: number,
 *   b: number,
 *   energyRegen: number,
 *   extraRegen: number,
 *   steps: number,
 *   elementalPowerFlat: number
 * }}
 */
export function getElementalSynergyEffects(context, energyRegen) {
    const a = getMageNodeParameter(context, MAGE_NODES.elementalSynergy, 'a');
    const b = getMageNodeParameter(context, MAGE_NODES.elementalSynergy, 'b');
    const extraRegen = Math.max(0, energyRegen - BASE_ENERGY_REGEN);
    const steps = Math.floor(extraRegen);
    const elementalPowerFlat = Math.min(steps * a, b);

    return { a, b, energyRegen, extraRegen, steps, elementalPowerFlat };
}
