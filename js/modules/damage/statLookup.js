/** @typedef {import('../../data/types.js').StatTotals} StatTotals */

/**
 * Cerca una statistica senza distinguere maiuscole/minuscole.
 * @param {Record<string, StatTotals>} statsValues
 * @param {string} statName
 * @returns {StatTotals|null}
 */
export function findStat(statsValues, statName) {
    const target = statName.trim().toLowerCase();
    if (!target) return null;

    const key = Object.keys(statsValues).find(stat => stat.trim().toLowerCase() === target);
    return key ? statsValues[key] : null;
}

/**
 * Legge un modificatore percentuale, ignorando flat e maiuscole/minuscole.
 * @param {Record<string, StatTotals>} statsValues
 * @param {string} statName
 * @returns {number}
 */
export function findPercent(statsValues, statName) {
    return findStat(statsValues, statName)?.percent ?? 0;
}

/**
 * Legge un valore flat, ignorando maiuscole/minuscole.
 * @param {Record<string, StatTotals>} statsValues
 * @param {string} statName
 * @returns {number}
 */
export function findFlat(statsValues, statName) {
    return findStat(statsValues, statName)?.flat ?? 0;
}
