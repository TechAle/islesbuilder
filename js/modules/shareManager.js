import { equippedStore } from '../store/equippedStore.js';

/**
 * @typedef {Object} SerializedState
 * @property {Record<string, import('../store/equippedStore.js').EquipSlotData>} equip
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
            equip: equippedStore.state.activeEquip,
            elixirs: equippedStore.state.elixirs.map(e => ({ id: e.id, val: e.val })),
            treeLevels: {
                warrior: Array.from(equippedStore.state.treeLevels.warrior.entries()),
                archer: Array.from(equippedStore.state.treeLevels.archer.entries()),
                mage: Array.from(equippedStore.state.treeLevels.mage.entries())
            },
            currentClass: equippedStore.state.currentClass,
            sharedPoints: equippedStore.state.sharedPoints
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

            /** @type {Partial<import('../store/equippedStore.js').BuildState>} */
            const newState = {};

            if (state.equip) newState.activeEquip = state.equip;

            if (state.elixirs) {
                newState.elixirs = equippedStore.state.elixirs.map(e => {
                    const match = state.elixirs.find(s => s.id === e.id);
                    return match ? { ...e, val: match.val } : e;
                });
            }

            if (state.treeLevels) {
                newState.treeLevels = {
                    warrior: state.treeLevels.warrior ? new Map(state.treeLevels.warrior) : equippedStore.state.treeLevels.warrior,
                    archer: state.treeLevels.archer ? new Map(state.treeLevels.archer) : equippedStore.state.treeLevels.archer,
                    mage: state.treeLevels.mage ? new Map(state.treeLevels.mage) : equippedStore.state.treeLevels.mage
                };
            }

            if (state.currentClass) newState.currentClass = state.currentClass;
            if (typeof state.sharedPoints === 'number') newState.sharedPoints = state.sharedPoints;

            equippedStore.setState(newState);
        } catch (e) {
            console.error('Errore nel caricamento dello stato:', e);
            alert('Impossibile decodificare la build incollata. Assicurati che il codice o l\'URL sia corretto.');
        }
    }
}