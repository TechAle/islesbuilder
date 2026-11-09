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
 *   sharpshooterResetsPerSecond: number,
 *   stackUptime: number,
 *   fightDurationSeconds: number,
 *   rampFactor: number,
 *   stacks: number,
 *   damagePercent: number,
 *   hotStreakLevel: number,
 *   hotStreakActive: boolean,
 *   hotStreakUptime: number,
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
    const resetsPerSecond = Math.min(
        2,
        Math.max(0, Number(context.settings?.sharpshooterResetsPerSecond) || 0)
    );
    const stackUptime = Math.max(0, 1 - resetsPerSecond / 2);
    const canGainStacks = !firstHit
        && stackValuePercent > 0
        && windowSeconds > 0
        && totalHitsPerSecond >= 1 / windowSeconds;
    const timeToMaxStacks = stacksPerSecond > 0
        ? maxStacks / stacksPerSecond
        : Infinity;

    // Contro un target con vita finita il TTK stimato ci dà la durata del
    // fight: gli stack partono da 0 e salgono fino al cap, quindi la media
    // include la fase di ramp. Senza target noto si assume fight lungo.
    const fightDurationSeconds = Number(context.settings?.estimatedTimeToKill);
    const hasFightDuration = Number.isFinite(fightDurationSeconds)
        && fightDurationSeconds > 0;
    const rampFactor = !hasFightDuration || !Number.isFinite(timeToMaxStacks)
        ? 1
        : fightDurationSeconds <= timeToMaxStacks
            ? fightDurationSeconds / (2 * timeToMaxStacks)
            : 1 - timeToMaxStacks / (2 * fightDurationSeconds);

    const stacks = canGainStacks
        ? maxStacks * rampFactor * stackUptime
        : 0;
    const damagePercent = stacks * stackValuePercent;

    const hotStreakCritChancePercent = hotStreakLevel > 0
        ? getArcherNodeParameter(context, ARCHER_NODES.hotStreak, 'a')
        : 0;
    const hotStreakCritDamagePercent = hotStreakLevel > 0
        ? getArcherNodeParameter(context, ARCHER_NODES.hotStreak, 'b')
        : 0;

    // Hot Streak non scade più dopo i 5s: una volta raggiunto il cap viene
    // considerato attivo per il resto del fight. La quota di fight dopo il
    // cap viene comunque pesata nella media.
    const hotStreakUptime = canGainStacks
        && maxStacks >= SHARPSHOOTER_BASE_MAX_STACKS
        && hotStreakLevel > 0
        && stackUptime > 0
        ? (hasFightDuration
            ? Math.max(0, 1 - timeToMaxStacks / fightDurationSeconds)
            : 1) * stackUptime
        : 0;
    const hotStreakActive = hotStreakUptime > 0;

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
        sharpshooterResetsPerSecond: resetsPerSecond,
        stackUptime,
        fightDurationSeconds: hasFightDuration ? fightDurationSeconds : Infinity,
        rampFactor,
        stacks,
        damagePercent,
        hotStreakLevel,
        hotStreakActive,
        hotStreakUptime,
        hotStreakCritChancePercent: hotStreakActive
            ? hotStreakCritChancePercent * hotStreakUptime
            : 0,
        hotStreakCritDamagePercent: hotStreakActive
            ? hotStreakCritDamagePercent * hotStreakUptime
            : 0,
        enabled: stackValuePercent > 0,
        reason
    };
}
