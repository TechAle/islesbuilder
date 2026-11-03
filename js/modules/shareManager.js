import { equippedStore } from '../store/equippedStore.js';
import { dataStore } from '../store/dataStore.js';
import { CLASS_KEYS, getItemCategoryForSlot } from '../store/constants.js';

/** @typedef {import('../store/constants.js').ClassKey} ClassKey */
/** @typedef {import('../store/constants.js').EquipSlotData} EquipSlotData */

/**
 * @typedef {Object} SerializedState
 * @property {Record<string, EquipSlotData>} equip
 * @property {Array<{id: string, val: number}>} elixirs
 * @property {Record<ClassKey, Array<[string, number]>>} treeLevels
 * @property {ClassKey} currentClass
 * @property {number} sharedPoints
 */

export class ShareManager {
    constructor() {
        this.bindEvents();
    }

    /** Collega gli eventi di condivisione della build. */
    bindEvents() {
        document.getElementById('btn-share-build')?.addEventListener('click', () => this.generateShareLink());
        document.getElementById('btn-paste-build')?.addEventListener('click', () => this.pasteBuildLink());
    }

    /** Genera un link condivisibile con lo stato corrente e lo copia negli appunti. */
    generateShareLink() {
        /** @type {Record<ClassKey, Array<[string, number]>>} */
        const treeLevels = /** @type {Record<ClassKey, Array<[string, number]>>} */ ({});
        CLASS_KEYS.forEach(classKey => {
            treeLevels[classKey] = Array.from(equippedStore.state.treeLevels[classKey].entries());
        });

        /** @type {SerializedState} */
        const state = {
            equip: equippedStore.state.activeEquip,
            elixirs: equippedStore.state.elixirs.map(e => ({ id: e.id, val: e.val })),
            treeLevels,
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

    /** Chiede un link/codice all'utente e prova a caricarlo. */
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

    /** Carica la build codificata nell'hash dell'URL, se presente. */
    loadStateFromUrl() {
        if (!window.location.hash) return;
        try {
            const hash = window.location.hash.substring(1);
            const jsonString = decodeURIComponent(atob(hash));
            /** @type {SerializedState} */
            const state = JSON.parse(jsonString);

            /** @type {Partial<import('../store/constants.js').BuildState>} */
            const newState = {};

            if (state.equip) {
                const reconstructedEquip = structuredClone(state.equip);

                Object.keys(reconstructedEquip).forEach(slot => {
                    const item = reconstructedEquip[slot];
                    if (!item || !item.name) return;

                    // Cerca l'oggetto corrispondente nel database globale
                    // (ring1 e ring2 usano la categoria "ring")
                    const dataCategory = getItemCategoryForSlot(slot);
                    const dbItems = dataStore.data.items[dataCategory] || [];
                    const matchedPreset = dbItems.find(i => i.name.toLowerCase() === item.name.toLowerCase());

                    if (matchedPreset) {
                        // Unisce le statistiche: se l'oggetto salvato non ha una stat che il preset ha, la aggiunge
                        item.stats = {
                            ...matchedPreset.stats,
                            ...item.stats // Le stats salvate mantengono la precedenza se l'utente le aveva personalizzate
                        };
                    }
                });

                newState.activeEquip = reconstructedEquip;
            }

            if (state.elixirs) {
                newState.elixirs = equippedStore.state.elixirs.map(e => {
                    const match = state.elixirs.find(s => s.id === e.id);
                    return match ? { ...e, val: match.val } : e;
                });
            }

            if (state.treeLevels) {
                /** @type {Record<ClassKey, Map<string, number>>} */
                const treeLevels = /** @type {Record<ClassKey, Map<string, number>>} */ ({});
                CLASS_KEYS.forEach(classKey => {
                    const savedLevels = state.treeLevels[classKey];
                    treeLevels[classKey] = savedLevels
                        ? new Map(savedLevels)
                        : equippedStore.state.treeLevels[classKey];
                });
                newState.treeLevels = treeLevels;
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