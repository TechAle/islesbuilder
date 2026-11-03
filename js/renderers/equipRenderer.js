import { EQUIP_SLOTS } from '../data/constants.js';

/** @typedef {import('../data/types.js').BuildState} BuildState */
/** @typedef {import('../data/types.js').EquipSlot} EquipSlot */

/**
 * @typedef {Object} EquipRendererOptions
 * @property {Document|HTMLElement} root
 * @property {(slot: EquipSlot, value: string) => void} onItemChange
 * @property {(slot: EquipSlot, index: number, value: string) => void} onAugmentChange
 * @property {(slot: EquipSlot) => void} onOpenModal
 */

/**
 * Renderer del pannello equipaggiamento.
 */
export class EquipRenderer {
    /** @param {EquipRendererOptions} options */
    constructor({ root, onItemChange, onAugmentChange, onOpenModal }) {
        this.root = root;
        this.onItemChange = onItemChange;
        this.onAugmentChange = onAugmentChange;
        this.onOpenModal = onOpenModal;
    }

    /** Collega gli eventi degli input equipaggiamento. */
    mount() {
        this.root.querySelectorAll('.btn-edit').forEach(button => {
            button.addEventListener('click', event => {
                const target = /** @type {HTMLElement} */ (event.currentTarget);
                const slot = /** @type {EquipSlot|undefined} */ (target.dataset.slot);
                if (slot) this.onOpenModal(slot);
            });
        });

        this.root.querySelectorAll('.item-input').forEach(input => {
            input.addEventListener('input', event => {
                const target = /** @type {HTMLInputElement} */ (event.target);
                const slot = /** @type {EquipSlot|undefined} */ (target.dataset.slot);
                if (slot) this.onItemChange(slot, target.value);
            });
        });

        this.root.querySelectorAll('.augment-input').forEach(input => {
            input.addEventListener('input', event => {
                const target = /** @type {HTMLInputElement} */ (event.target);
                const slot = /** @type {EquipSlot|undefined} */ (target.dataset.augmentSlot);
                const index = parseInt(target.dataset.augIndex || '0', 10);
                if (slot) this.onAugmentChange(slot, index, target.value);
            });
        });
    }

    /** @param {BuildState} state */
    render(state) {
        EQUIP_SLOTS.forEach(slot => {
            const item = state.activeEquip[slot];
            if (!item) return;

            const input = /** @type {HTMLInputElement|null} */ (
                this.root.querySelector(`input[data-slot="${slot}"]`)
            );
            if (input) input.value = item.name || '';

            (item.augments || []).forEach((value, index) => {
                const augmentInput = /** @type {HTMLInputElement|null} */ (
                    this.root.querySelector(`input[data-augment-slot="${slot}"][data-aug-index="${index}"]`)
                );
                if (augmentInput) augmentInput.value = value || '';
            });
        });
    }

    /** @param {Record<string, string[]>} namesBySlot */
    renderDatalists(namesBySlot) {
        Object.entries(namesBySlot).forEach(([slot, names]) => {
            const datalist = this.getElementById(`list-${slot}`);
            if (!datalist) return;

            datalist.innerHTML = '';
            names.forEach(name => {
                const option = document.createElement('option');
                option.value = name;
                datalist.appendChild(option);
            });
        });
    }

    /** @param {string[]} stats */
    renderStatSuggestions(stats) {
        const datalist = this.getElementById('stat-suggestions');
        if (!datalist) return;

        datalist.innerHTML = '';
        stats.forEach(stat => {
            const option = document.createElement('option');
            option.value = stat;
            datalist.appendChild(option);
        });
    }

    /**
     * @param {string} id
     * @returns {HTMLElement|null}
     */
    getElementById(id) {
        const root = /** @type {any} */ (this.root);
        if (typeof root.getElementById === 'function') {
            return root.getElementById(id);
        }
        return /** @type {HTMLElement|null} */ (root.querySelector(`#${id}`));
    }
}
