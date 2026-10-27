import { store } from '../store.js';

/**
 * @typedef {Object} SerializedState
 * @property {Record<string, import('../store.js').EquipSlotData>} equip
 * @property {Array<{id: string, val: number}>} elixirs
 * @property {Record<'warrior'|'archer'|'mage', Array<[string, number]>>} treeLevels
 * @property {'warrior'|'archer'|'mage'} currentClass
 * @property {number} sharedPoints
 */

export class ShareManager {
    constructor() {
        this.bindEvents();
    }

    bindEvents() {
        document.getElementById('btn-share-build')?.addEventListener('click', () => this.generateShareLink());
        document.getElementById('btn-paste-build')?.addEventListener('click', () => this.pasteBuildLink());
    }

    generateShareLink() {
        /** @type {SerializedState} */
        const state = {
            equip: store.state.activeEquip,
            elixirs: store.state.elixirs.map(e => ({ id: e.id, val: e.val })),
            treeLevels: {
                warrior: Array.from(store.state.treeLevels.warrior.entries()),
                archer: Array.from(store.state.treeLevels.archer.entries()),
                mage: Array.from(store.state.treeLevels.mage.entries())
            },
            currentClass: store.state.currentClass,
            sharedPoints: store.state.sharedPoints
        };

        const jsonString = JSON.stringify(state);
        const encoded = btoa(encodeURIComponent(jsonString));
        const url = `${window.location.origin}${window.location.pathname}#${encoded}`;

        navigator.clipboard.writeText(url).then(() => {
            alert('Link di condivisione copiato negli appunti!');
        });
    }

    async pasteBuildLink() {
        let inputVal = prompt("Incolla qui il link della build oppure direttamente il codice hash (valore):");
        if (!inputVal) return;

        inputVal = inputVal.trim();
        let hashVal = inputVal.includes('#') ? inputVal.split('#')[1] : inputVal;

        if (!hashVal) {
            alert("Codice o link non valido.");
            return;
        }

        window.location.hash = hashVal;
        this.loadStateFromUrl();
    }

    loadStateFromUrl() {
        if (!window.location.hash) return;
        try {
            const hash = window.location.hash.substring(1);
            const jsonString = decodeURIComponent(atob(hash));
            /** @type {SerializedState} */
            const state = JSON.parse(jsonString);

            /** @type {Partial<import('../store.js').BuildState>} */
            const newState = {};

            if (state.equip) newState.activeEquip = state.equip;

            if (state.elixirs) {
                newState.elixirs = store.state.elixirs.map(e => {
                    const match = state.elixirs.find(s => s.id === e.id);
                    return match ? { ...e, val: match.val } : e;
                });
            }

            if (state.treeLevels) {
                newState.treeLevels = {
                    warrior: state.treeLevels.warrior ? new Map(state.treeLevels.warrior) : store.state.treeLevels.warrior,
                    archer: state.treeLevels.archer ? new Map(state.treeLevels.archer) : store.state.treeLevels.archer,
                    mage: state.treeLevels.mage ? new Map(state.treeLevels.mage) : store.state.treeLevels.mage
                };
            }

            if (state.currentClass) newState.currentClass = state.currentClass;
            if (typeof state.sharedPoints === 'number') newState.sharedPoints = state.sharedPoints;

            store.setState(newState);
        } catch (e) {
            console.error('Errore nel caricamento dello stato:', e);
            alert('Impossibile decodificare la build incollata. Assicurati che il codice o l\'URL sia corretto.');
        }
    }
}