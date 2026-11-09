import { findPercent } from '../damage/statLookup.js';
import {
    getDefaultAttackReverseMultiplier,
    getWeaponClass
} from '../damage/weaponProps.js';

/** @typedef {import('../../data/types.js').DamageContext} DamageContext */

/** Cooldown fisso di Ricochet, in secondi. */
export const RICOCHET_COOLDOWN = 2;

/** Cooldown condiviso tra i gain di Sharpshooter, in secondi. */
export const SHARPSHOOTER_GAIN_COOLDOWN = 0.2;

/** Stack massimi base di Sharpshooter, prima di Sharpshooter Capacity. */
export const SHARPSHOOTER_BASE_MAX_STACKS = 10;

/**
 * Nodi del tree dell'arciere usati dal calcolo danni.
 * @type {{
 *   calculatedStrike: string,
 *   ricochet: string,
 *   sharpshooterStacks: string,
 *   sharpshooterCapacity: string,
 *   hotStreak: string
 * }}
 */
export const ARCHER_NODES = {
    calculatedStrike: 'UL',
    ricochet: 'UL1',
    sharpshooterStacks: 'L1',
    sharpshooterCapacity: 'L1a',
    hotStreak: 'L1b'
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
 * Legge un parametro specifico di un nodo arciere.
 * @param {DamageContext} context
 * @param {string} nodeId
 * @param {string} parameterKey
 * @returns {number}
 */
export function getArcherNodeParameter(context, nodeId, parameterKey) {
    const node = context.skillTrees?.archer?.nodes?.[nodeId];
    const level = context.build?.treeLevels?.archer?.get(nodeId) ?? 0;
    if (!node || level <= 0) return 0;

    const parameter = node.parameters?.[parameterKey];
    if (!parameter) return 0;

    return parameter.base + parameter.increase * (level - 1);
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

/**
 * Sharpshooter: ogni hit entro `a` secondi dà uno stack (max 10 + Capacity),
 * con un cooldown di 0.2s tra i gain. Gli stack restano finché non subisci
 * danno; in questa stima assumiamo che il fight duri abbastanza da arrivare
 * al massimo e che non si prenda danno.
 *
 * Hot Streak si attiva quando si raggiungono almeno 10 stack.
 *
 * @param {DamageContext} context
 * @param {number} totalHitsPerSecond
 * @returns {{
 *   stackValuePercent: number,
 *   capacity: number,
 *   maxStacks: number,
 *   windowSeconds: number,
 *   gainCooldown: number,
 *   stacksPerSecond: number,
 *   timeToMaxStacks: number,
 *   totalHitsPerSecond: number,
 *   canGainStacks: boolean,
 *   stacks: number,
 *   damagePercent: number,
 *   hotStreakLevel: number,
 *   hotStreakActive: boolean,
 *   hotStreakCritChancePercent: number,
 *   hotStreakCritDamagePercent: number,
 *   enabled: boolean,
 *   reason: string|null
 * }}
 */
export function getSharpshooterEffects(context, totalHitsPerSecond) {
    const stackValuePercent = getArcherNodeValue(
        context,
        ARCHER_NODES.sharpshooterStacks
    );
    const capacity = getArcherNodeValue(
        context,
        ARCHER_NODES.sharpshooterCapacity
    );
    const windowSeconds = getArcherNodeParameter(
        context,
        ARCHER_NODES.sharpshooterStacks,
        'a'
    );
    const hotStreakLevel = context.build?.treeLevels?.archer?.get(
        ARCHER_NODES.hotStreak
    ) ?? 0;
    const maxStacks = SHARPSHOOTER_BASE_MAX_STACKS + capacity;
    const stacksPerSecond = Math.min(
        Math.max(0, totalHitsPerSecond),
        1 / SHARPSHOOTER_GAIN_COOLDOWN
    );
    const firstHit = context.settings?.firstHit === true;
    const canGainStacks = !firstHit
        && stackValuePercent > 0
        && windowSeconds > 0
        && totalHitsPerSecond >= 1 / windowSeconds;
    const stacks = canGainStacks ? maxStacks : 0;
    const damagePercent = stacks * stackValuePercent;
    const timeToMaxStacks = stacksPerSecond > 0
        ? maxStacks / stacksPerSecond
        : Infinity;

    const hotStreakCritChancePercent = hotStreakLevel > 0
        ? getArcherNodeParameter(context, ARCHER_NODES.hotStreak, 'a')
        : 0;
    const hotStreakCritDamagePercent = hotStreakLevel > 0
        ? getArcherNodeParameter(context, ARCHER_NODES.hotStreak, 'b')
        : 0;
    const hotStreakActive = canGainStacks
        && stacks >= SHARPSHOOTER_BASE_MAX_STACKS
        && hotStreakLevel > 0;

    let reason = null;
    if (stackValuePercent <= 0) {
        reason = 'Requires Sharpshooter Stacks';
    } else if (firstHit) {
        reason = 'First hit';
    } else if (!canGainStacks) {
        reason = 'Hits too slow to gain stacks';
    }

    return {
        stackValuePercent,
        capacity,
        maxStacks,
        windowSeconds,
        gainCooldown: SHARPSHOOTER_GAIN_COOLDOWN,
        stacksPerSecond,
        timeToMaxStacks,
        totalHitsPerSecond,
        canGainStacks,
        stacks,
        damagePercent,
        hotStreakLevel,
        hotStreakActive,
        hotStreakCritChancePercent: hotStreakActive ? hotStreakCritChancePercent : 0,
        hotStreakCritDamagePercent: hotStreakActive ? hotStreakCritDamagePercent : 0,
        enabled: stackValuePercent > 0,
        reason
    };
}
