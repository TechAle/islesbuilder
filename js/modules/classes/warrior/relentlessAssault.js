import { WARRIOR_NODES, getWarriorNodeLevel, getWarriorNodeValue } from './shared.js';

/** @typedef {import('../../../data/types.js').DamageContext} DamageContext */

/**
 * Relentless Assault.
 *
 * Ogni kill aumenta del `val%` il colpo successivo. Se la kill rate è K/s e
 * gli hit totali sono H/s, la frazione media di hit che riceve il buff è:
 *
 *   coverage = min(1, K / H)
 *
 * Il bonus medio al danno è quindi `val × coverage`.
 *
 * È la stessa logica media usata per gli altri effetti che dipendono da hit
 * o kill rate: non simuliamo il singolo colpo, ma distribuiamo il bonus sulla
 * percentuale di hit che possono usufruirne.
 *
 * @param {DamageContext} context
 * @param {number} totalHitsPerSecond
 * @returns {{
 *   visible: boolean,
 *   enabled: boolean,
 *   level: number,
 *   nodePercent: number,
 *   killsPerSecond: number,
 *   totalHitsPerSecond: number,
 *   coverage: number,
 *   damagePercent: number,
 *   reason: string|null
 * }}
 */
export function getRelentlessAssaultEffects(context, totalHitsPerSecond) {
    const nodePercent = getWarriorNodeValue(context, WARRIOR_NODES.relentlessAssault);
    const level = getWarriorNodeLevel(context, WARRIOR_NODES.relentlessAssault);
    const killsSetting = Number(context.settings?.relentlessAssaultKillsPerSecond);
    const killsPerSecond = Number.isFinite(killsSetting)
        ? Math.max(0, killsSetting)
        : 0;
    const hits = Number.isFinite(totalHitsPerSecond)
        ? Math.max(0, totalHitsPerSecond)
        : 0;

    const coverage = nodePercent > 0 && hits > 0
        ? Math.min(1, killsPerSecond / hits)
        : 0;
    const damagePercent = nodePercent * coverage;
    const visible = nodePercent > 0;

    let reason = null;
    if (!visible) {
        reason = 'Requires Relentless Assault';
    } else if (hits <= 0) {
        reason = 'No hits to apply the buff';
    } else if (killsPerSecond <= 0) {
        reason = 'No kills';
    }

    return {
        visible,
        enabled: damagePercent > 0,
        level,
        nodePercent,
        killsPerSecond,
        totalHitsPerSecond: hits,
        coverage,
        damagePercent,
        reason
    };
}
