import {
    AUGMENT_SLOTS_PER_ITEM,
    RING_ITEM_CATEGORY,
    RING_SLOTS,
    getItemCategoryForSlot
} from '../data/constants.js';

/** @typedef {import('../data/types.js').EquipSlot} EquipSlot */
/** @typedef {import('../data/types.js').ItemStats} ItemStats */

/**
 * Logica degli oggetti: risoluzione preset, normalizzazione statistiche e
 * aggiornamento dello store. Non tocca il DOM.
 */
export class ItemManager {
    /**
     * @param {Object} options
     * @param {import('../store/dataStore.js').DataStore} options.dataStore
     * @param {import('../store/equippedStore.js').BuildStore} options.equippedStore
     */
    constructor({ dataStore, equippedStore }) {
        this.dataStore = dataStore;
        this.equippedStore = equippedStore;
    }

    /**
     * Restituisce i nomi degli oggetti disponibili, raggruppati per slot.
     * @returns {Record<string, string[]>}
     */
    getItemNamesBySlot() {
        /** @type {Record<string, string[]>} */
        const namesBySlot = {};

        Object.keys(this.dataStore.data.items).forEach(itemCategory => {
            const slots = itemCategory === RING_ITEM_CATEGORY ? RING_SLOTS : [itemCategory];
            const names = (this.dataStore.data.items[itemCategory] || []).map(item => item.name);

            slots.forEach(slot => {
                namesBySlot[slot] = names;
            });
        });

        return namesBySlot;
    }

    /**
     * Restituisce tutte le statistiche presenti nel catalogo, per i suggerimenti.
     * @returns {string[]}
     */
    getStatSuggestions() {
        const uniqueStats = new Set();

        Object.values(this.dataStore.data.items).forEach(items => {
            items.forEach(item => {
                Object.keys(item.stats || {}).forEach(statKey => {
                    uniqueStats.add(statKey);
                });
            });
        });

        return Array.from(uniqueStats);
    }

    /**
     * Modifica l'oggetto selezionato per uno slot specifico.
     * @param {EquipSlot} slot
     * @param {string} value
     */
    handleItemInput(slot, value) {
        const trimmed = value.trim();

        if (!trimmed) {
            this.equippedStore.setEquipSlot(slot, {
                name: '',
                stats: {},
                augments: Array(AUGMENT_SLOTS_PER_ITEM).fill('')
            });
            return;
        }

        const preset = this.findPreset(slot, trimmed);
        if (preset) {
            this.equippedStore.setEquipSlot(slot, {
                name: preset.name,
                stats: { ...preset.stats }
            });
        } else {
            // Nome personalizzato: non possiamo mantenere le statistiche del vecchio oggetto
            this.equippedStore.setEquipSlot(slot, {
                name: trimmed,
                stats: {}
            });
        }
    }

    /**
     * Cerca un preset per nome nella categoria corretta.
     * @param {EquipSlot} slot
     * @param {string} name
     * @returns {import('../data/types.js').ItemPreset|null}
     */
    findPreset(slot, name) {
        const category = getItemCategoryForSlot(slot);
        const items = this.dataStore.data.items[category] || [];
        return items.find(item => item.name.toLowerCase() === name.toLowerCase()) || null;
    }

    /**
     * Aggiorna il valore di un augment per lo slot indicato.
     * @param {EquipSlot} slot
     * @param {number} index
     * @param {string} value
     */
    handleAugmentInput(slot, index, value) {
        this.equippedStore.setAugment(slot, index, value.trim());
    }

    /**
     * Salva un oggetto personalizzato, normalizzando le righe provenienti dal modale.
     * @param {EquipSlot} slot
     * @param {string} name
     * @param {Array<{name: string, value: string}>} rows
     */
    saveCustomItem(slot, name, rows) {
        this.equippedStore.setEquipSlot(slot, {
            name: name.trim(),
            stats: this.normalizeStats(rows)
        });
    }

    /**
     * Converte le righe del modale in statistiche numeriche o percentuali.
     * @param {Array<{name: string, value: string}>} rows
     * @returns {ItemStats}
     */
    normalizeStats(rows) {
        /** @type {ItemStats} */
        const stats = {};

        rows.forEach(({ name, value }) => {
            const statName = name.trim();
            const rawVal = value.trim();

            if (!statName || rawVal === '') return;

            if (rawVal.includes('%') || isNaN(Number(rawVal.replace(',', '.')))) {
                stats[statName] = rawVal;
            } else {
                stats[statName] = Number(rawVal.replace(',', '.'));
            }
        });

        return stats;
    }
}
