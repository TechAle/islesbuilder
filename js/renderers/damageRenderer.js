/** @typedef {import('../data/types.js').DamageResult} DamageResult */

/**
 * @typedef {Object} DamageRendererOptions
 * @property {HTMLElement|null} root - Contenitore degli step di danno
 * @property {HTMLElement|null} [dpsValue] - Elemento del DPS medio
 */

/**
 * @typedef {Object} DamageStepGroup
 * @property {string} id
 * @property {string} label
 * @property {DamageResult[]} results
 */

/**
 * Renderer del pannello Damage Overview.
 * Ogni step della pipeline è una tendina con le proprie righe.
 */
export class DamageRenderer {
    /** @param {DamageRendererOptions} options */
    constructor({ root, dpsValue = null }) {
        this.root = root;
        this.dpsValue = dpsValue;
    }

    /**
     * @param {DamageStepGroup[]} groups
     * @param {number|null} [dps] - DPS medio, se disponibile
     */
    render(groups, dps = null) {
        if (!this.root) return;
        const root = this.root;

        if (this.dpsValue) {
            this.dpsValue.textContent = dps === null ? '—' : formatNumber(dps);
        }

        root.innerHTML = '';

        if (groups.every(group => group.results.length === 0)) {
            const empty = document.createElement('div');
            empty.className = 'damage-empty';
            empty.textContent = 'Nessun danno calcolabile';
            root.appendChild(empty);
            return;
        }

        groups.forEach(group => {
            const step = document.createElement('div');
            step.className = 'damage-step';

            const toggle = document.createElement('button');
            toggle.type = 'button';
            toggle.className = 'section-toggle damage-step-toggle';
            toggle.dataset.collapse = `damage-step-${group.id}`;
            toggle.setAttribute('aria-expanded', 'true');

            const label = document.createElement('span');
            label.textContent = group.label;
            toggle.appendChild(label);

            const chevron = document.createElement('span');
            chevron.className = 'section-chevron';
            chevron.setAttribute('aria-hidden', 'true');
            chevron.textContent = '▾';
            toggle.appendChild(chevron);

            const content = document.createElement('div');
            content.className = 'section-content damage-step-content';
            content.id = `damage-step-${group.id}`;

            if (group.results.length === 0) {
                const empty = document.createElement('div');
                empty.className = 'damage-empty';
                empty.textContent = 'Nessun valore';
                content.appendChild(empty);
            } else {
                group.results.forEach(result => content.appendChild(createRow(result)));
            }

            step.appendChild(toggle);
            step.appendChild(content);
            root.appendChild(step);
        });
    }
}

/**
 * @param {DamageResult} result
 * @returns {HTMLElement}
 */
function createRow(result) {
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
    return row;
}

/**
 * Formatta un risultato applicando l'unità (es. percentuali con segno).
 * @param {DamageResult} result
 * @returns {string}
 */
function formatResult(result) {
    if (typeof result.value === 'string') return result.value;

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
