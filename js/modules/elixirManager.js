import { MAX_ELIXIR_LEVEL } from '../data/constants.js';

/**
 * Logica degli elisir: validazione del livello e aggiornamento dello store.
 * Non tocca il DOM.
 */
export class ElixirManager {
    /** @param {{equippedStore: import('../store/equippedStore.js').BuildStore}} options */
    constructor({ equippedStore }) {
        this.equippedStore = equippedStore;
    }

    /**
     * Aggiorna il livello di un elisir applicando i limiti consentiti.
     * @param {number} index
     * @param {string} value
     */
    handleChange(index, value) {
        let parsed = parseInt(value, 10);
        if (isNaN(parsed) || parsed < 0) parsed = 0;
        if (parsed > MAX_ELIXIR_LEVEL) parsed = MAX_ELIXIR_LEVEL;

        this.equippedStore.setElixirValue(index, parsed);
    }

    /**
     * Imposta il livello di tutti gli elisir, applicando i limiti consentiti.
     * @param {number} value
     */
    setAll(value) {
        let parsed = Math.trunc(Number(value));
        if (!Number.isFinite(parsed) || parsed < 0) parsed = 0;
        if (parsed > MAX_ELIXIR_LEVEL) parsed = MAX_ELIXIR_LEVEL;

        this.equippedStore.setAllElixirValues(parsed);
    }
}
