import { CLASS_KEYS, getItemCategoryForSlot, MAX_AUGMENTS_PER_ITEM, MAX_ELIXIR_LEVEL } from '../data/constants.js';
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

                    const savedAugments = Array.isArray(savedItem.augments)
                        ? savedItem.augments.slice(0, MAX_AUGMENTS_PER_ITEM)
                        : currentSlot.augments;
                    const item = {
                        ...currentSlot,
                        ...savedItem,
                        stats: { ...(savedItem.stats || {}) },
                        augments: [...savedAugments, ...Array(MAX_AUGMENTS_PER_ITEM).fill('')]
                            .slice(0, MAX_AUGMENTS_PER_ITEM),
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
                    if (!match) return elixir;

                    const parsed = Number(match.val);
                    const val = Number.isFinite(parsed)
                        ? Math.min(MAX_ELIXIR_LEVEL, Math.max(0, Math.trunc(parsed)))
                        : 0;

                    return { ...elixir, val };
                });
            }

            if (state.treeLevels) {
                /** @type {Record<ClassKey, Map<string, number>>} */
                const treeLevels = /** @type {Record<ClassKey, Map<string, number>>} */ ({});

                CLASS_KEYS.forEach(classKey => {
                    const savedLevels = state.treeLevels[classKey];
                    const nodes = this.dataStore.data.skillTrees[classKey]?.nodes ?? {};

                    if (!savedLevels) {
                        treeLevels[classKey] = this.equippedStore.state.treeLevels[classKey];
                        return;
                    }

                    const sanitized = new Map();
                    for (const [id, rawLevel] of savedLevels) {
                        const node = nodes[id];
                        if (!node) continue;

                        const level = Math.min(
                            node.max,
                            Math.max(0, Math.trunc(Number(rawLevel) || 0))
                        );
                        if (level > 0) sanitized.set(id, level);
                    }

                    // Rimuove i nodi non più raggiungibili dal centro.
                    const edges = this.dataStore.data.skillTrees[classKey]?.edges ?? [];
                    const parents = new Map();
                    edges.forEach(([parent, child]) => {
                        if (!parents.has(child)) parents.set(child, parent);
                    });
                    const center = Object.keys(nodes).find(id => nodes[id].center);

                    if (!center || !sanitized.get(center)) {
                        sanitized.clear();
                    } else {
                        for (const id of [...sanitized.keys()]) {
                            if (id === center) continue;

                            let current = id;
                            let reachable = true;
                            while (current) {
                                if (!sanitized.get(current)) {
                                    reachable = false;
                                    break;
                                }
                                current = parents.get(current);
                            }
                            if (!reachable) sanitized.delete(id);
                        }
                    }

                    treeLevels[classKey] = sanitized;
                });

                newState.treeLevels = treeLevels;
            }

            if (state.currentClass && CLASS_KEYS.includes(state.currentClass)) {
                newState.currentClass = state.currentClass;
            }
            const savedPoints = Number(state.sharedPoints);
            if (Number.isFinite(savedPoints)) {
                newState.sharedPoints = Math.max(0, Math.trunc(savedPoints));
            }

            this.equippedStore.setState(newState, 'all');
            return true;
        } catch (error) {
            console.error('Errore nel caricamento dello stato:', error);
            return false;
        }
    }
}
