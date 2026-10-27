import { store } from '../store.js';
import { AUGMENT_DATABASE } from '../constants.js';

export class StatsManager {
    constructor() {
        this.container = document.getElementById('detailed-stats-container');
    }

    /** Ricalcola i valori aggregati di tutte le statistiche */
    recalculate() {
        /** @type {Record<string, number>} */
        const totals = {};
        /** @type {Set<string>} */
        const percentageStats = new Set();
        const { activeEquip, elixirs } = store.state;

        Object.values(activeEquip).forEach(item => {
            if (!item.stats) return;

            Object.entries(item.stats).forEach(([stat, val]) => {
                let numericVal = typeof val === 'number' ? val : 0;

                if (typeof val === 'string') {
                    if (val.includes('%')) {
                        numericVal = parseFloat(val.replace('%', '').replace(',', '.'));
                        percentageStats.add(stat);
                    } else {
                        numericVal = parseFloat(val.replace(',', '.')) || 0;
                    }
                }

                if (!isNaN(numericVal)) {
                    totals[stat] = (totals[stat] || 0) + numericVal;
                    if (typeof val === 'string' && val.includes('%')) percentageStats.add(stat);
                }
            });

            if (item.augments) {
                item.augments.forEach(augName => {
                    if (!augName) return;
                    const augPreset = AUGMENT_DATABASE.find(a => a.name.toLowerCase() === augName.toLowerCase());

                    if (augPreset && augPreset.stats) {
                        Object.entries(augPreset.stats).forEach(([stat, val]) => {
                            let numericVal = typeof val === 'number' ? val : 0;
                            if (typeof val === 'string') {
                                if (val.includes('%')) {
                                    numericVal = parseFloat(val.replace('%', '').replace(',', '.'));
                                    percentageStats.add(stat);
                                } else {
                                    numericVal = parseFloat(val.replace(',', '.')) || 0;
                                }
                            }
                            if (!isNaN(numericVal)) {
                                totals[stat] = (totals[stat] || 0) + numericVal;
                                if (typeof val === 'string' && val.includes('%')) percentageStats.add(stat);
                            }
                        });
                    }
                });
            }
        });

        elixirs.forEach(el => {
            if (el.val > 0) {
                totals[el.stat] = (totals[el.stat] || 0) + el.val;
                if (el.stat.toLowerCase().includes('crit') || el.stat.toLowerCase().includes('chance')) {
                    percentageStats.add(el.stat);
                }
            }
        });

        this.render(totals, percentageStats);
    }

    /**
     * Renderizza l'output HTML nell'interfaccia
     * @param {Record<string, number>} totals
     * @param {Set<string>} percentageStats
     */
    render(totals, percentageStats) {
        if (!this.container) return;
        this.container.innerHTML = '';

        if (Object.keys(totals).length === 0) {
            this.container.innerHTML = '<div style="font-size:12px; color:var(--text-muted);">Nessuna statistica applicata</div>';
            return;
        }

        Object.entries(totals).forEach(([stat, val]) => {
            const row = document.createElement('div');
            row.className = 'stat-row';

            const isPercent = percentageStats.has(stat) || stat.toLowerCase().includes('crit') || stat.toLowerCase().includes('chance');
            const displayVal = isPercent ? `+${val}%` : `+${val}`;

            row.innerHTML = `<span class="stat-label">${stat}:</span><span class="stat-val">${displayVal}</span>`;
            this.container.appendChild(row);
        });
    }
}