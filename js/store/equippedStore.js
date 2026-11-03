import {
    AUGMENT_SLOTS_PER_ITEM,
    CLASS_KEYS,
    DEFAULT_CLASS,
    DEFAULT_SHARED_POINTS,
    EQUIP_SLOTS
} from './constants.js';
import { dataStore } from "./dataStore.js";

/** @typedef {import('./constants.js').BuildState} BuildState */
/** @typedef {import('./constants.js').ClassKey} ClassKey */
/** @typedef {import('./constants.js').EquipSlot} EquipSlot */
/** @typedef {import('./constants.js').EquipSlotData} EquipSlotData */

/**
 * @callback StoreSubscriber
 * @param {BuildState} state
 */

/**
 * Crea un nuovo slot equipaggiamento vuoto.
 * @returns {EquipSlotData}
 */
function createEmptyEquipSlot() {
    return {
        name: '',
        stats: {},
        augments: Array(AUGMENT_SLOTS_PER_ITEM).fill('')
    };
}

export class BuildStore {
    constructor() {
        /** @type {Set<StoreSubscriber>} */
        this.listeners = new Set();
        this.resetState();
    }

    /** Riporta lo store allo stato iniziale. */
    resetState() {
        /** @type {Record<EquipSlot, EquipSlotData>} */
        const activeEquip = /** @type {Record<EquipSlot, EquipSlotData>} */ ({});
        EQUIP_SLOTS.forEach(slot => {
            activeEquip[slot] = createEmptyEquipSlot();
        });

        /** @type {Record<ClassKey, Map<string, number>>} */
        const treeLevels = /** @type {Record<ClassKey, Map<string, number>>} */ ({});
        CLASS_KEYS.forEach(classKey => {
            treeLevels[classKey] = new Map(
                Object.keys(dataStore.data.skillTrees[classKey].nodes).map(id => [id, 0])
            );
        });

        /** @type {BuildState} */
        this.state = {
            sharedPoints: DEFAULT_SHARED_POINTS,
            // Used for the active skill tree
            currentClass: DEFAULT_CLASS,
            activeEquip,
            elixirs: structuredClone(dataStore.data.elixirsConfig),
            treeLevels
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

    /** Notifica tutti i subscriber con lo stato corrente. */
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
     * @param {EquipSlot} slot
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
     * @param {EquipSlot} slot
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
     * @param {ClassKey} className
     */
    setCurrentClass(className) {
        if (!CLASS_KEYS.includes(className)) return;
        this.update(state => {
            state.currentClass = className;
        });
    }

    /**
     * Sostituisce atomicamente l'intero albero dei livelli di una classe
     * e aggiorna i punti condivisi.
     * @param {ClassKey} className
     * @param {Map<string, number>} levels
     * @param {number} sharedPoints
     */
    applySkillLevels(className, levels, sharedPoints) {
        this.update(state => {
            if (!state.treeLevels[className]) return;
            state.treeLevels[className] = new Map(levels);
            state.sharedPoints = sharedPoints;
        });
    }
}

export const equippedStore = new BuildStore();
/** @type {any} */
window.equippedStore = equippedStore;