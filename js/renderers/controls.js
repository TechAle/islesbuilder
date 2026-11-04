/**
 * Controllo slider generico: gestisce input, label e massimo dinamico.
 */
export class SliderControl {
    /**
     * @param {Object} options
     * @param {HTMLInputElement|null} options.input
     * @param {HTMLElement|null} options.valueEl
     * @param {() => void} options.onChange
     * @param {(value: number, max: number) => string} [options.format]
     */
    constructor({ input, valueEl, onChange, format }) {
        this.input = input;
        this.valueEl = valueEl;
        this.onChange = onChange;
        this.format = format ?? ((value, max) => `${value} / ${max}`);
    }

    mount() {
        this.input?.addEventListener('input', () => {
            this.updateLabel();
            this.onChange();
        });

        this.updateLabel();
    }

    /** @returns {number} */
    get value() {
        const value = Number.parseFloat(this.input?.value ?? '0');
        return Number.isFinite(value) ? value : 0;
    }

    /** @param {number} value */
    set value(value) {
        if (this.input) this.input.value = String(value);
        this.updateLabel();
    }

    /** @returns {number} */
    get max() {
        const max = Number.parseFloat(this.input?.max ?? '0');
        return Number.isFinite(max) ? max : 0;
    }

    /** @param {number} max */
    setMax(max) {
        if (!this.input) return;

        this.input.max = String(max);

        if (this.value > max) {
            this.input.value = String(max);
        }

        this.updateLabel();
    }

    updateLabel() {
        if (!this.valueEl) return;
        this.valueEl.textContent = this.format(this.value, this.max);
    }
}

/**
 * Controllo checkbox generico.
 */
export class CheckboxControl {
    /**
     * @param {Object} options
     * @param {HTMLInputElement|null} options.input
     * @param {() => void} options.onChange
     */
    constructor({ input, onChange }) {
        this.input = input;
        this.onChange = onChange;
    }

    mount() {
        this.input?.addEventListener('change', () => this.onChange());
    }

    /** @returns {boolean} */
    get checked() {
        return this.input?.checked ?? false;
    }
}
