import { equippedStore } from '../store/equippedStore.js';
import { AUGMENT_DATABASE } from '../store/constants.js';

export class StatsManager {
    constructor() {
        this.container = document.getElementById('detailed-stats-container');
        /** @type {Record<string, number>} */
        this.statsValues = {}
        /** @type {Record<string, Record<string, number>>} */
        this.skillValues = {
            "warrior": {},
            "archer": {},
            "mage": {}
        }
    }

    /** Ricalcola i valori aggregati di tutte le statistiche */
    recalculate() {
        this.statsValues = {}
        this.skillValues = {
            "warrior": {},
            "archer": {},
            "mage": {}
        }
        const { activeEquip, elixirs } = equippedStore.state;

        Object.values(activeEquip).forEach(item => {
            if (!item.stats) return;

            Object.entries(item.stats).forEach(([stat, val]) => {
                if (stat.includes("Ability") || stat.includes("Augment") || stat.includes("Level") || stat.includes("Damage Type"))
                    return;
                let numericVal = 0;
                let isPercent = false;

                if (typeof val === 'number') {
                    numericVal = val;
                } else if (typeof val === 'string') {
                    if (val.includes('%')) {
                        numericVal = parseFloat(val.replace('%', '').replace(',', '.'));
                        isPercent = true;
                    } else {
                        numericVal = parseFloat(val.replace(',', '.')) || 0;
                    }
                }
                if (!isNaN(numericVal)) {
                    const statKey = (isPercent && !stat.endsWith('%')) ? stat + "%" : stat;
                    this.statsValues[statKey] = (this.statsValues[statKey] || 0) + numericVal;
                }
            });
        });

        elixirs.forEach(el => {
            if (el.val > 0) {
                const bonus = el.val * el.perLevel;
                const statKey = el.percent ? el.stat + "%" : el.stat;

                this.statsValues[statKey] = (this.statsValues[statKey] || 0) + bonus;
            }
        });

        // 1. Recupera i nodi e i livelli della classe corrente
        for(const classCheck of ["warrior", "mage", "archer"]) {
            const currentNodes = dataStore.data.skillTrees[classCheck].nodes;
            const currentLevels = equippedStore.state.treeLevels[classCheck];

            Object.keys(currentNodes).forEach(id => {
                const node = currentNodes[id];
                const curLvl = currentLevels.get(id) || 0;

                // Se il nodo ha punti investiti ed ha una statKey definita
                if (curLvl > 0 && node.statKey) {
                    let numericVal = 0;
                    let rawStat = node.statKey;
                    let isDirect = node.isDirect

                    if (!isDirect) {
                        rawStat = rawStat.replace("{level}", curLvl);
                    }

                    const isNegative = rawStat.trim().startsWith('-');
                    const [numberCheck, ...nameParts] = rawStat.split(" ");
                    const name = nameParts.join(" ");

                    let finalStatKey = "";

// Controlliamo se esiste il parametro corrispondente a 'name'
                    const paramData = node.parameters && node.parameters[name];

                    if (node.parameters && paramData) {
                        // --- CASO 1: Il parametro esiste ---
                        const calculatedVal = paramData.base + (paramData.increase * (curLvl - 1));
                        numericVal = isNegative ? -Math.abs(calculatedVal) : calculatedVal;

                        // Rimpiazza il segnaposto con il valore calcolato
                        rawStat = rawStat.replace(new RegExp(`\\{${name}\\}`, 'g'), calculatedVal);

                        // Pulizia standard di rawStat
                        rawStat = rawStat.replace(/^-?\d+([.,]\d+)?\s*/, '');
                        let isPercent = rawStat.includes('%');
                        if (isPercent) rawStat = rawStat.replace('%', '');

                        finalStatKey = isPercent ? rawStat.trim() + "%" : rawStat.trim();

                    } else {
                        // --- CASO 2: Il parametro è null / non esiste (Fallback) ---
                        // Estraiamo il valore numerico da numberCheck (es. "-3%" -> -3)
                        const cleanNumStr = numberCheck.replace(/[^0-9.,-]/g, '').replace(',', '.');
                        numericVal = parseFloat(cleanNumStr) || 0;

                        // finalStatKey diventa 'name' (pulito da eventuali percentuali)
                        let cleanName = name;
                        let isPercent = cleanName.includes('%');
                        if (isPercent) cleanName = cleanName.replace('%', '');

                        finalStatKey = isPercent ? cleanName.trim() + "%" : cleanName.trim();
                    }

// Salvataggio del valore calcolato
                    if (!isNaN(numericVal) && numericVal !== 0) {
                        if (isDirect)
                            this.statsValues[finalStatKey] = (this.statsValues[finalStatKey] || 0) + numericVal;
                        else
                            this.skillValues[classCheck][finalStatKey] = numericVal;
                    }
                }
            });

        }
        this.render(this.statsValues);
    }

    /**
     * Renderizza l'output HTML nell'interfaccia
     */
    render() {
        if (!this.container) return;
        this.container.innerHTML = '';
        console.log("this.statsValues:", this.statsValues);

        if (Object.keys(this.statsValues).length === 0) {
            this.container.innerHTML = '<div style="font-size:12px; color:var(--text-muted);">Nessuna statistica applicata</div>';
            return;
        }

        Object.entries(this.statsValues).forEach(([stat, val]) => {
            const row = document.createElement('div');
            row.className = 'stat-row';

            // Controlliamo direttamente se la chiave termina con '%' o include parole chiave
            const isPercent = stat.endsWith('%') || stat.toLowerCase().includes('crit') || stat.toLowerCase().includes('chance');
            let displayVal = isPercent ? `${val.toFixed(2)}%` : `${val.toFixed(2)}`;
            if (val > 0) displayVal = '+' + displayVal

            row.innerHTML = `<span class="stat-label">${stat}:</span><span class="stat-val">${displayVal}</span>`;
            this.container.appendChild(row);
        });
    }
}

export const statsMgr = new StatsManager();
window.statsMgr = statsMgr;