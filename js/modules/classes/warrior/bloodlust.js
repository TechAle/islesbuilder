import {
    WARRIOR_NODES,
    getWarriorNodeLevel,
    getWarriorNodeParameter,
    getWarriorNodeValue
} from './shared.js';

/** @typedef {import('../../../data/types.js').DamageContext} DamageContext */

/** Stack base di Bloodlust, prima di Bloodlust Capacity. */
export const BLOODLUST_BASE_MAX_STACKS = 3;

/**
 * Bloodlust Stacks / Capacity / Bloodthirsty.
 *
 * Modello medio:
 * - ogni hit subito dà uno stack;
 * - ogni stack dura `windowSeconds`;
 * - gli stack medi attivi sono `min(maxStacks, hitsTaken/s × window)`;
 * - Bloodlust dà `dmgPerStack%` per stack attivo;
 * - Bloodthirsty, quando gli stack scadono, dà `val%` per stack al prossimo hit.
 *
 * Per Bloodthirsty stimiamo la frazione di hit che arrivano dopo un buco
 * maggiore della finestra con un processo di Poisson:
 *
 *   expiryChance = e^(-hitsTaken/s × window)
 *
 * Il bonus medio è quindi:
 *
 *   bloodthirsty% = expiryChance × stack medi × val%
 *
 * È una stima: non simula il singolo evento, ma usa la stessa logica media
 * degli altri effetti basati su hit rate.
 *
 * @param {DamageContext} context
 * @returns {{
 *   visible: boolean,
 *   enabled: boolean,
 *   level: number,
 *   capacityLevel: number,
 *   bloodthirstyLevel: number,
 *   windowSeconds: number,
 *   hitsTakenPerSecond: number,
 *   dmgPerStackPercent: number,
 *   bloodthirstyPerStackPercent: number,
 *   maxStacks: number,
 *   averageStacks: number,
 *   expiryChance: number,
 *   damagePercent: number,
 *   bloodthirstyDamagePercent: number,
 *   totalDamagePercent: number,
 *   reason: string|null
 * }}
 */
export function getBloodlustEffects(context) {
    const level = getWarriorNodeLevel(context, WARRIOR_NODES.bloodlustStacks);
    const capacityLevel = getWarriorNodeLevel(context, WARRIOR_NODES.bloodlustCapacity);
    const bloodthirstyLevel = getWarriorNodeLevel(context, WARRIOR_NODES.bloodthirsty);

    const windowSeconds = getWarriorNodeParameter(
        context,
        WARRIOR_NODES.bloodlustStacks,
        'time'
    );
    const dmgPerStackPercent = getWarriorNodeParameter(
        context,
        WARRIOR_NODES.bloodlustStacks,
        'dmg'
    );
    const capacity = getWarriorNodeValue(
        context,
        WARRIOR_NODES.bloodlustCapacity
    );
    const bloodthirstyPerStackPercent = getWarriorNodeValue(
        context,
        WARRIOR_NODES.bloodthirsty
    );

    const hitsSetting = Number(context.settings?.bloodlustHitsPerSecond);
    const hitsTakenPerSecond = Number.isFinite(hitsSetting)
        ? Math.max(0, hitsSetting)
        : 0;

    const maxStacks = BLOODLUST_BASE_MAX_STACKS + capacity;
    const averageStacks = windowSeconds > 0
        ? Math.min(maxStacks, hitsTakenPerSecond * windowSeconds)
        : 0;
    const damagePercent = averageStacks * dmgPerStackPercent;

    // Con hit/s = 0 non c'è nessun "next hit": Bloodthirsty non può colpire.
    const expiryChance = hitsTakenPerSecond > 0 && windowSeconds > 0
        ? Math.exp(-hitsTakenPerSecond * windowSeconds)
        : 0;
    const bloodthirstyDamagePercent = expiryChance
        * averageStacks
        * bloodthirstyPerStackPercent;

    const visible = level > 0 || capacityLevel > 0 || bloodthirstyLevel > 0;

    let reason = null;
    if (!visible) {
        reason = 'Requires Bloodlust Stacks';
    } else if (hitsTakenPerSecond <= 0) {
        reason = 'No hits taken';
    } else if (windowSeconds <= 0) {
        reason = 'Invalid Bloodlust window';
    }

    return {
        visible,
        enabled: damagePercent > 0 || bloodthirstyDamagePercent > 0,
        level,
        capacityLevel,
        bloodthirstyLevel,
        windowSeconds,
        hitsTakenPerSecond,
        dmgPerStackPercent,
        bloodthirstyPerStackPercent,
        maxStacks,
        averageStacks,
        expiryChance,
        damagePercent,
        bloodthirstyDamagePercent,
        totalDamagePercent: damagePercent + bloodthirstyDamagePercent,
        reason
    };
}
