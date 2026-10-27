import { AUGMENT_DATABASE, ITEM_DATABASE, INITIAL_ELIXIRS, CLASS_SKILL_TREES } from './constants.js';

class DataStore {
    constructor() {
        /** @type {Set<(data: any) => void>} */
        this.listeners = new Set();

        // Dati globali di riferimento (modificabili via API)
        this.data = {
            items: ITEM_DATABASE,
            augments: AUGMENT_DATABASE,
            elixirsConfig: INITIAL_ELIXIRS,
            skillTrees: CLASS_SKILL_TREES
        };
    }

    subscribe(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    notify() {
        this.listeners.forEach(callback => callback(this.data));
    }

    /** Aggiorna i dati (es. chiamato dall'ApiManager) e avvisa tutti i subscriber */
    updateData(newDomainData) {
        Object.assign(this.data, newDomainData);
        this.notify();
    }
}

export const dataStore = new DataStore();
window.dataStore = dataStore;