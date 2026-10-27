import { APIurl } from "../store/constants.js";
import { dataStore } from "../store/dataStore.js";

export class ApiManager {
    constructor() {
        this.url = APIurl;
    }

    async update() {
        await this.updateItems();
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

            // 3. Dizionario di mappatura (chiave inminuscolo per sicurezza dall'API -> categoria dello store)
            // Gli slot non presenti qui (come backpack, pouch, quiver) verranno ignorati in automatico.
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
                "gloves": "glove", // Nota: singolare nel tuo store
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
                "blowpipe": "weapon",
                "greaves": "feet"
            };

            // Svuotiamo preventivamente solo le categorie che l'API va a toccare,
            // così eliminiamo i vecchi dati locali di quelle categorie senza toccare il resto (es. pets)
            const targetCategories = new Set(Object.values(slotMapping));
            targetCategories.forEach(category => {
                if (itemsCopy[category]) {
                    itemsCopy[category] = [];
                }
            });

            // 4. Smistamento e formattazione basati sul dizionario
            allFetchedItems.forEach(item => {
                const rawSlot = item.gear?.slot;
                const name = item.name || item.gear?.name;
                if (name === "Archer Class Core")
                    debugger
                if (!rawSlot) return;

                // Normalizziamo in minuscolo per confrontarlo col dizionario
                const normalizedSlot = rawSlot.toLowerCase();
                const targetCategory = slotMapping[normalizedSlot];

                // Se non è mappato nel dizionario (es. backpack, pouch, quiver), lo ignora
                if (!targetCategory) {
                    //console.log(normalizedSlot)
                    return;
                }

                const statsArray = item.gear?.stats || [];

                // Formattiamo le statistiche nel formato { StatName: valore }
                const statsObj = {};
                statsArray.forEach(s => {
                    statsObj[s.stat] = s.percent ? `${s.max}%` : s.max;
                });

                if (!itemsCopy[targetCategory]) {
                    itemsCopy[targetCategory] = [];
                }

                itemsCopy[targetCategory].push({
                    name: name,
                    stats: statsObj
                });
            });

            // 5. Aggiorniamo il dataStore e scateniamo la notify()
            dataStore.updateData({
                items: itemsCopy
            });

            console.log("Oggetti sincronizzati e smistati correttamente tramite dizionario!");

        } catch (error) {
            console.error("Errore durante il fetch delle categorie API:", error);
        }
    }
}