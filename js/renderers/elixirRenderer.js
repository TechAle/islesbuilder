import { MAX_ELIXIR_LEVEL } from '../data/constants.js';

/** @typedef {import('../data/types.js').Elixir} Elixir */

/**
 * @typedef {Object} ElixirRendererOptions
 * @property {HTMLElement|null} root
 * @property {HTMLButtonElement|null} maxButton
 * @property {HTMLButtonElement|null} zeroButton
 * @property {(index: number, value: string) => void} onValueChange
 * @property {(value: number) => void} onSetAll
 */

/**
 * Renderer delle card elisir.
 */
export class ElixirRenderer {
    /** @param {ElixirRendererOptions} options */
    constructor({ root, maxButton, zeroButton, onValueChange, onSetAll }) {
        this.root = root;
        this.maxButton = maxButton;
        this.zeroButton = zeroButton;
        this.onValueChange = onValueChange;
        this.onSetAll = onSetAll;
        /** @type {HTMLInputElement[]} */
        this.inputs = [];
        this.signature = '';
    }

    /** Collega gli eventi dei pulsanti globali degli elisir. */
    mount() {
        this.maxButton?.addEventListener('click', () => this.onSetAll(MAX_ELIXIR_LEVEL));
        this.zeroButton?.addEventListener('click', () => this.onSetAll(0));
    }

    /** @param {Elixir[]} elixirs */
    render(elixirs) {
        if (!this.root) return;

        const signature = elixirs.map(elixir => `${elixir.id}:${elixir.name}`).join('|');
        if (signature !== this.signature) {
            this.rebuild(elixirs);
            this.signature = signature;
            return;
        }

        elixirs.forEach((elixir, index) => {
            const input = this.inputs[index];
            if (input) input.value = String(elixir.val);
        });
    }

    /** @param {Elixir[]} elixirs */
    rebuild(elixirs) {
        if (!this.root) return;
        const root = this.root;

        root.innerHTML = '';
        this.inputs = [];

        elixirs.forEach((elixir, index) => {
            const card = document.createElement('div');
            card.className = 'elixir-card';

            const nameEl = document.createElement('span');
            nameEl.className = 'elixir-name';
            nameEl.textContent = elixir.name;

            const input = document.createElement('input');
            input.type = 'number';
            input.className = 'elixir-input';
            input.min = '0';
            input.max = String(MAX_ELIXIR_LEVEL);
            input.value = String(elixir.val);

            input.addEventListener('change', () => this.onValueChange(index, input.value));
            this.inputs.push(input);

            card.appendChild(nameEl);
            card.appendChild(input);
            root.appendChild(card);
        });
    }
}
