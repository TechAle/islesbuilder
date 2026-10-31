import { APIurl } from "../store/constants.js";
import { dataStore } from "../store/dataStore.js";
import {equippedStore} from "../store/equippedStore.js";

export class ApiManager {
    constructor() {
        this.url = APIurl;
    }

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
        const attempts = 2;
        let lastError;

        for (let attempt = 0; attempt < attempts; attempt++) {
            try {
                const signal = typeof AbortSignal !== 'undefined' && AbortSignal.timeout
                    ? AbortSignal.timeout(10000)
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
     * Funzione di appoggio per estrarre e formattare tutte le statistiche e proprietà dell'item
     * @param {Object} gear
     * @param {string} targetCategory
     * @param {Object} toolTip
     * @returns {Record<string, any>}
     */
    formatGearStats(gear, targetCategory, toolTip) {
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
            const slotMapping = {
                "axe": "melee",
                "bow": "ranged",
                "crossbow": "ranged",
                "crux": "magic",
                "dagger": "melee",
                "focus": "magic",
                "gauntlet": "melee",
                "gloves": "melee",
                "greatbow": "ranged",
                "hammer": "melee",
                "handcannon": "ranged",
                "kunai": "ranged",
                "mace": "melee",
                "pot": "ranged",
                "spear": "melee",
                "staff": "magic",
                "sword": "melee",
                "tome": "magic",
                "wand": "magic",
                "blowpipe": "magic"
            };
            const charToElement = {
                "": "nature",
                "": "void",
                "": "thunder",
                "": "radiant"
            }

            if (gear.attackEnergy !== undefined) statsObj["Attack Energy"] = gear.attackEnergy;
            if (gear.defaultAttack !== undefined) statsObj["Default Attack"] = gear.defaultAttack;
            if (gear.normalAttack?.max !== undefined) statsObj["Normal Attack"] = gear.normalAttack.max;
            else if (gear.normalAttack !== undefined) statsObj["Normal Attack"] = gear.normalAttack;
            if (gear.damageType !== undefined) statsObj["Damage Type"] = gear.damageType;
            if (gear.slot !== undefined) statsObj["Weapon Type"] = slotMapping[gear.slot.toLowerCase()];


            if (toolTip !== null && toolTip.length > 1) {
                let firstRow = toolTip[1].extra
                if (firstRow.length > 1) {
                    let elementalRow = firstRow[0].text
                    if (elementalRow.length > 9) {
                        statsObj["element"] = charToElement[elementalRow[10]];
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

        return statsObj;
    }

    async updateItems() {
        try {
            // 1. Le 3 chiamate in parallelo
            const endpoints = [
                "/items?category=weapons",
                "/items?category=armor",
                "/items?category=accessories"
            ];

            const promises = endpoints.map(endpoint => this.fetchJson(endpoint));

            const results = await Promise.all(promises);
            const allFetchedItems = results.flat();

            // 2. Cloniamo la struttura attuale con structuredClone
            const itemsCopy = structuredClone(dataStore.data.items);

            // 3. Dizionario di mappatura degli slot
            const slotMapping = {
                "amulet": "amulet",
                "axe": "weapon",
                "boots": "boots",
                "bow": "weapon",
                "chestplate": "chestplate",
                "crossbow": "weapon",
                "crux": "weapon",
                "dagger": "weapon",
                "focus": "weapon",
                "gauntlet": "weapon",
                "gloves": "glove",
                "greatbow": "weapon",
                "hammer": "weapon",
                "handcannon": "weapon",
                "helmet": "helmet",
                "kunai": "weapon",
                "leggings": "leggings",
                "mace": "weapon",
                "pot": "weapon",
                "ring": "ring",
                "spear": "weapon",
                "staff": "weapon",
                "sword": "weapon",
                "tome": "weapon",
                "wand": "weapon",
                "greaves": "feet",
                "blowpipe": "weapon"
            };

            // Svuotiamo preventivamente solo le categorie coinvolte
            const targetCategories = new Set(Object.values(slotMapping));
            targetCategories.forEach(category => {
                if (itemsCopy[category]) {
                    itemsCopy[category] = [];
                }
            });

            // 4. Smistamento e formattazione
            allFetchedItems.forEach(item => {
                const rawSlot = item.gear?.slot;
                if (!rawSlot) return;

                const normalizedSlot = rawSlot.toLowerCase();
                const targetCategory = slotMapping[normalizedSlot];

                if (!targetCategory) {
                    //console.log(normalizedSlot)
                    return
                }

                const name = item.name || item.gear?.name;
                const gear = item.gear || {};

                // Chiamata alla funzione di appoggio per generare tutte le statistiche pulite
                const statsObj = this.formatGearStats(gear, targetCategory, item.tooltipJson);

                if (!itemsCopy[targetCategory]) {
                    itemsCopy[targetCategory] = [];
                }

                itemsCopy[targetCategory].push({
                    name: name,
                    stats: statsObj
                });
            });

            // 5. Aggiornamento dello store e notifica automatica
            dataStore.updateData({
                items: itemsCopy
            });

            console.log("Oggetti, armi, abilità e statistiche sincronizzati con successo!");

        } catch (error) {
            console.error("Errore durante il fetch delle categorie API:", error);
        }
    }

    async updateElixirs() {
        try {
            const rawElixirs = await this.fetchJson("/elixirs");

            // Mappiamo i dati separando il valore numerico dal flag percentuale
            const mappedElixirs = rawElixirs.map(elixir => {
                const name = elixir.name || "";
                const firstLevelData = elixir.perLevel?.[0] || {};

                const stat = firstLevelData.stat || "";
                const perLevelValue = firstLevelData.perLevel ?? 0;
                const isPercent = firstLevelData.percent === true;

                return {
                    id: elixir.id || name,
                    name: name,
                    stat: stat,
                    val: 5,
                    perLevel: perLevelValue, // Rimane un numero (es. 5)
                    percent: isPercent       // True se è percentuale, false se è un valore piatto
                };
            });

            // Aggiorniamo entrambi gli store
            dataStore.updateData({
                elixirsConfig: mappedElixirs
            });

            equippedStore.setState({
                elixirs: structuredClone(mappedElixirs)
            });

            console.log("Elisir sincronizzati con distinzione percentuale!");

        } catch (error) {
            console.error("Errore durante il fetch degli elisir:", error);
        }
    }
}