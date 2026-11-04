import { getAttackInterval } from './attackTiming.js';
import { findPercent } from './statLookup.js';

/** @typedef {import('../../data/types.js').DamageContext} DamageContext */

/**
 * Statistiche dei colpi al secondo.
 *
 * Funzione centrale per tenere traccia di hits e crits: in futuro basta
 * aggiungere qui eventuali fonti extra.
 *
 * @param {DamageContext} context
 * @param {number} [extraHitsPerSecond]
 * @returns {{
 *   normalHitsPerSecond: number,
 *   extraHitsPerSecond: number,
 *   totalHitsPerSecond: number,
 *   critChancePercent: number,
 *   critsPerSecond: number
 * }}
 */
export function getHitStats(context, extraHitsPerSecond = 0) {
    const normalHitsPerSecond = 1 / getAttackInterval(context);
    const extra = Math.max(0, extraHitsPerSecond);
    const totalHitsPerSecond = normalHitsPerSecond + extra;
    const critChancePercent = Math.min(100, Math.max(0, findPercent(context.statsValues, 'Crit Chance')));
    const critsPerSecond = totalHitsPerSecond * (critChancePercent / 100);

    return {
        normalHitsPerSecond,
        extraHitsPerSecond: extra,
        totalHitsPerSecond,
        critChancePercent,
        critsPerSecond
    };
}
