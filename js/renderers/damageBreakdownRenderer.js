/**
 * Renderer della ripartizione dell'Average DPS.
 */
export class DamageBreakdownRenderer {
    /** @param {{ root: HTMLElement|null }} options */
    constructor({ root }) {
        this.root = root;
    }

    /**
     * @param {{
     *   total: number,
     *   sources: Array<{label: string, dps: number, percent: number}>
     * }} breakdown
     */
    render(breakdown) {
        const root = this.root;
        if (!root) return;

        if (!breakdown || breakdown.total <= 0) {
            root.innerHTML = '';
            root.hidden = true;
            return;
        }

        root.hidden = false;
        root.innerHTML = '';

        breakdown.sources.forEach(source => {
            root.appendChild(this.createRow(source));
        });
    }

    /**
     * @param {{label: string, dps: number, percent: number}} entry
     * @param {boolean} [modifier]
     * @returns {HTMLElement}
     */
    createRow(entry, modifier = false) {
        const row = document.createElement('div');
        row.className = modifier
            ? 'damage-breakdown-row damage-breakdown-row--modifier'
            : 'damage-breakdown-row';

        const label = document.createElement('span');
        label.className = 'damage-breakdown-label';
        label.textContent = entry.label;

        const dps = document.createElement('span');
        dps.className = 'damage-breakdown-dps';
        dps.textContent = formatNumber(entry.dps);

        const percent = document.createElement('span');
        percent.className = 'damage-breakdown-percent';
        percent.textContent = `${formatNumber(entry.percent)}%`;

        row.appendChild(label);
        row.appendChild(dps);
        row.appendChild(percent);
        return row;
    }
}

/**
 * @param {number} value
 * @returns {string}
 */
function formatNumber(value) {
    return value.toLocaleString('it-IT', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}
