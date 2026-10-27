import { store } from '../store.js';
import { ITEM_DATABASE } from '../constants.js';

export class ItemManager {
    constructor() {
        /** @type {string|null} Slot attualmente in fase di modifica nel modale */
        this.editingSlot = null;
        this.initDatalists();
        this.bindEvents();
    }

    /** Inizializza le datalist HTML per i suggerimenti degli oggetti */
    initDatalists() {
        Object.keys(ITEM_DATABASE).forEach(slot => {
            const datalist = document.getElementById(`list-${slot}`);
            if (!datalist) return;
            datalist.innerHTML = '';
            ITEM_DATABASE[slot].forEach(item => {
                const opt = document.createElement('option');
                opt.value = item.name;
                datalist.appendChild(opt);
            });
        });
    }

    /** Associa gli eventi degli elementi DOM */
    bindEvents() {
        document.querySelectorAll('.item-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const target = /** @type {HTMLInputElement} */ (e.target);
                const slot = target.dataset.slot;
                if (slot) this.handleItemInput(slot, target.value);
            });
        });

        document.querySelectorAll('.augment-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const target = /** @type {HTMLInputElement} */ (e.target);
                const slot = target.dataset.augmentSlot;
                const index = parseInt(target.dataset.augIndex || '0', 10);
                if (slot) this.handleAugmentInput(slot, index, target.value);
            });
        });

        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = /** @type {HTMLElement} */ (e.target);
                const slot = target.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
                if (slot) this.openModal(slot);
            });
        });

        document.getElementById('btn-add-stat')?.addEventListener('click', () => this.addModalStatRow());
        document.getElementById('btn-save-modal')?.addEventListener('click', () => this.saveModalChanges());
        document.querySelectorAll('.btn-close-modal').forEach(btn => btn.addEventListener('click', () => this.closeModal()));
    }

    /**
     * Modifica l'oggetto selezionato per uno slot specifico
     * @param {string} slot
     * @param {string} value
     */
    handleItemInput(slot, value) {
        const trimmed = value.trim();
        const activeEquip = store.state.activeEquip;

        if (!trimmed) {
            activeEquip[slot].name = '';
            activeEquip[slot].stats = {};
        } else {
            const preset = ITEM_DATABASE[slot]?.find(i => i.name.toLowerCase() === trimmed.toLowerCase());
            if (preset) {
                activeEquip[slot].name = preset.name;
                activeEquip[slot].stats = { ...preset.stats };
            } else {
                activeEquip[slot].name = value;
            }
        }
        store.notify();
    }

    /**
     * @param {string} slot
     * @param {number} index
     * @param {string} value
     */
    handleAugmentInput(slot, index, value) {
        store.state.activeEquip[slot].augments[index] = value.trim();
        store.notify();
    }

    /**
     * Apre la finestra modale per inserire statistiche personalizzate
     * @param {string} slot
     */
    openModal(slot) {
        this.editingSlot = slot;
        const current = store.state.activeEquip[slot];

        const titleEl = document.getElementById('modal-slot-title');
        const nameEl = /** @type {HTMLInputElement} */ (document.getElementById('modal-item-name'));

        if (titleEl) titleEl.textContent = `Modifica Slot: ${slot.toUpperCase()}`;
        if (nameEl) nameEl.value = current.name || '';

        const container = document.getElementById('modal-stat-list');
        if (!container) return;
        container.innerHTML = '';

        Object.entries(current.stats).forEach(([name, val]) => this.addModalStatRow(name, val));
        if (Object.keys(current.stats).length === 0) this.addModalStatRow('', '');

        document.getElementById('modal-editor')?.classList.add('active');
    }

    closeModal() {
        document.getElementById('modal-editor')?.classList.remove('active');
        this.editingSlot = null;
    }

    /**
     * Aggiunge una riga di attributo alla finestra modale
     * @param {string} [statName='']
     * @param {number|string} [statVal='']
     */
    addModalStatRow(statName = '', statVal = '') {
        const container = document.getElementById('modal-stat-list');
        if (!container) return;

        const row = document.createElement('div');
        row.className = 'stat-edit-row';
        row.innerHTML = `
      <input type="text" class="stat-name-input" list="stat-suggestions" placeholder="Statistica" value="${statName}">
      <input type="text" class="stat-val-input" placeholder="Valore (es. 10 o 35%)" value="${statVal}">
      <button class="btn-delete" type="button">🗑️</button>
    `;

        row.querySelector('.btn-delete')?.addEventListener('click', () => row.remove());
        container.appendChild(row);
    }

    saveModalChanges() {
        if (!this.editingSlot) return;

        const nameEl = /** @type {HTMLInputElement} */ (document.getElementById('modal-item-name'));
        const name = nameEl.value.trim();
        const rows = document.querySelectorAll('#modal-stat-list .stat-edit-row');

        /** @type {import('../constants.js').ItemStats} */
        const newStats = {};

        rows.forEach(row => {
            const nameInput = /** @type {HTMLInputElement} */ (row.querySelector('.stat-name-input'));
            const valInput = /** @type {HTMLInputElement} */ (row.querySelector('.stat-val-input'));

            const sName = nameInput.value.trim();
            const rawVal = valInput.value.trim();

            if (sName && rawVal !== '') {
                if (rawVal.includes('%') || isNaN(Number(rawVal.replace(',', '.')))) {
                    newStats[sName] = rawVal;
                } else {
                    newStats[sName] = Number(rawVal.replace(',', '.'));
                }
            }
        });

        const currentSlot = store.state.activeEquip[this.editingSlot];
        currentSlot.name = name;
        currentSlot.stats = newStats;

        const inputEl = /** @type {HTMLInputElement} */ (document.querySelector(`input[data-slot="${this.editingSlot}"]`));
        if (inputEl) inputEl.value = name;

        store.notify();
        this.closeModal();
    }

    /** Sincronizza i valori degli input con lo stato corrente dello Store */
    updateInputsFromStore() {
        Object.keys(store.state.activeEquip).forEach(slot => {
            const item = store.state.activeEquip[slot];
            const input = /** @type {HTMLInputElement} */ (document.querySelector(`input[data-slot="${slot}"]`));
            if (input) input.value = item.name || '';

            if (item.augments) {
                item.augments.forEach((augVal, idx) => {
                    const augInput = /** @type {HTMLInputElement} */ (document.querySelector(`input[data-augment-slot="${slot}"][data-aug-index="${idx}"]`));
                    if (augInput) augInput.value = augVal || '';
                });
            }
        });
    }
}