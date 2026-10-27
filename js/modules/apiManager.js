import { APIurl } from "../store/constants.js";
import { dataStore } from "../store/dataStore.js";

export class ApiManager {
    constructor() {
        this.url = APIurl;
    }

    async update() {
        await this.updateItems();
    }

    /**
     * Funzione di appoggio per estrarre e formattare tutte le statistiche e proprietà dell'item
     * @param {Object} gear
     * @param {string} targetCategory
     * @returns {Record<string, any>}
     */
    formatGearStats(gear, targetCategory) {
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
            if (gear.normalAttack?.max !== undefined) statsObj["Normal Attack"] = gear.normalAttack.max;
            else if (gear.normalAttack !== undefined) statsObj["Normal Attack"] = gear.normalAttack;
            if (gear.damageType !== undefined) statsObj["Damage Type"] = gear.damageType;
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
            // 1. Le 4 chiamate in parallelo
            const endpoints = [
                "/items?category=weapons",
                "/items?category=armor",
                "/items?category=accessories"
            ];

            const promises = endpoints.map(async (endpoint) => {
                const res = await fetch(this.url + endpoint);
                if (!res.ok) throw new Error(`HTTP ${res.status} su ${endpoint}`);
                const json = await res.json();
                return json.data || json;
            });

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
                const statsObj = this.formatGearStats(gear, targetCategory);

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
}