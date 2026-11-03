/** @typedef {import('../data/types.js').EquipSlot} EquipSlot */
/** @typedef {import('../data/types.js').EquipSlotData} EquipSlotData */

/**
 * @typedef {Object} ItemModalRendererOptions
 * @property {Document|HTMLElement} root
 * @property {(slot: EquipSlot, name: string, rows: Array<{name: string, value: string}>) => void} onSave
 */

/**
 * Renderer del modale per le statistiche personalizzate degli oggetti.
 */
export class ItemModalRenderer {
    /** @param {ItemModalRendererOptions} options */
    constructor({ root, onSave }) {
        this.root = root;
        this.onSave = onSave;
        /** @type {EquipSlot|null} */
        this.editingSlot = null;
    }

    /** Collega gli eventi del modale. */
    mount() {
        this.root.querySelectorAll('.btn-close-modal').forEach(button => {
            button.addEventListener('click', () => this.close());
        });

        this.getElementById('btn-add-stat')?.addEventListener('click', () => this.addRow());
        this.getElementById('btn-save-modal')?.addEventListener('click', () => this.save());
    }

    /**
     * Apre il modale per lo slot indicato.
     * @param {EquipSlot} slot
     * @param {EquipSlotData} item
     */
    open(slot, item) {
        this.editingSlot = slot;

        const titleEl = this.getElementById('modal-slot-title');
        const nameEl = /** @type {HTMLInputElement|null} */ (this.getElementById('modal-item-name'));

        if (titleEl) titleEl.textContent = `Modifica Slot: ${slot.toUpperCase()}`;
        if (nameEl) nameEl.value = item.name || '';

        const container = this.getElementById('modal-stat-list');
        if (!container) return;

        container.innerHTML = '';
        Object.entries(item.stats).forEach(([name, value]) => {
            this.addRow(name, String(value));
        });
        if (Object.keys(item.stats).length === 0) this.addRow('', '');

        this.getElementById('modal-editor')?.classList.add('active');
    }

    /** Chiude il modale. */
    close() {
        this.getElementById('modal-editor')?.classList.remove('active');
        this.editingSlot = null;
    }

    /**
     * Aggiunge una riga di statistica al modale.
     * @param {string} [statName='']
     * @param {string} [statVal='']
     */
    addRow(statName = '', statVal = '') {
        const container = this.getElementById('modal-stat-list');
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

    /** Raccoglie i valori e li passa al manager. */
    save() {
        const slot = this.editingSlot;
        if (!slot) return;

        const nameEl = /** @type {HTMLInputElement|null} */ (this.getElementById('modal-item-name'));
        const name = nameEl ? nameEl.value.trim() : '';

        /** @type {Array<{name: string, value: string}>} */
        const rows = [];

        this.root.querySelectorAll('#modal-stat-list .stat-edit-row').forEach(row => {
            const nameInput = /** @type {HTMLInputElement|null} */ (row.querySelector('.stat-name-input'));
            const valueInput = /** @type {HTMLInputElement|null} */ (row.querySelector('.stat-val-input'));
            if (!nameInput || !valueInput) return;

            rows.push({
                name: nameInput.value.trim(),
                value: valueInput.value.trim()
            });
        });

        this.onSave(slot, name, rows);
        this.close();
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
