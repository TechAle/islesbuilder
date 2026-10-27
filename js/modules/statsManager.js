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
            const displayVal = isPercent ? `+${val.toFixed(2)}%` : `+${val.toFixed(2)}`;

            row.innerHTML = `<span class="stat-label">${stat}:</span><span class="stat-val">${displayVal}</span>`;
            this.container.appendChild(row);
        });
    }
}

export const statsMgr = new StatsManager();
window.statsMgr = statsMgr;