import { findStat } from './statLookup.js';

/** @typedef {import('../../data/types.js').StatTotals} StatTotals */

/**
 * Converte un valore grezzo (numero o stringa tipo "12.5%") in numero.
 * Restituisce 0 per valori non numerici.
 * @param {unknown} value
 * @returns {number}
 */
export function readNumber(value) {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : 0;
    }

    if (typeof value !== 'string') return 0;

    const normalized = value.replaceAll('%', '').replace(',', '.').trim();
    if (!normalized) return 0;

    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Somma i contributi flat di una statistica.
 * @param {Record<string, StatTotals>} statsValues
 * @param {string} statName
 * @returns {number}
 */
export function getStatFlat(statsValues, statName) {
    return findStat(statsValues, statName)?.flat ?? 0;
}

/**
 * Somma i contributi percentuali di una statistica.
 * @param {Record<string, StatTotals>} statsValues
 * @param {string} statName
 * @returns {number}
 */
export function getStatPercent(statsValues, statName) {
    return findStat(statsValues, statName)?.percent ?? 0;
}

/**
 * Risolve una statistica con contributi flat e percentuali in un valore unico:
 * `flat * (1 + percent / 100)`.
 *
 * Le statistiche solo percentuali (es. Crit Chance) vanno lette con
 * `getStatPercent`, non con questa funzione.
 * @param {Record<string, StatTotals>} statsValues
 * @param {string} statName
 * @returns {number}
 */
export function resolveStat(statsValues, statName) {
    const totals = findStat(statsValues, statName);
    if (!totals) return 0;

    return totals.flat * (1 + totals.percent / 100);
}
