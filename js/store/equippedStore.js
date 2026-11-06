import { ObservableStore } from './observableStore.js';
import {
    AUGMENT_SLOTS_PER_ITEM,
    CLASS_KEYS,
    DEFAULT_CLASS,
    DEFAULT_SHARED_POINTS,
    EQUIP_SLOTS
} from '../data/constants.js';

/** @typedef {import('../data/types.js').BuildState} BuildState */
/** @typedef {import('../data/types.js').ClassKey} ClassKey */
/** @typedef {import('../data/types.js').Elixir} Elixir */
/** @typedef {import('../data/types.js').EquipSlot} EquipSlot */
/** @typedef {import('../data/types.js').EquipSlotData} EquipSlotData */
/** @typedef {import('../data/types.js').SkillTreeClass} SkillTreeClass */

/**
 * Crea un nuovo slot equipaggiamento vuoto.
 * @returns {EquipSlotData}
 */
function createEmptyEquipSlot() {
    return {
        name: '',
        stats: {},
        augments: Array(AUGMENT_SLOTS_PER_ITEM).fill(''),
        upgradeLevel: 0
    };
}

/**
 * Store dello stato della build (equip, elisir, talenti, punti).
 * Emette eventi distinti: `equip`, `elixirs`, `skills`, `class`, `all`.
 */
export class BuildStore extends ObservableStore {
    /**
     * @param {Object} options
     * @param {Record<ClassKey, SkillTreeClass>} options.skillTrees
     * @param {Elixir[]} options.elixirsConfig
     */
    constructor({ skillTrees, elixirsConfig }) {
        super();
        /** @type {Record<ClassKey, SkillTreeClass>} */
        this.skillTrees = skillTrees;
        /** @type {Elixir[]} */
        this.initialElixirs = elixirsConfig;
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
                Object.keys(this.skillTrees[classKey].nodes).map(id => [id, 0])
            );
        });

        /** @type {BuildState} */
        this.state = {
            sharedPoints: DEFAULT_SHARED_POINTS,
            currentClass: DEFAULT_CLASS,
            activeEquip,
            elixirs: structuredClone(this.initialElixirs),
            treeLevels
        };
    }

    /**
     * Applica una mutazione atomica allo stato e notifica l'evento indicato.
     * @param {(state: BuildState) => void} mutator
     * @param {string} event
     */
    update(mutator, event) {
        mutator(this.state);
        this.notify(event);
    }

    /**
     * Sostituisce parzialmente lo stato e notifica un evento.
     * @param {Partial<BuildState>} newState
     * @param {string} [event='all']
     */
    setState(newState, event = 'all') {
        Object.assign(this.state, newState);
        this.notify(event);
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
        }, 'equip');
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
        }, 'equip');
    }

    /**
     * Aggiorna il livello di upgrade di uno slot equipaggiato.
     * @param {EquipSlot} slot
     * @param {number} value
     */
    setUpgradeLevel(slot, value) {
        this.update(state => {
            const slotData = state.activeEquip[slot];
            if (!slotData) return;
            slotData.upgradeLevel = value;
        }, 'equip');
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
        }, 'elixirs');
    }

    /**
     * Imposta il livello di tutti gli elisir con una sola notifica.
     * @param {number} value
     */
    setAllElixirValues(value) {
        this.update(state => {
            state.elixirs.forEach(elixir => {
                elixir.val = value;
            });
        }, 'elixirs');
    }

    /**
     * Sincronizza le definizioni degli elisir dal catalogo, preservando i
     * livelli già scelti dall'utente per id.
     * @param {Elixir[]} config
     */
    syncElixirs(config) {
        this.update(state => {
            const selectedById = new Map(state.elixirs.map(elixir => [elixir.id, elixir]));
            state.elixirs = config.map(elixir => {
                const selected = selectedById.get(elixir.id);
                return {
                    ...structuredClone(elixir),
                    val: selected ? selected.val : elixir.val
                };
            });
        }, 'elixirs');
    }

    /**
     * Cambia la classe attiva.
     * @param {ClassKey} className
     */
    setCurrentClass(className) {
        if (!CLASS_KEYS.includes(className)) return;
        this.update(state => {
            state.currentClass = className;
        }, 'class');
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
        }, 'skills');
    }
}
