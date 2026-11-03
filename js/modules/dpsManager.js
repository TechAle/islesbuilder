/** @typedef {import('../data/types.js').DamageResult} DamageResult */

/**
 * Logica del calcolo danni/DPS. Non tocca il DOM: la visualizzazione sarà
 * responsabilità di un renderer dedicato.
 */
export class DpsManager {
    constructor() {
        /** @type {DamageResult[]} */
        this.results = [];
    }

    /** Ricalcola tutti i risultati di danno. */
    recalculate() {
        this.results = [];
    }

    /** @returns {DamageResult[]} */
    getResults() {
        return this.results;
    }
}
