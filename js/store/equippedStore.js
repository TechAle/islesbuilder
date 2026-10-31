/**
 * @typedef {Object} EquipSlotData
 * @property {string} name
 * @property {import('./constants.js').ItemStats} stats
 * @property {string[]} augments
 */

/**
 * @typedef {Object} BuildState
 * @property {number} sharedPoints
 * @property {'warrior'|'archer'|'mage'} currentClass
 * @property {Record<string, EquipSlotData>} activeEquip
 * @property {import('./constants.js').Elixir[]} elixirs
 * @property {Record<'warrior'|'archer'|'mage', Map<string, number>>} treeLevels
 */

import {dataStore} from "./dataStore.js";

/**
 * @callback StoreSubscriber
 * @param {BuildState} state
 */

export class BuildStore {
    constructor() {
        /** @type {Set<StoreSubscriber>} */
        this.listeners = new Set();
        this.resetState();
    }

    resetState() {
        /** @type {BuildState} */
        this.state = {
            sharedPoints: 100,
            // Used for the active skill tree
            currentClass: 'archer',
            activeEquip: {
                weapon:     { name: '', stats: {}, augments: ['', '', ''] },
                glove:      { name: '', stats: {}, augments: ['', '', ''] },
                helmet:     { name: '', stats: {}, augments: ['', '', ''] },
                amulet:     { name: '', stats: {}, augments: ['', '', ''] },
                chestplate: { name: '', stats: {}, augments: ['', '', ''] },
                ring1:      { name: '', stats: {}, augments: ['', '', ''] },
                ring2:      { name: '', stats: {}, augments: ['', '', ''] },
                leggings:   { name: '', stats: {}, augments: ['', '', ''] },
                boots:      { name: '', stats: {}, augments: ['', '', ''] },
                feet:       { name: '', stats: {}, augments: ['', '', ''] },
                core:       { name: '', stats: {}, augments: ['', '', ''] },
                pets:       { name: '', stats: {}, augments: ['', '', ''] }
            },
            elixirs: JSON.parse(JSON.stringify(dataStore.data.elixirsConfig)),
            treeLevels: {
                warrior: new Map(Object.keys(dataStore.data.skillTrees.warrior.nodes).map(id => [id, 0])),
                archer:  new Map(Object.keys(dataStore.data.skillTrees.archer.nodes).map(id => [id, 0])),
                mage:    new Map(Object.keys(dataStore.data.skillTrees.mage.nodes).map(id => [id, 0]))
            }
        };
    }

    /**
     * Registra una funzione callback per ricevere notifiche di aggiornamento dello stato
     * @param {StoreSubscriber} callback
     * @returns {() => boolean} Funzione per rimuovere la sottoscrizione
     */
    subscribe(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    notify() {
        this.listeners.forEach(callback => callback(this.state));
    }

    /**
     * Aggiorna parzialmente lo stato e notifica i moduli sottoscritti
     * @param {Partial<BuildState>} newState
     */
    setState(newState) {
        Object.assign(this.state, newState);
        this.notify();
    }

    /**
     * Applica una mutazione atomica allo stato e notifica una sola volta.
     * Da preferire alle modifiche dirette di `equippedStore.state`.
     * @param {(state: BuildState) => void} mutator
     */
    update(mutator) {
        mutator(this.state);
        this.notify();
    }

    /**
     * Aggiorna i dati di uno slot equipaggiato.
     * @param {string} slot
     * @param {Partial<EquipSlotData>} patch
     */
    setEquipSlot(slot, patch) {
        this.update(state => {
            const slotData = state.activeEquip[slot];
            if (!slotData) return;
            Object.assign(slotData, patch);
        });
    }

    /**
     * Aggiorna un augment di uno slot equipaggiato.
     * @param {string} slot
     * @param {number} index
     * @param {string} value
     */
    setAugment(slot, index, value) {
        this.update(state => {
            const augments = state.activeEquip[slot]?.augments;
            if (!augments || index < 0 || index >= augments.length) return;
            augments[index] = value;
        });
    }

    /**
     * Aggiorna il livello di un elisir.
     * @param {number} index
     * @param {number} value
     */
    setElixirValue(index, value) {
        this.update(state => {
            const elixir = state.elixirs[index];
            if (!elixir) return;
            elixir.val = value;
        });
    }

    /**
     * Cambia la classe attiva.
     * @param {'warrior'|'archer'|'mage'} className
     */
    setCurrentClass(className) {
        if (!['warrior', 'archer', 'mage'].includes(className)) return;
        this.update(state => {
            state.currentClass = className;
        });
    }

    /**
     * Aggiorna atomicamente livello di un nodo abilità e punti condivisi.
     * @param {'warrior'|'archer'|'mage'} className
     * @param {string} nodeId
     * @param {number} level
     * @param {number} sharedPoints
     */
    applySkillChange(className, nodeId, level, sharedPoints) {
        this.update(state => {
            const levels = state.treeLevels[className];
            if (!levels) return;
            levels.set(nodeId, level);
            state.sharedPoints = sharedPoints;
        });
    }
}

export const equippedStore = new BuildStore();
window.equippedStore = equippedStore;