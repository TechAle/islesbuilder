import {
    ARCHER_NODES,
    SHARPSHOOTER_BASE_MAX_STACKS,
    SHARPSHOOTER_GAIN_COOLDOWN,
    getArcherNodeParameter,
    getArcherNodeValue
} from './shared.js';

/** @typedef {import('../../../data/types.js').DamageContext} DamageContext */

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
