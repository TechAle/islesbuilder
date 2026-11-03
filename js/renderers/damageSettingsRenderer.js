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
 * @property {(settings: DamageSettings) => void} onChange
 */

/**
 * Renderer del pannello impostazioni di Damage Overview.
 * Non calcola nulla: legge i controlli e notifica le impostazioni.
 */
export class DamageSettingsRenderer {
    /** @param {DamageSettingsRendererOptions} options */
    constructor({ button, panel, slowAttack, slowAttackValue, useBurst, griefUptime, griefUptimeValue, onChange }) {
        this.button = button;
        this.panel = panel;
        this.slowAttack = slowAttack;
        this.slowAttackValue = slowAttackValue;
        this.useBurst = useBurst;
        this.griefUptime = griefUptime;
        this.griefUptimeValue = griefUptimeValue;
        this.griefControl = /** @type {HTMLElement|null} */ (griefUptime?.closest('.grief-uptime') ?? null);
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
            this.updateGriefLabel();
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
        this.updateGriefLabel();
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

    updateGriefLabel() {
        if (!this.griefUptimeValue) return;

        const value = Number.parseFloat(this.griefUptime?.value ?? '100');
        this.griefUptimeValue.textContent = `${Number.isFinite(value) ? value : 100}%`;
    }

    /**
     * Sposta lo slider Grief dentro la sezione Damage Multiplier.
     * @param {HTMLElement|null} container
     * @param {boolean} visible
     */
    placeGriefUptime(container, visible) {
        if (!this.griefControl) return;

        if (visible && container) {
            if (this.griefControl.parentElement !== container) {
                container.prepend(this.griefControl);
            }
            this.griefControl.hidden = false;
        } else {
            this.griefControl.hidden = true;
        }
    }

    /** @returns {DamageSettings} */
    getSettings() {
        const slowAttack = this.slowAttack?.checked ?? false;
        const parsed = Number.parseFloat(this.slowAttackValue?.value ?? '');
        const griefUptime = Number.parseFloat(this.griefUptime?.value ?? '100');

        return {
            slowAttack,
            attackInterval: slowAttack && Number.isFinite(parsed) && parsed > 0 ? parsed : null,
            useBurst: this.useBurst?.checked ?? false,
            griefUptime: Number.isFinite(griefUptime) ? griefUptime : 100
        };
    }

    emit() {
        this.onChange(this.getSettings());
    }
}
