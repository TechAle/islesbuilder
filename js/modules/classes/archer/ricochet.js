import {
    getDefaultAttackReverseMultiplier,
    getWeaponClass
} from '../../damage/weaponProps.js';
import { findPercent } from '../../damage/statLookup.js';
import {
    ARCHER_NODES,
    RICOCHET_COOLDOWN,
    getArcherNodeValue
} from './shared.js';

/** @typedef {import('../../../data/types.js').DamageContext} DamageContext */

/**
 * Proc rate di Ricochet, indipendente dal danno. Serve anche a Sharpshooter
 * per contare gli hit extra senza creare dipendenze circolari.
 *
 * @param {DamageContext} context
 * @param {number} attacksPerSecond
 * @returns {{
 *   ricochetPercent: number,
 *   procChance: number,
 *   maxProcsPerSecond: number,
 *   procsPerSecond: number,
 *   enabled: boolean
 * }}
 */
export function getRicochetProcRate(context, attacksPerSecond) {
    const ricochetPercent = getArcherNodeValue(context, ARCHER_NODES.ricochet);
    const weaponClass = getWeaponClass(context.weapon);
    const procChance = ricochetPercent / 100;
    const maxProcsPerSecond = RICOCHET_COOLDOWN > 0 ? 1 / RICOCHET_COOLDOWN : 0;
    const enabled = ricochetPercent > 0
        && weaponClass === 'ranged'
        && attacksPerSecond > 0;
    const procsPerSecond = enabled
        ? Math.min(attacksPerSecond * procChance, maxProcsPerSecond)
        : 0;

    return {
        ricochetPercent,
        procChance,
        maxProcsPerSecond,
        procsPerSecond,
        enabled
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
    const procRate = getRicochetProcRate(context, attacksPerSecond);
    const reverseMultiplier = getDefaultAttackReverseMultiplier(context.weapon);
    const abilityDamagePercent = findPercent(context.statsValues ?? {}, 'Ability Damage');
    const damagePerProc = averageDamage * reverseMultiplier * (1 + abilityDamagePercent / 100);
    const weaponClass = getWeaponClass(context.weapon);

    let reason = null;
    if (procRate.ricochetPercent <= 0) {
        reason = null;
    } else if (weaponClass !== 'ranged') {
        reason = 'Requires ranged weapon';
    } else if (reverseMultiplier <= 0) {
        reason = 'Requires Default Attack';
    }

    const enabled = procRate.enabled
        && reverseMultiplier > 0
        && averageDamage > 0;

    return {
        ...procRate,
        attacksPerSecond,
        reverseMultiplier,
        abilityDamagePercent,
        damagePerProc,
        dps: enabled ? procRate.procsPerSecond * damagePerProc : 0,
        hitsPerSecond: procRate.procsPerSecond,
        enabled,
        reason
    };
}
