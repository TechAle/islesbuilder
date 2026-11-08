import { CLASS_KEYS, getItemCategoryForSlot, MAX_AUGMENTS_PER_ITEM } from '../data/constants.js';
import { clampUpgradeLevel } from './itemUpgrade.js';

/** @typedef {import('../data/types.js').BuildState} BuildState */
/** @typedef {import('../data/types.js').ClassKey} ClassKey */
/** @typedef {import('../data/types.js').EquipSlotData} EquipSlotData */
/** @typedef {import('../data/types.js').EquipSlot} EquipSlot */
/** @typedef {import('../data/types.js').SerializedState} SerializedState */

/**
 * Codec della build per la condivisione via URL.
 * Non tocca il DOM: clipboard, prompt e alert restano nel renderer.
 */
export class ShareManager {
    /**
     * @param {Object} options
     * @param {import('../store/dataStore.js').DataStore} options.dataStore
     * @param {import('../store/equippedStore.js').BuildStore} options.equippedStore
     * @param {Location} options.location
     */
    constructor({ dataStore, equippedStore, location }) {
        this.dataStore = dataStore;
        this.equippedStore = equippedStore;
        this.location = location;
    }

    /**
     * Serializza lo stato corrente della build.
     * @returns {SerializedState}
     */
    serialize() {
        /** @type {Record<ClassKey, Array<[string, number]>>} */
        const treeLevels = /** @type {Record<ClassKey, Array<[string, number]>>} */ ({});

        CLASS_KEYS.forEach(classKey => {
            treeLevels[classKey] = Array.from(this.equippedStore.state.treeLevels[classKey].entries());
        });

        return {
            equip: this.equippedStore.state.activeEquip,
            elixirs: this.equippedStore.state.elixirs.map(elixir => ({
                id: elixir.id,
                val: elixir.val
            })),
            treeLevels,
            currentClass: this.equippedStore.state.currentClass,
            sharedPoints: this.equippedStore.state.sharedPoints
        };
    }

    /**
     * Crea l'URL condivisibile con lo stato corrente.
     * @returns {string}
     */
    createShareUrl() {
        const jsonString = JSON.stringify(this.serialize());
        const encoded = btoa(encodeURIComponent(jsonString));
        return `${this.location.origin}${this.location.pathname}#${encoded}`;
    }

    /**
     * Estrae il codice hash da un URL o da un input diretto.
     * @param {string} input
     * @returns {string|null}
     */
    extractHash(input) {
        const trimmed = input.trim();
        if (!trimmed) return null;

        const hash = trimmed.includes('#') ? trimmed.split('#')[1] : trimmed;
        return hash || null;
    }

    /**
     * Decodifica e applica una build dall'hash.
     * @param {string} hash
     * @returns {boolean} True se il caricamento è riuscito
     */
    loadFromHash(hash) {
        const cleanHash = hash.startsWith('#') ? hash.slice(1) : hash;
        if (!cleanHash) return false;

        try {
            const jsonString = decodeURIComponent(atob(cleanHash));
            /** @type {SerializedState} */
            const state = JSON.parse(jsonString);

            /** @type {Partial<BuildState>} */
            const newState = {};

            if (state.equip) {
                // Mantiene tutti gli slot esistenti e sovrascrive solo quelli
                // presenti nel link: un link parziale non deve corrompere lo stato.
                const reconstructedEquip = structuredClone(this.equippedStore.state.activeEquip);

                Object.entries(state.equip).forEach(([slot, savedItem]) => {
                    const equipSlot = /** @type {EquipSlot} */ (slot);
                    const currentSlot = reconstructedEquip[equipSlot];
                    if (!currentSlot || !savedItem || typeof savedItem !== 'object') return;

                    const item = {
                        ...currentSlot,
                        ...savedItem,
                        stats: { ...(savedItem.stats || {}) },
                        augments: Array.isArray(savedItem.augments)
                            ? savedItem.augments.slice(0, MAX_AUGMENTS_PER_ITEM)
                            : currentSlot.augments,
                        upgradeLevel: Number(savedItem.upgradeLevel) || 0
                    };

                    if (item.name) {
                        // Cerca l'oggetto corrispondente nel database globale
                        // (ring1 e ring2 usano la categoria "ring")
                        const dataCategory = getItemCategoryForSlot(equipSlot);
                        const dbItems = this.dataStore.data.items[dataCategory] || [];
                        const matchedPreset = dbItems.find(
                            preset => preset.name.toLowerCase() === item.name.toLowerCase()
                        );

                        if (matchedPreset) {
                            // Le stats salvate mantengono la precedenza se personalizzate
                            item.stats = {
                                ...matchedPreset.stats,
                                ...item.stats
                            };
                        }
                    }

                    item.upgradeLevel = clampUpgradeLevel(item, item.upgradeLevel);
                    reconstructedEquip[equipSlot] = item;
                });

                newState.activeEquip = reconstructedEquip;
            }

            if (state.elixirs) {
                newState.elixirs = this.equippedStore.state.elixirs.map(elixir => {
                    const match = state.elixirs.find(saved => saved.id === elixir.id);
                    return match ? { ...elixir, val: match.val } : elixir;
                });
            }

            if (state.treeLevels) {
                /** @type {Record<ClassKey, Map<string, number>>} */
                const treeLevels = /** @type {Record<ClassKey, Map<string, number>>} */ ({});

                CLASS_KEYS.forEach(classKey => {
                    const savedLevels = state.treeLevels[classKey];
                    treeLevels[classKey] = savedLevels
                        ? new Map(savedLevels)
                        : this.equippedStore.state.treeLevels[classKey];
                });

                newState.treeLevels = treeLevels;
            }

            if (state.currentClass) newState.currentClass = state.currentClass;
            if (typeof state.sharedPoints === 'number') newState.sharedPoints = state.sharedPoints;

            this.equippedStore.setState(newState, 'all');
            return true;
        } catch (error) {
            console.error('Errore nel caricamento dello stato:', error);
            return false;
        }
    }
}
