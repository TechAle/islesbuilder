import { findPercent } from '../damage/statLookup.js';
import {
    getDefaultAttackReverseMultiplier,
    getWeaponClass
} from '../damage/weaponProps.js';

/** @typedef {import('../../data/types.js').DamageContext} DamageContext */

/** Cooldown fisso di Ricochet, in secondi. */
export const RICOCHET_COOLDOWN = 2;

/**
 * Nodi del tree dell'arciere usati dal calcolo danni.
 * @type {{calculatedStrike: string, ricochet: string}}
 */
export const ARCHER_NODES = {
    calculatedStrike: 'UL',
    ricochet: 'UL1'
};

/**
 * Legge il valore scalato di un nodo per il livello corrente.
 * @param {{parameters?: Record<string, {base: number, increase: number}>}|undefined} node
 * @param {number} level
 * @returns {number}
 */
function getNodeValue(node, level) {
    if (!node || level <= 0) return 0;

    const parameter = node.parameters?.val;
    if (!parameter) return level;

    return parameter.base + parameter.increase * (level - 1);
}

/**
 * Legge un nodo del tree dell'arciere dal livello della build.
 * @param {DamageContext} context
 * @param {string} nodeId
 * @returns {number}
 */
export function getArcherNodeValue(context, nodeId) {
    const node = context.skillTrees?.archer?.nodes?.[nodeId];
    const level = context.build?.treeLevels?.archer?.get(nodeId) ?? 0;

    return getNodeValue(node, level);
}

/**
 * Calculated Strike: ogni kill ha una probabilità di resettare il cooldown
 * dell'attacco. Un reset vale un attacco immediato in più, quindi il bonus
 * non è una riduzione percentuale del cooldown ma attacchi extra al secondo:
 *
 *   reset/s = (valore nodo / 100) × kill/s
 *
 * @param {DamageContext} context
 * @param {number} killsPerSecond
 * @returns {{
 *   calculatedStrikePercent: number,
 *   killsPerSecond: number,
 *   extraAttacksPerSecond: number
 * }}
 */
export function getCalculatedStrikeEffects(context, killsPerSecond) {
    const calculatedStrikePercent = getArcherNodeValue(
        context,
        ARCHER_NODES.calculatedStrike
    );
    const kills = Math.min(4, Math.max(0, Number(killsPerSecond) || 0));
    const extraAttacksPerSecond = (calculatedStrikePercent / 100) * kills;

    return {
        calculatedStrikePercent,
        killsPerSecond: kills,
        extraAttacksPerSecond
    };
}

/**
 * Ricochet: gli attacchi ranged hanno una probabilità di scagliare una freccia
 * verso il nemico più vicino, con cooldown fisso di 2s.
 *
 * La freccia è danno abilità: usa il reverse del Default Attack (come le
 * special attack) e viene aumentata da `Ability Damage%`.
 * Non funziona con armi magic/melee: serve un'arma ranged.
 *
 * @param {DamageContext} context
 * @param {number} attacksPerSecond
 * @param {number} averageDamage
 * @returns {{
 *   ricochetPercent: number,
 *   procChance: number,
 *   attacksPerSecond: number,
 *   maxProcsPerSecond: number,
 *   procsPerSecond: number,
 *   reverseMultiplier: number,
 *   abilityDamagePercent: number,
 *   damagePerProc: number,
 *   dps: number,
 *   hitsPerSecond: number,
 *   enabled: boolean,
 *   reason: string|null
 * }}
 */
export function getRicochetEffects(context, attacksPerSecond, averageDamage) {
    const ricochetPercent = getArcherNodeValue(context, ARCHER_NODES.ricochet);
    const weaponClass = getWeaponClass(context.weapon);
    const procChance = ricochetPercent / 100;
    const maxProcsPerSecond = RICOCHET_COOLDOWN > 0 ? 1 / RICOCHET_COOLDOWN : 0;
    const reverseMultiplier = getDefaultAttackReverseMultiplier(context.weapon);
    const abilityDamagePercent = findPercent(context.statsValues ?? {}, 'Ability Damage');

    const procRate = attacksPerSecond * procChance;
    const procsPerSecond = Math.min(procRate, maxProcsPerSecond);
    const damagePerProc = averageDamage * reverseMultiplier * (1 + abilityDamagePercent / 100);

    let reason = null;
    if (ricochetPercent <= 0) {
        reason = null;
    } else if (weaponClass !== 'ranged') {
        reason = 'Requires ranged weapon';
    } else if (reverseMultiplier <= 0) {
        reason = 'Requires Default Attack';
    }

    const enabled = ricochetPercent > 0
        && weaponClass === 'ranged'
        && reverseMultiplier > 0
        && attacksPerSecond > 0
        && averageDamage > 0;

    return {
        ricochetPercent,
        procChance,
        attacksPerSecond,
        maxProcsPerSecond,
        procsPerSecond: enabled ? procsPerSecond : 0,
        reverseMultiplier,
        abilityDamagePercent,
        damagePerProc,
        dps: enabled ? procsPerSecond * damagePerProc : 0,
        hitsPerSecond: enabled ? procsPerSecond : 0,
        enabled,
        reason
    };
}
