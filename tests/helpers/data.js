import { DataStore } from '../../js/store/dataStore.js';
import { BuildStore } from '../../js/store/equippedStore.js';
import { ITEM_DATABASE } from '../../js/data/items.js';
import { AUGMENT_DATABASE } from '../../js/data/augments.js';
import { INITIAL_ELIXIRS } from '../../js/data/elixirs.js';
import { CLASS_SKILL_TREES } from '../../js/data/skillTrees.js';

/**
 * @param {Partial<ConstructorParameters<typeof DataStore>[0]>} [overrides]
 * @returns {DataStore}
 */
export function makeDataStore(overrides = {}) {
    return new DataStore({
        items: structuredClone(ITEM_DATABASE),
        augments: structuredClone(AUGMENT_DATABASE),
        elixirsConfig: structuredClone(INITIAL_ELIXIRS),
        skillTrees: structuredClone(CLASS_SKILL_TREES),
        ...overrides
    });
}

export function makeWorld() {
    const dataStore = makeDataStore();
    const equippedStore = new BuildStore({
        skillTrees: dataStore.data.skillTrees,
        elixirsConfig: dataStore.data.elixirsConfig
    });
    return { dataStore, equippedStore };
}
