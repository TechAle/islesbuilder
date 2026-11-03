import { equippedStore } from '../store/equippedStore.js';
import { MAX_ELIXIR_LEVEL } from '../store/constants.js';

export class ElixirManager {
    constructor() {
        /** @type {HTMLElement|null} */
        this.container = document.getElementById('elixirs-container');
        this.init();
    }

    /** Inizializza la UI degli elisir. */
    init() {
        this.render();
    }

    /** Renderizza le card degli elisir. */
    render() {
        if (!this.container) return;
        const container = this.container;
        container.innerHTML = '';

        equippedStore.state.elixirs.forEach((el, index) => {
            const card = document.createElement('div');
            card.className = 'elixir-card';
            card.innerHTML = `
        <span class="elixir-name">${el.name}</span>
        <input type="number" class="elixir-input" min="0" max="${MAX_ELIXIR_LEVEL}" value="${el.val}">
      `;

            card.querySelector('.elixir-input')?.addEventListener('change', (e) => {
                const input = /** @type {HTMLInputElement} */ (e.target);
                this.handleChange(index, input.value);
            });

            container.appendChild(card);
        });
    }

    /**
     * Aggiorna il livello di un elisir applicando i limiti consentiti.
     * @param {number} index
     * @param {string} value
     */
    handleChange(index, value) {
        let parsed = parseInt(value, 10);
        if (isNaN(parsed) || parsed < 0) parsed = 0;
        if (parsed > MAX_ELIXIR_LEVEL) parsed = MAX_ELIXIR_LEVEL;

        equippedStore.setElixirValue(index, parsed);
    }

    /** Aggiorna il valore numerico dei vari input elisir. */
    updateInputsFromStore() {
        if (!this.container) return;
        const inputs = this.container.querySelectorAll('.elixir-input');
        equippedStore.state.elixirs.forEach((el, idx) => {
            const input = /** @type {HTMLInputElement} */ (inputs[idx]);
            if (input) input.value = String(el.val);
        });
    }
}