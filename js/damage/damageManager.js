/**
 * @typedef {Object} DamageResult
 * @property {string} label - Nome della voce di danno
 * @property {number} value - Valore calcolato
 * @property {string} [unit] - Unità opzionale (es. "%", "DPS")
 */

class DamageManager {
    constructor() {
        /** @type {DamageResult[]} */
        this.results = []
    }

    /** Ricalcola tutti i risultati di danno. */
    calculate() {
        this.results = []


    }

    /** @returns {DamageResult[]} */
    getResults() {
        return this.results;
    }
}

export const damageManager = new DamageManager();