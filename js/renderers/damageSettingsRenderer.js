/** @typedef {import('../data/types.js').DamageSettings} DamageSettings */

/**
 * @typedef {Object} DamageSettingsRendererOptions
 * @property {HTMLButtonElement|null} button
 * @property {HTMLElement|null} panel
 * @property {HTMLInputElement|null} slowAttack
 * @property {HTMLInputElement|null} slowAttackValue
 * @property {HTMLInputElement|null} useBurst
 * @property {HTMLInputElement|null} griefUptime
 * @property {HTMLElement|null} griefUptimeValue
 * @property {HTMLInputElement|null} lastSorrowUptime
 * @property {HTMLElement|null} lastSorrowUptimeValue
 * @property {HTMLInputElement|null} focusStacks
 * @property {HTMLElement|null} focusStacksValue
 * @property {HTMLInputElement|null} potentialChargeKills
 * @property {HTMLElement|null} potentialChargeKillsValue
 * @property {(settings: DamageSettings) => void} onChange
 */

/**
 * Renderer del pannello impostazioni di Damage Overview.
 * Non calcola nulla: legge i controlli e notifica le impostazioni.
 */
export class DamageSettingsRenderer {
    /** @param {DamageSettingsRendererOptions} options */
    constructor({
        button,
        panel,
        slowAttack,
        slowAttackValue,
        useBurst,
        griefUptime,
        griefUptimeValue,
        lastSorrowUptime,
        lastSorrowUptimeValue,
        focusStacks,
        focusStacksValue,
        potentialChargeKills,
        potentialChargeKillsValue,
        onChange
    }) {
        this.button = button;
        this.panel = panel;
        this.slowAttack = slowAttack;
        this.slowAttackValue = slowAttackValue;
        this.useBurst = useBurst;
        this.griefUptime = griefUptime;
        this.griefUptimeValue = griefUptimeValue;
        this.lastSorrowUptime = lastSorrowUptime;
        this.lastSorrowUptimeValue = lastSorrowUptimeValue;
        this.focusStacks = focusStacks;
        this.focusStacksValue = focusStacksValue;
        this.potentialChargeKills = potentialChargeKills;
        this.potentialChargeKillsValue = potentialChargeKillsValue;
        this.griefControl = /** @type {HTMLElement|null} */ (griefUptime?.closest('.damage-uptime') ?? null);
        this.lastSorrowControl = /** @type {HTMLElement|null} */ (lastSorrowUptime?.closest('.damage-uptime') ?? null);
        this.focusControl = /** @type {HTMLElement|null} */ (focusStacks?.closest('.damage-uptime') ?? null);
        this.potentialChargeControl = /** @type {HTMLElement|null} */ (potentialChargeKills?.closest('.damage-uptime') ?? null);
        this.onChange = onChange;
    }

    /** Collega gli eventi dei controlli. */
    mount() {
        this.button?.addEventListener('click', () => this.togglePanel());

        this.slowAttack?.addEventListener('change', () => {
            this.updateSlowInput();
            this.emit();
        });

        this.slowAttackValue?.addEventListener('input', () => this.emit());
        this.useBurst?.addEventListener('change', () => this.emit());

        this.griefUptime?.addEventListener('input', () => {
            this.updateUptimeLabel(this.griefUptime, this.griefUptimeValue);
            this.emit();
        });

        this.lastSorrowUptime?.addEventListener('input', () => {
            this.updateUptimeLabel(this.lastSorrowUptime, this.lastSorrowUptimeValue);
            this.emit();
        });

        this.focusStacks?.addEventListener('input', () => {
            this.updateFocusLabel();
            this.emit();
        });

        this.potentialChargeKills?.addEventListener('input', () => {
            this.updatePotentialChargeLabel();
            this.emit();
        });

        // Overlay: chiude cliccando fuori o premendo Escape.
        document.addEventListener('click', event => {
            if (!this.panel || this.panel.hidden) return;

            const target = event.target;
            if (!(target instanceof Node)) return;
            if (this.panel.contains(target) || this.button?.contains(target)) return;

            this.closePanel();
        });

        document.addEventListener('keydown', event => {
            if (event.key === 'Escape') this.closePanel();
        });

        this.updateSlowInput();
        this.updateUptimeLabel(this.griefUptime, this.griefUptimeValue);
        this.updateUptimeLabel(this.lastSorrowUptime, this.lastSorrowUptimeValue);
        this.updateFocusLabel();
        this.updatePotentialChargeLabel();
    }

    togglePanel() {
        if (!this.panel) return;

        if (this.panel.hidden) {
            this.openPanel();
        } else {
            this.closePanel();
        }
    }

    openPanel() {
        if (!this.panel) return;

        this.panel.hidden = false;
        this.button?.setAttribute('aria-expanded', 'true');
    }

    closePanel() {
        if (!this.panel || this.panel.hidden) return;

        this.panel.hidden = true;
        this.button?.setAttribute('aria-expanded', 'false');
    }

    updateSlowInput() {
        if (!this.slowAttackValue) return;

        const enabled = this.slowAttack?.checked ?? false;
        this.slowAttackValue.hidden = !enabled;
        this.slowAttackValue.disabled = !enabled;
    }

    /**
     * @param {HTMLInputElement|null} input
     * @param {HTMLElement|null} valueEl
     */
    updateUptimeLabel(input, valueEl) {
        if (!valueEl) return;

        const value = Number.parseFloat(input?.value ?? '100');
        valueEl.textContent = `${Number.isFinite(value) ? value : 100}%`;
    }

    updateFocusLabel() {
        if (!this.focusStacksValue || !this.focusStacks) return;

        const value = Number.parseFloat(this.focusStacks.value);
        const max = Number.parseFloat(this.focusStacks.max);
        this.focusStacksValue.textContent = `${value} / ${max}`;
    }

    /**
     * Imposta il massimo dello slider Focus in base a Focus Capacity.
     * @param {number} maxStacks
     */
    configureFocusSlider(maxStacks) {
        if (!this.focusStacks) return;

        this.focusStacks.max = String(maxStacks);

        const value = Number.parseFloat(this.focusStacks.value);
        if (Number.isFinite(value) && value > maxStacks) {
            this.focusStacks.value = String(maxStacks);
        }

        this.updateFocusLabel();
    }

    updatePotentialChargeLabel() {
        if (!this.potentialChargeKillsValue || !this.potentialChargeKills) return;

        const value = Number.parseFloat(this.potentialChargeKills.value);
        const max = Number.parseFloat(this.potentialChargeKills.max);
        this.potentialChargeKillsValue.textContent = `${value} / ${max}`;
    }

    /**
     * Sposta lo slider Kills dentro la sezione Burst DPS.
     * @param {HTMLElement|null} container
     * @param {boolean} visible
     */
    placePotentialChargeControl(container, visible) {
        if (!this.potentialChargeControl) return;

        if (visible && container) {
            if (this.potentialChargeControl.parentElement !== container) {
                container.prepend(this.potentialChargeControl);
            }
            this.potentialChargeControl.hidden = false;
        } else {
            this.potentialChargeControl.hidden = true;
        }
    }

    /**
     * Sposta gli slider uptime dentro la sezione Damage Multiplier.
     * @param {HTMLElement|null} container
     * @param {{grief: boolean, lastSorrow: boolean, focus: boolean}} visible
     */
    placeUptimeControls(container, visible) {
        // Ordine finale: Grief, Last Sorrow, Focus.
        this.placeUptimeControl(this.focusControl, container, visible.focus);
        this.placeUptimeControl(this.lastSorrowControl, container, visible.lastSorrow);
        this.placeUptimeControl(this.griefControl, container, visible.grief);
    }

    /**
     * @param {HTMLElement|null} control
     * @param {HTMLElement|null} container
     * @param {boolean} visible
     */
    placeUptimeControl(control, container, visible) {
        if (!control) return;

        if (visible && container) {
            if (control.parentElement !== container) {
                container.prepend(control);
            }
            control.hidden = false;
        } else {
            control.hidden = true;
        }
    }

    /** @returns {DamageSettings} */
    getSettings() {
        const slowAttack = this.slowAttack?.checked ?? false;
        const parsed = Number.parseFloat(this.slowAttackValue?.value ?? '');
        const griefUptime = Number.parseFloat(this.griefUptime?.value ?? '100');
        const lastSorrowUptime = Number.parseFloat(this.lastSorrowUptime?.value ?? '100');
        const focusStacks = Number.parseFloat(this.focusStacks?.value ?? '0');
        const potentialChargeKills = Number.parseFloat(this.potentialChargeKills?.value ?? '0');

        return {
            slowAttack,
            attackInterval: slowAttack && Number.isFinite(parsed) && parsed > 0 ? parsed : null,
            useBurst: this.useBurst?.checked ?? false,
            griefUptime: Number.isFinite(griefUptime) ? griefUptime : 100,
            lastSorrowUptime: Number.isFinite(lastSorrowUptime) ? lastSorrowUptime : 100,
            focusStacks: Number.isFinite(focusStacks) ? focusStacks : 0,
            potentialChargeKills: Number.isFinite(potentialChargeKills) ? potentialChargeKills : 0
        };
    }

    emit() {
        this.onChange(this.getSettings());
    }
}
