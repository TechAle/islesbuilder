import { ObservableStore } from './observableStore.js';

/** @typedef {import('../data/types.js').DomainData} DomainData */

/**
 * Store del catalogo globale (oggetti, augment, elisir, alberi skill).
 * Il contenuto iniziale viene passato dal composition root.
 */
export class DataStore extends ObservableStore {
    /** @param {DomainData} initialData */
    constructor(initialData) {
        super();
        /** @type {DomainData} */
        this.data = /** @type {DomainData} */ (structuredClone(initialData));
    }

    /**
     * Aggiorna parzialmente il catalogo e notifica il tipo di dato cambiato.
     * @param {Partial<DomainData>} newDomainData
     * @param {string} event
     */
    updateData(newDomainData, event) {
        Object.assign(this.data, newDomainData);
        this.notify(event);
    }
}
