/** @typedef {import('../data/types.js').DamageResult} DamageResult */

/**
 * @typedef {Object} DamageRendererOptions
 * @property {HTMLElement|null} root - Contenitore delle righe di danno
 * @property {HTMLElement|null} [dpsValue] - Elemento del DPS medio
 */

/**
 * Renderer del pannello Damage Overview.
 * Mostra una riga per ogni voce prodotta dalla pipeline di danno.
 */
export class DamageRenderer {
    /** @param {DamageRendererOptions} options */
    constructor({ root, dpsValue = null }) {
        this.root = root;
        this.dpsValue = dpsValue;
    }

    /**
     * @param {DamageResult[]} results
     * @param {number|null} [dps] - DPS medio, se disponibile
     */
    render(results, dps = null) {
        if (!this.root) return;
        const root = this.root;

        if (this.dpsValue) {
            this.dpsValue.textContent = dps === null ? '—' : formatNumber(dps);
        }

        root.innerHTML = '';

        if (results.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'damage-empty';
            empty.textContent = 'Nessun danno calcolabile';
            root.appendChild(empty);
            return;
        }

        results.forEach(result => {
            const row = document.createElement('div');
            row.className = 'stat-row';

            const label = document.createElement('span');
            label.className = 'stat-label';
            label.textContent = `${result.label}:`;

            const value = document.createElement('span');
            value.className = 'stat-val';
            value.textContent = formatResult(result);

            row.appendChild(label);
            row.appendChild(value);
            root.appendChild(row);
        });
    }
}

/**
 * Formatta un risultato applicando l'unità (es. percentuali con segno).
 * @param {DamageResult} result
 * @returns {string}
 */
function formatResult(result) {
    if (result.unit === '%') {
        const sign = result.value > 0 ? '+' : '';
        return `${sign}${formatNumber(result.value)}%`;
    }

    const base = formatNumber(result.value);
    return result.unit ? `${base} ${result.unit}` : base;
}

/**
 * Formatta un numero con separatore delle migliaia e due decimali.
 * @param {number} value
 * @returns {string}
 */
function formatNumber(value) {
    return value.toLocaleString('it-IT', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}
