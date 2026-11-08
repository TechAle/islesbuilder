import { EQUIP_SLOTS, MAX_AUGMENTS_PER_ITEM } from '../data/constants.js';
import { clampUpgradeLevel, getMaxUpgradeLevel } from '../modules/itemUpgrade.js';

/** @typedef {import('../data/types.js').BuildState} BuildState */
/** @typedef {import('../data/types.js').EquipSlot} EquipSlot */

/**
 * @typedef {Object} EquipRendererOptions
 * @property {Document|HTMLElement} root
 * @property {(slot: EquipSlot, value: string) => void} onItemChange
 * @property {(slot: EquipSlot, value: string) => void} onUpgradeChange
 * @property {(slot: EquipSlot, index: number, value: string) => void} onAugmentChange
 * @property {(slot: EquipSlot) => void} onOpenModal
 */

/**
 * Renderer del pannello equipaggiamento.
 */
export class EquipRenderer {
    /** @param {EquipRendererOptions} options */
    constructor({ root, onItemChange, onUpgradeChange, onAugmentChange, onOpenModal }) {
        this.root = root;
        this.onItemChange = onItemChange;
        this.onUpgradeChange = onUpgradeChange;
        this.onAugmentChange = onAugmentChange;
        this.onOpenModal = onOpenModal;
    }

    /** Collega gli eventi degli input equipaggiamento. */
    mount() {
        this.renderAugmentInputs();
        this.applyAugmentLists();

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

            const target = /** @type {HTMLInputElement} */ (input);
            const slot = /** @type {EquipSlot|undefined} */ (target.dataset.slot);
            const controls = target.closest('.equip-controls');
            if (!slot || !controls) return;

            const upgradeInput = document.createElement('input');
            upgradeInput.type = 'number';
            upgradeInput.className = 'item-upgrade-input';
            upgradeInput.min = '0';
            upgradeInput.max = '35';
            upgradeInput.step = '1';
            upgradeInput.value = '0';
            upgradeInput.title = 'Upgrade level (0-35)';
            upgradeInput.dataset.upgradeSlot = slot;
            upgradeInput.addEventListener('input', () => {
                this.onUpgradeChange(slot, upgradeInput.value);
            });
            controls.appendChild(upgradeInput);
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

    /** Crea gli input augment in base al massimo configurato nelle constants. */
    renderAugmentInputs() {
        this.root.querySelectorAll('.augments-container[data-augment-slot]').forEach(container => {
            const slot = /** @type {EquipSlot|undefined} */ (
                /** @type {HTMLElement} */ (container).dataset.augmentSlot
            );
            if (!slot) return;

            container.innerHTML = '';

            for (let index = 0; index < MAX_AUGMENTS_PER_ITEM; index++) {
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'augment-input';
                input.placeholder = `Augment ${index + 1}`;
                input.dataset.augmentSlot = slot;
                input.dataset.augIndex = String(index);
                container.appendChild(input);
            }
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

            const upgradeInput = /** @type {HTMLInputElement|null} */ (
                this.root.querySelector(`input[data-upgrade-slot="${slot}"]`)
            );
            if (upgradeInput) {
                const maxUpgrade = getMaxUpgradeLevel(item);
                upgradeInput.max = String(maxUpgrade);
                upgradeInput.value = String(clampUpgradeLevel(item, item.upgradeLevel ?? 0));
                upgradeInput.disabled = !item.name;
            }

            (item.augments || []).slice(0, MAX_AUGMENTS_PER_ITEM).forEach((value, index) => {
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

    /**
     * @param {{weapon: string[], armor: string[]}} suggestions
     */
    renderAugmentDatalists(suggestions) {
        /** @type {Record<'weapon'|'armor', string[]>} */
        const lists = {
            weapon: suggestions.weapon,
            armor: suggestions.armor
        };

        Object.entries(lists).forEach(([kind, names]) => {
            const datalist = this.getElementById(`list-augments-${kind}`);
            if (!datalist) return;

            datalist.innerHTML = '';
            names.forEach(name => {
                const option = document.createElement('option');
                option.value = name;
                datalist.appendChild(option);
            });
        });

        this.applyAugmentLists();
    }

    /** Assegna a ogni input la datalist weapon/armor corretta. */
    applyAugmentLists() {
        this.root.querySelectorAll('.augment-input').forEach(input => {
            const target = /** @type {HTMLInputElement} */ (input);
            const slot = /** @type {EquipSlot|undefined} */ (target.dataset.augmentSlot);
            if (!slot) return;

            target.setAttribute(
                'list',
                slot === 'weapon' ? 'list-augments-weapon' : 'list-augments-armor'
            );
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
