/** @typedef {import('../data/types.js').StatTotals} StatTotals */

/**
 * @typedef {Object} StatsRendererOptions
 * @property {HTMLElement|null} root
 */

/**
 * Renderer del pannello statistiche dettagliate.
 */
export class StatsRenderer {
    /** @param {StatsRendererOptions} options */
    constructor({ root }) {
        this.root = root;
    }

    /** @param {Record<string, StatTotals>} statsValues */
    render(statsValues) {
        if (!this.root) return;
        const root = this.root;
        root.innerHTML = '';

        if (Object.keys(statsValues).length === 0) {
            root.innerHTML = '<div style="font-size:12px; color:var(--text-muted);">Nessuna statistica applicata</div>';
            return;
        }

        Object.entries(statsValues).forEach(([stat, totals]) => {
            const parts = [];

            if (totals.flat !== 0) {
                parts.push(`${totals.flat > 0 ? '+' : ''}${totals.flat.toFixed(2)}`);
            }
            if (totals.percent !== 0) {
                parts.push(`${totals.percent > 0 ? '+' : ''}${totals.percent.toFixed(2)}%`);
            }
            if (parts.length === 0) return;

            const row = document.createElement('div');
            row.className = 'stat-row';
            row.innerHTML = `<span class="stat-label">${stat}:</span><span class="stat-val">${parts.join(' / ')}</span>`;
            root.appendChild(row);
        });
    }
}
