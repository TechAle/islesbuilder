import { AUGMENT_DATABASE, ITEM_DATABASE, INITIAL_ELIXIRS, CLASS_SKILL_TREES } from './constants.js';

/** @typedef {import('./constants.js').DomainData} DomainData */

/**
 * @callback DataStoreSubscriber
 * @param {DomainData} data
 */

class DataStore {
    constructor() {
        /** @type {Set<DataStoreSubscriber>} */
        this.listeners = new Set();

        // Dati globali di riferimento (modificabili via API)
        /** @type {DomainData} */
        this.data = {
            items: ITEM_DATABASE,
            augments: AUGMENT_DATABASE,
            elixirsConfig: INITIAL_ELIXIRS,
            skillTrees: CLASS_SKILL_TREES
        };
    }

    /**
     * Registra una callback di aggiornamento dei dati globali.
     * @param {DataStoreSubscriber} callback
     * @returns {() => boolean} Funzione per rimuovere la sottoscrizione
     */
    subscribe(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    /** Notifica tutti i subscriber con i dati correnti. */
    notify() {
        this.listeners.forEach(callback => callback(this.data));
    }

    /**
     * Aggiorna i dati globali (es. chiamato dall'ApiManager) e avvisa tutti i subscriber.
     * @param {Partial<DomainData>} newDomainData
     */
    updateData(newDomainData) {
        Object.assign(this.data, newDomainData);
        this.notify();
    }
}

export const dataStore = new DataStore();
/** @type {any} */ (window).dataStore = dataStore;