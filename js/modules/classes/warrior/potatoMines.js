import {
    WARRIOR_NODES,
    getWarriorNodeLevel,
    getWarriorNodeParameter
} from './shared.js';

/** @typedef {import('../../../data/types.js').DamageContext} DamageContext */

/** Numero massimo di Potato Mines attive. */
export const POTATO_MINES_MAX = 3;

/** Tempo di ricarica di una Potato Mine, in secondi. */
export const POTATO_MINES_RECHARGE_SECONDS = 8;

/**
 * Potato Mines / Poisoned Potatoes / Hot Potato.
 *
 * Modello:
 * - ogni hit subito ha `a%` di probabilità di generare una mina;
 * - al massimo 3 mine, una si ricarica ogni 8s;
 * - assumiamo che il nemico passi subito sulla mina, quindi la esplode;
 * - ogni esplosione fa `b%` del danno medio;
 * - Poisoned Potatoes riduce la difesa del nemico;
 * - Hot Potato dà `val%` al prossimo hit dopo un'esplosione.
 *
 * Il rate massimo di esplosioni è:
 *
 *   maxExplosions/s = 3 / 8
 *
 * Il rate effettivo è:
 *
 *   explosions/s = min(3 / 8, hitsTaken/s × a%)
 *
 * Hot Potato viene mediato come Relentless Assault:
 *
 *   coverage = min(1, explosions/s / hits/s)
 *   hotPotato% = val% × coverage
 *
 * @param {DamageContext} context
 * @param {number} totalHitsPerSecond
 * @returns {{
 *   visible: boolean,
 *   enabled: boolean,
 *   level: number,
 *   poisonedLevel: number,
 *   hotPotatoLevel: number,
 *   hitsTakenPerSecond: number,
 *   spawnChancePercent: number,
 *   explosionDamagePercent: number,
 *   maxMines: number,
 *   rechargeSeconds: number,
 *   spawnAttemptsPerSecond: number,
 *   explosionsPerSecond: number,
 *   poisonDefenseReductionPercent: number,
 *   poisonDurationSeconds: number,
 *   poisonUptime: number,
 *   averageDefenseReductionPercent: number,
 *   hotPotatoPerStackPercent: number,
 *   hotPotatoCoverage: number,
 *   hotPotatoDamagePercent: number,
 *   reason: string|null
 * }}
 */
export function getPotatoMinesEffects(context, totalHitsPerSecond) {
    const level = getWarriorNodeLevel(context, WARRIOR_NODES.potatoMines);
    const poisonedLevel = getWarriorNodeLevel(context, WARRIOR_NODES.poisonedPotatoes);
    const hotPotatoLevel = getWarriorNodeLevel(context, WARRIOR_NODES.hotPotato);

    const spawnChancePercent = getWarriorNodeParameter(
        context,
        WARRIOR_NODES.potatoMines,
        'a'
    );
    const explosionDamagePercent = getWarriorNodeParameter(
        context,
        WARRIOR_NODES.potatoMines,
        'b'
    );
    const poisonDefenseReductionPercent = getWarriorNodeParameter(
        context,
        WARRIOR_NODES.poisonedPotatoes,
        'a'
    );
    const poisonDurationSeconds = getWarriorNodeParameter(
        context,
        WARRIOR_NODES.poisonedPotatoes,
        'b'
    );
    const hotPotatoPerStackPercent = getWarriorNodeParameter(
        context,
        WARRIOR_NODES.hotPotato,
        'val'
    );

    const hitsSetting = Number(context.settings?.potatoMinesHitsPerSecond);
    const hitsTakenPerSecond = Number.isFinite(hitsSetting)
        ? Math.max(0, hitsSetting)
        : 0;
    const hitsDealtPerSecond = Number.isFinite(totalHitsPerSecond)
        ? Math.max(0, totalHitsPerSecond)
        : 0;

    const maxExplosionsPerSecond = POTATO_MINES_MAX / POTATO_MINES_RECHARGE_SECONDS;
    const spawnAttemptsPerSecond = hitsTakenPerSecond * (spawnChancePercent / 100);
    const explosionsPerSecond = Math.min(
        maxExplosionsPerSecond,
        spawnAttemptsPerSecond
    );

    const poisonUptime = poisonDurationSeconds > 0
        ? Math.min(1, explosionsPerSecond * poisonDurationSeconds)
        : 0;
    const averageDefenseReductionPercent = poisonDefenseReductionPercent * poisonUptime;

    const hotPotatoCoverage = hotPotatoPerStackPercent > 0
        && hitsDealtPerSecond > 0
        ? Math.min(1, explosionsPerSecond / hitsDealtPerSecond)
        : 0;
    const hotPotatoDamagePercent = hotPotatoPerStackPercent * hotPotatoCoverage;

    const visible = level > 0 || poisonedLevel > 0 || hotPotatoLevel > 0;

    let reason = null;
    if (!visible) {
        reason = 'Requires Potato Mines';
    } else if (hitsTakenPerSecond <= 0) {
        reason = 'No hits taken';
    } else if (spawnChancePercent <= 0) {
        reason = 'Invalid spawn chance';
    }

    return {
        visible,
        enabled: explosionsPerSecond > 0 && explosionDamagePercent > 0,
        level,
        poisonedLevel,
        hotPotatoLevel,
        hitsTakenPerSecond,
        spawnChancePercent,
        explosionDamagePercent,
        maxMines: POTATO_MINES_MAX,
        rechargeSeconds: POTATO_MINES_RECHARGE_SECONDS,
        spawnAttemptsPerSecond,
        explosionsPerSecond,
        poisonDefenseReductionPercent,
        poisonDurationSeconds,
        poisonUptime,
        averageDefenseReductionPercent,
        hotPotatoPerStackPercent,
        hotPotatoCoverage,
        hotPotatoDamagePercent,
        reason
    };
}
