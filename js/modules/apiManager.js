import {
    API_URL,
    API_ITEM_ENDPOINTS,
    API_ELIXIRS_ENDPOINT,
    API_AUGMENTS_ENDPOINT,
    API_MAX_ATTEMPTS,
    API_REQUEST_TIMEOUT_MS,
    DEFAULT_ELIXIR_LEVEL,
    ELEMENT_CHAR_TO_NAME,
    SLOT_TO_ITEM_CATEGORY,
    WEAPON_SLOT_TO_WEAPON_TYPE
} from "../data/constants.js";
import { applyItemOverride } from "./itemOverrides.js";
import { registerAugments } from './augmentManager.js';
import { AUGMENT_DATABASE } from '../data/augments.js';

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

    /** Aggiorna in parallelo oggetti, elisir e augment dall'API. */
    async update() {
        await Promise.all([
            this.updateItems(),
            this.updateElixirs(),
            this.updateAugments()
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

        // 1. Statistiche standard dall'array stats dell'API.
        // Alcune armi (es. Giant Log) hanno due voci con lo stesso nome:
        // una flat e una percentuale. Se le assegnassimo direttamente alla
        // stessa chiave, la seconda sovrascriverebbe la prima. Teniamo quindi
        // la flat sulla chiave originale e la percentuale su `<stat>%`.
        if (gear.stats && Array.isArray(gear.stats)) {
            /** @type {Map<string, {flat: number[], percent: number[]}>} */
            const groupedStats = new Map();

            gear.stats.forEach(s => {
                if (!s?.stat) return;

                const entry = groupedStats.get(s.stat) ?? { flat: [], percent: [] };
                const value = Number(s.max) || 0;

                if (s.percent) entry.percent.push(value);
                else entry.flat.push(value);

                groupedStats.set(s.stat, entry);
            });

            groupedStats.forEach((entry, stat) => {
                const flat = entry.flat.reduce((sum, value) => sum + value, 0);
                const percent = entry.percent.reduce((sum, value) => sum + value, 0);

                if (entry.flat.length > 0) {
                    statsObj[stat] = flat;
                }
                if (entry.percent.length > 0) {
                    statsObj[entry.flat.length > 0 ? `${stat}%` : stat] = `${percent}%`;
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
            } else if (gear.normalAttack !== undefined && gear.normalAttack !== null) {
                statsObj["Normal Attack"] = gear.normalAttack;
            }
            if (gear.damageType !== undefined) statsObj["Damage Type"] = gear.damageType;
            if (gear.slot !== undefined && typeof gear.slot === 'string') {
                statsObj["Weapon Type"] = WEAPON_SLOT_TO_WEAPON_TYPE[gear.slot.toLowerCase()];
            }

            if (toolTip !== null && toolTip !== undefined && toolTip.length > 1) {
                const firstRow = toolTip[1]?.extra;
                if (Array.isArray(firstRow) && firstRow.length > 1) {
                    const elementalRow = firstRow[0]?.text;
                    if (typeof elementalRow === 'string' && elementalRow.length > 9) {
                        const element = ELEMENT_CHAR_TO_NAME[elementalRow[10]];
                        if (typeof element === 'string' && element) {
                            statsObj["element"] = element;
                        }
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
                if (!item) return;
                const rawSlot = item.gear?.slot;
                if (typeof rawSlot !== 'string' || !rawSlot) return;

                const normalizedSlot = rawSlot.toLowerCase();
                const targetCategory = SLOT_TO_ITEM_CATEGORY[normalizedSlot];

                if (!targetCategory) {
                    return;
                }

                const name = item.name || item.gear?.name;
                const gear = item.gear || {};

                if (Array.isArray(gear.abilities) && gear.abilities.length > 0) {
                    this.specialAbilityManager?.registerAbilities(
                        name,
                        gear.abilities,
                        { damageType: gear.damageType, slot: gear.slot }
                    );
                }

                // Chiamata alla funzione di appoggio per generare tutte le statistiche pulite
                const statsObj = this.formatGearStats(gear, targetCategory, item.tooltipJson, name);
                this.specialAbilityManager?.registerAbilitiesFromStats(name, statsObj);

                if (!itemsCopy[targetCategory]) {
                    itemsCopy[targetCategory] = [];
                }

                // L'API può restituire più voci con lo stesso nome: una
                // "template" con range e un'istanza concreta. Preferiamo
                // l'istanza concreta (quella con Normal Attack).
                const categoryItems = itemsCopy[targetCategory];
                const nameKey = String(name ?? '').trim().toLowerCase();
                const existingIndex = categoryItems.findIndex(existing => (
                    String(existing.name ?? '').trim().toLowerCase() === nameKey
                ));

                if (existingIndex >= 0) {
                    const existing = categoryItems[existingIndex];
                    const existingHasNormalAttack = typeof existing.stats?.['Normal Attack'] === 'number';
                    const hasNormalAttack = typeof statsObj['Normal Attack'] === 'number';

                    if (!existingHasNormalAttack && hasNormalAttack) {
                        categoryItems[existingIndex] = {
                            name: name,
                            stats: statsObj
                        };
                    }
                    return;
                }

                categoryItems.push({
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

    /** Recupera gli augment dall'API e popola il database runtime. */
    async updateAugments() {
        try {
            const rawAugments = await this.fetchJson(API_AUGMENTS_ENDPOINT);
            registerAugments(rawAugments);
            this.dataStore.updateData({ augments: [...AUGMENT_DATABASE] }, 'augments');
        } catch (error) {
            console.error("Errore durante il fetch degli augment:", error);
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
