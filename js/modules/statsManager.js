import { equippedStore } from '../store/equippedStore.js';
import { dataStore } from '../store/dataStore.js';
import { CLASS_KEYS } from '../store/constants.js';

/** @typedef {import('../store/constants.js').ClassKey} ClassKey */

export class StatsManager {
    constructor() {
        /** @type {HTMLElement|null} */
        this.container = document.getElementById('detailed-stats-container');
        /** @type {Record<string, number>} */
        this.statsValues = {}
        /** @type {Record<ClassKey, Record<string, number>>} */
        this.skillValues = this.createSkillValues();
    }

    /**
     * Crea la struttura vuota dei valori delle skill per ogni classe.
     * @returns {Record<ClassKey, Record<string, number>>}
     */
    createSkillValues() {
        /** @type {Record<ClassKey, Record<string, number>>} */
        const values = /** @type {Record<ClassKey, Record<string, number>>} */ ({});
        CLASS_KEYS.forEach(classKey => {
            values[classKey] = {};
        });
        return values;
    }

    /** Ricalcola i valori aggregati di tutte le statistiche. */
    recalculate() {
        this.statsValues = {}
        this.skillValues = this.createSkillValues();
        const { activeEquip, elixirs } = equippedStore.state;

        Object.values(activeEquip).forEach(item => {
            if (!item.stats) return;

            Object.entries(item.stats).forEach(([stat, val]) => {
                if (stat.includes("Augment") || stat.includes("Level") || stat.includes("Damage Type"))
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
                        numericVal = parseFloat(val.replace(',', '.'));
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
        for (const classCheck of CLASS_KEYS) {
            const currentNodes = dataStore.data.skillTrees[classCheck].nodes;
            const currentLevels = equippedStore.state.treeLevels[classCheck];

            Object.keys(currentNodes).forEach(id => {
                const node = currentNodes[id];
                const curLvl = currentLevels.get(id) || 0;

                // Se il nodo ha punti investiti ed ha una statKey definita
                if (curLvl > 0 && node.statKey) {
                    const isDirect = node.isDirect;
                    let rawStat = node.statKey;

                    // Sostituisce ogni segnaposto ({val}, {c}, {a}, ...) con il valore
                    // calcolato per il livello attuale del nodo.
                    if (node.parameters) {
                        for (const [key, param] of Object.entries(node.parameters)) {
                            const calculatedVal = param.base + (param.increase * (curLvl - 1));
                            rawStat = rawStat.replaceAll(`{${key}}`, String(calculatedVal));
                        }
                    }
                    rawStat = rawStat.replaceAll("{level}", String(curLvl)).trim();

                    // Il valore numerico è sempre il primo token della statKey
                    // (es. "5% Ranged Damage", "-3% Melee Energy Consumption")
                    const numberMatch = rawStat.match(/^-?\d+(?:[.,]\d+)?%?/);
                    if (!numberMatch) return;

                    const numericVal = parseFloat(numberMatch[0].replace('%', '').replace(',', '.')) || 0;
                    const isPercent = numberMatch[0].includes('%');
                    const isNegative = rawStat.startsWith('-');

                    let finalStatKey = rawStat.slice(numberMatch[0].length).trim();
                    if (isPercent && !finalStatKey.endsWith('%')) finalStatKey += '%';

// Salvataggio del valore calcolato
                    if (!isNaN(numericVal) && numericVal !== 0 && finalStatKey) {
                        const value = isNegative ? -Math.abs(numericVal) : numericVal;

                        if (isDirect)
                            this.statsValues[finalStatKey] = (this.statsValues[finalStatKey] || 0) + value;
                        else
                            this.skillValues[classCheck][finalStatKey] = value;
                    }
                }
            });

        }
        this.render();
    }

    /** Renderizza l'output HTML delle statistiche nell'interfaccia. */
    render() {
        if (!this.container) return;
        const container = this.container;
        container.innerHTML = '';

        if (Object.keys(this.statsValues).length === 0) {
            container.innerHTML = '<div style="font-size:12px; color:var(--text-muted);">Nessuna statistica applicata</div>';
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
            container.appendChild(row);
        });
    }
}

export const statsMgr = new StatsManager();
/** @type {any} */ (window).statsMgr = statsMgr;