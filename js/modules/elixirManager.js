import { store } from '../store.js';

export class ElixirManager {
    constructor() {
        this.container = document.getElementById('elixirs-container');
        this.init();
    }

    init() {
        this.render();
    }

    render() {
        if (!this.container) return;
        this.container.innerHTML = '';

        store.state.elixirs.forEach((el, index) => {
            const card = document.createElement('div');
            card.className = 'elixir-card';
            card.innerHTML = `
        <span class="elixir-name">${el.name}</span>
        <input type="number" class="elixir-input" min="0" max="5" value="${el.val}">
      `;

            card.querySelector('.elixir-input')?.addEventListener('change', (e) => {
                const input = /** @type {HTMLInputElement} */ (e.target);
                this.handleChange(index, input.value);
            });

            this.container.appendChild(card);
        });
    }

    /**
     * @param {number} index
     * @param {string} value
     */
    handleChange(index, value) {
        let parsed = parseInt(value, 10);
        if (isNaN(parsed) || parsed < 0) parsed = 0;
        if (parsed > 5) parsed = 5;

        store.state.elixirs[index].val = parsed;
        store.notify();
    }

    /** Aggiorna il valore numerico dei vari input elisir */
    updateInputsFromStore() {
        if (!this.container) return;
        const inputs = this.container.querySelectorAll('.elixir-input');
        store.state.elixirs.forEach((el, idx) => {
            const input = /** @type {HTMLInputElement} */ (inputs[idx]);
            if (input) input.value = String(el.val);
        });
    }
}