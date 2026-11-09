import { MAGE_NODES } from '../mage/shared.js';
import { ARCHER_NODES } from './shared.js';

/** @typedef {import('../../../data/types.js').DamageContext} DamageContext */

/**
 * Elemental Burst.
 *
 * ATTENZIONE: la formula è stata verificata in gioco ed è volutamente diversa
 * dal testo della Wiki. NON modificarla senza una nuova verifica esplicita.
 *
 *   default:                   1.5 × livello del nodo
 *   con Elemental Channeling ≥ 1: 1.5 × livello del nodo × 9
 *
 * Quindi a 5/5:
 *   - senza Elemental Channeling: 7.5 Crit Damage
 *   - con Elemental Channeling:   67.5 Crit Damage
 *
 * Non dipende dalle Elemental Defense equipaggiate: non reintrodurre quel
 * conteggio.
 *
 * @param {DamageContext} context
 * @returns {import('../../../data/types.js').ElementalBurstEffectsResult}
 */
export function getElementalBurstEffects(context) {
    const level = context.build?.treeLevels?.archer?.get(
        ARCHER_NODES.elementalBurst
    ) ?? 0;
    const baseCritDamagePercent = 1.5 * Math.max(0, level);
    // Elemental Channeling è un nodo del tree mago: basta almeno 1 livello.
    const elementalChannelingLevel = context.build?.treeLevels?.mage?.get(
        MAGE_NODES.elementalChanneling
    ) ?? 0;
    const elementalChannelingActive = elementalChannelingLevel >= 1;
    const elementalChannelingMultiplier = elementalChannelingActive ? 9 : 1;
    const visible = level > 0;
    const critDamageBonusPercent = baseCritDamagePercent
        * elementalChannelingMultiplier;

    return {
        visible,
        enabled: visible,
        level,
        baseCritDamagePercent,
        elementalChannelingActive,
        elementalChannelingMultiplier,
        critDamageBonusPercent,
        reason: visible ? null : 'Requires Elemental Burst'
    };
}
