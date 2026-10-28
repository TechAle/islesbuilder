import { equippedStore } from '../store/equippedStore.js';
import { AUGMENT_DATABASE } from '../store/constants.js';

export class StatsManager {
    constructor() {
        this.container = document.getElementById('detailed-stats-container');
        /** @type {Record<string, number>} */
        this.statsValues = {}
    }

    /** Ricalcola i valori aggregati di tutte le statistiche */
    recalculate() {
        this.statsValues = {}
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
        const currentNodes = dataStore.data.skillTrees[equippedStore.state.currentClass].nodes;
        const currentLevels = equippedStore.state.treeLevels[equippedStore.state.currentClass];

// 2. Itera su tutti i nodi dell'albero
        Object.keys(currentNodes).forEach(id => {
            const node = currentNodes[id];
            const curLvl = currentLevels.get(id) || 0;

            // Se il nodo ha punti investiti ed ha una statKey definita
            if (curLvl > 0 && node.statKey) {
                let numericVal = 0;
                let rawStat = node.statKey;

                // Controlla se la statKey originale indica un valore negativo (es. inizia con "-")
                const isNegative = rawStat.trim().startsWith('-');

                // Calcolo del valore scalato tramite i parametri
                if (node.parameters && Object.keys(node.parameters).length > 0) {
                    const [paramKey, paramData] = Object.entries(node.parameters)[0];
                    const calculatedVal = paramData.base + (paramData.increase * (curLvl - 1));

                    numericVal = isNegative ? -Math.abs(calculatedVal) : calculatedVal;

                    // Rimpiazza il segnaposto con il valore calcolato
                    rawStat = rawStat.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), calculatedVal);
                }

                // Rimuove il segno meno opzionale, il numero e lo spazio (es. "-3% Energy Consumption" diventa "% Energy Consumption")
                rawStat = rawStat.replace(/^-?\d+([.,]\d+)?\s*/, '');

                let isPercent = false;
                if (rawStat.includes('%')) {
                    isPercent = true;
                    rawStat = rawStat.replace('%', '');
                }

                if (!isNaN(numericVal) && numericVal !== 0) {
                    // Ricostruisce la statKey pulita (es. "Energy Consumption%")
                    const finalStatKey = isPercent ? rawStat.trim() + "%" : rawStat.trim();

                    this.statsValues[finalStatKey] = (this.statsValues[finalStatKey] || 0) + numericVal;
                }
            }
        });

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