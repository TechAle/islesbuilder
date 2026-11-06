import {
    API_URL,
    API_ITEM_ENDPOINTS,
    API_ELIXIRS_ENDPOINT,
    API_MAX_ATTEMPTS,
    API_REQUEST_TIMEOUT_MS,
    DEFAULT_ELIXIR_LEVEL,
    ELEMENT_CHAR_TO_NAME,
    SLOT_TO_ITEM_CATEGORY,
    WEAPON_SLOT_TO_WEAPON_TYPE
} from "../data/constants.js";
import { applyItemOverride } from "./itemOverrides.js";

/** @typedef {import('../data/types.js').ItemStats} ItemStats */

/**
 * @typedef {Object} ApiGearStat
 * @property {string} stat
 * @property {number} max
 * @property {boolean} [percent]
 */

/**
 * @typedef {Object} ApiGear
 * @property {string} [name]
 * @property {ApiGearStat[]} [stats]
 * @property {number} [attackEnergy]
 * @property {string|number} [defaultAttack]
 * @property {{max?: number}|number} [normalAttack]
 * @property {string} [damageType]
 * @property {string} [slot]
 * @property {number} [augmentSlots]
 * @property {number} [level]
 * @property {Array<string|{name?: string, title?: string}>} [abilities]
 */

/**
 * Tooltip JSON grezzo restituito dall'API.
 * @typedef {Array<any>} ApiTooltip
 */

/**
 * @typedef {Object} ApiElixirLevel
 * @property {string} stat
 * @property {number} perLevel
 * @property {boolean} [percent]
 */

/**
 * @typedef {Object} ApiElixir
 * @property {string} [id]
 * @property {string} [name]
 * @property {ApiElixirLevel[]} [perLevel]
 */

/**
 * Adapter API: scarica e normalizza il catalogo, poi aggiorna il DataStore.
 */
export class ApiManager {
    /**
     * @param {Object} options
     * @param {import('../store/dataStore.js').DataStore} options.dataStore
     * @param {import('./specialAbilityManager.js').SpecialAbilityManager} [options.specialAbilityManager]
     */
    constructor({ dataStore, specialAbilityManager }) {
        /** @type {string} */
        this.url = API_URL;
        this.dataStore = dataStore;
        this.specialAbilityManager = specialAbilityManager;
    }

    /** Aggiorna in parallelo oggetti ed elisir dall'API. */
    async update() {
        await Promise.all([
            this.updateItems(),
            this.updateElixirs()
        ]);
    }

    /**
     * Esegue una GET verso l'API con timeout e un tentativo di retry.
     * @param {string} endpoint
     * @returns {Promise<any>}
     */
    async fetchJson(endpoint) {
        let lastError;

        for (let attempt = 0; attempt < API_MAX_ATTEMPTS; attempt++) {
            try {
                const signal = typeof AbortSignal !== 'undefined' && AbortSignal.timeout
                    ? AbortSignal.timeout(API_REQUEST_TIMEOUT_MS)
                    : undefined;
                const res = await fetch(this.url + endpoint, { signal });
                if (!res.ok) throw new Error(`HTTP ${res.status} su ${endpoint}`);
                const json = await res.json();
                return json.data || json;
            } catch (error) {
                lastError = error;
            }
        }

        throw lastError;
    }

    /**
     * Estrae e formatta tutte le statistiche e proprietà dell'item.
     * @param {ApiGear} gear
     * @param {string} targetCategory
     * @param {ApiTooltip|null|undefined} toolTip
     * @param {string} [name] - Nome dell'oggetto, usato per gli override manuali
     * @returns {ItemStats}
     */
    formatGearStats(gear, targetCategory, toolTip, name = '') {
        /** @type {ItemStats} */
        const statsObj = {};

        // 1. Statistiche standard dall'array stats dell'API
        if (gear.stats && Array.isArray(gear.stats)) {
            gear.stats.forEach(s => {
                if (s.stat) {
                    statsObj[s.stat] = s.percent ? `${s.max}%` : s.max;
                }
            });
        }

        // 2. Proprietà specifiche se è un'arma
        if (targetCategory === "weapon") {
            if (gear.attackEnergy !== undefined) statsObj["Attack Energy"] = gear.attackEnergy;
            if (gear.defaultAttack !== undefined) statsObj["Default Attack"] = gear.defaultAttack;
            if (typeof gear.normalAttack === 'object' && gear.normalAttack !== null) {
                if (gear.normalAttack.max !== undefined) {
                    statsObj["Normal Attack"] = gear.normalAttack.max;
                }
            } else if (gear.normalAttack !== undefined) {
                statsObj["Normal Attack"] = gear.normalAttack;
            }
            if (gear.damageType !== undefined) statsObj["Damage Type"] = gear.damageType;
            if (gear.slot !== undefined) {
                statsObj["Weapon Type"] = WEAPON_SLOT_TO_WEAPON_TYPE[gear.slot.toLowerCase()];
            }

            if (toolTip !== null && toolTip !== undefined && toolTip.length > 1) {
                const firstRow = toolTip[1].extra;
                if (firstRow.length > 1) {
                    const elementalRow = firstRow[0].text;
                    if (elementalRow.length > 9) {
                        statsObj["element"] = ELEMENT_CHAR_TO_NAME[elementalRow[10]];
                    }
                }
            }
        }

        // 3. Slot per gli augment (se presenti)
        if (gear.augmentSlots !== undefined) {
            statsObj["Augment Slots"] = gear.augmentSlots;
        }

        // 4. Livello dell'oggetto (level)
        if (gear.level !== undefined) {
            statsObj["Level"] = gear.level;
        }

        // 5. Abilità (array di oggetti o stringhe -> estraiamo il nome)
        if (gear.abilities && Array.isArray(gear.abilities)) {
            gear.abilities.forEach((ability, index) => {
                const abilityName = typeof ability === 'object' && ability !== null
                    ? (ability.name || ability.title || '')
                    : ability;

                if (abilityName) {
                    statsObj[`Ability ${index + 1}`] = abilityName;
                }
            });
        }

        // 6. Override manuali: i valori presenti in ITEM_OVERRIDES hanno la
        // precedenza su quelli dell'API (es. Tempest -> element thunder).
        return applyItemOverride(name, statsObj);
    }

    /** Recupera e normalizza gli oggetti dall'API. */
    async updateItems() {
        try {
            // 1. Le 3 chiamate in parallelo
            const promises = API_ITEM_ENDPOINTS.map(endpoint => this.fetchJson(endpoint));

            const results = await Promise.all(promises);
            const allFetchedItems = results.flat();

            // 2. Cloniamo la struttura attuale con structuredClone
            const itemsCopy = structuredClone(this.dataStore.data.items);

            // 3. Svuotiamo preventivamente solo le categorie coinvolte
            const targetCategories = new Set(Object.values(SLOT_TO_ITEM_CATEGORY));
            targetCategories.forEach(category => {
                if (itemsCopy[category]) {
                    itemsCopy[category] = [];
                }
            });

            // Le abilità speciali vengono ricostruite a ogni sincronizzazione.
            this.specialAbilityManager?.reset();

            // 4. Smistamento e formattazione
            allFetchedItems.forEach(item => {
                const rawSlot = item.gear?.slot;
                if (!rawSlot) return;

                const normalizedSlot = rawSlot.toLowerCase();
                const targetCategory = SLOT_TO_ITEM_CATEGORY[normalizedSlot];

                if (!targetCategory) {
                    return;
                }

                const name = item.name || item.gear?.name;
                const gear = item.gear || {};

                if (Array.isArray(gear.abilities) && gear.abilities.length > 0) {
                    this.specialAbilityManager?.registerAbilities(name, gear.abilities);
                }

                // Chiamata alla funzione di appoggio per generare tutte le statistiche pulite
                const statsObj = this.formatGearStats(gear, targetCategory, item.tooltipJson, name);

                if (!itemsCopy[targetCategory]) {
                    itemsCopy[targetCategory] = [];
                }

                itemsCopy[targetCategory].push({
                    name: name,
                    stats: statsObj
                });
            });

            // 5. Aggiornamento dello store e notifica automatica
            this.dataStore.updateData({ items: itemsCopy }, 'items');

            console.log("Oggetti, armi, abilità e statistiche sincronizzati con successo!");

        } catch (error) {
            console.error("Errore durante il fetch delle categorie API:", error);
        }
    }

    /** Recupera e normalizza gli elisir dall'API. */
    async updateElixirs() {
        try {
            /** @type {ApiElixir[]} */
            const rawElixirs = await this.fetchJson(API_ELIXIRS_ENDPOINT);

            // Mappiamo i dati separando il valore numerico dal flag percentuale
            const mappedElixirs = rawElixirs.map(elixir => {
                const name = elixir.name || "";
                /** @type {ApiElixirLevel} */
                const firstLevelData = elixir.perLevel?.[0] ?? { stat: "", perLevel: 0 };

                const stat = firstLevelData.stat || "";
                const perLevelValue = firstLevelData.perLevel ?? 0;
                const isPercent = firstLevelData.percent === true;

                return {
                    id: elixir.id || name,
                    name: name,
                    stat: stat,
                    val: DEFAULT_ELIXIR_LEVEL,
                    perLevel: perLevelValue,
                    percent: isPercent
                };
            });

            this.dataStore.updateData({ elixirsConfig: mappedElixirs }, 'elixirs');

            console.log("Elisir sincronizzati con distinzione percentuale!");

        } catch (error) {
            console.error("Errore durante il fetch degli elisir:", error);
        }
    }
}
