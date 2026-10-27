import { INITIAL_ELIXIRS, CLASS_SKILL_TREES } from './constants.js';

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
            currentClass: 'archer',
            activeEquip: {
                weapon:     { name: '', stats: {}, augments: ['', '', ''] },
                glove:      { name: '', stats: {}, augments: ['', '', ''] },
                helmet:     { name: '', stats: {}, augments: ['', '', ''] },
                amulet:     { name: '', stats: {}, augments: ['', '', ''] },
                chestplate: { name: '', stats: {}, augments: ['', '', ''] },
                ring1:      { name: '', stats: {}, augments: ['', '', ''] },
                leggings:   { name: '', stats: {}, augments: ['', '', ''] },
                boots:      { name: '', stats: {}, augments: ['', '', ''] },
                feet:       { name: '', stats: {}, augments: ['', '', ''] },
                core:       { name: '', stats: {}, augments: ['', '', ''] },
                pets:       { name: '', stats: {}, augments: ['', '', ''] }
            },
            elixirs: JSON.parse(JSON.stringify(INITIAL_ELIXIRS)),
            treeLevels: {
                warrior: new Map(Object.keys(CLASS_SKILL_TREES.warrior.nodes).map(id => [id, 0])),
                archer:  new Map(Object.keys(CLASS_SKILL_TREES.archer.nodes).map(id => [id, 0])),
                mage:    new Map(Object.keys(CLASS_SKILL_TREES.mage.nodes).map(id => [id, 0]))
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
}

export const store = new BuildStore();