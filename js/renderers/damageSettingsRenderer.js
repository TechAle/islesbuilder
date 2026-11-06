import { CheckboxControl, SliderControl } from './controls.js';

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
 * @property {HTMLInputElement|null} crystalExplosionOverride
 * @property {HTMLInputElement|null} crystalExplosions
 * @property {HTMLElement|null} crystalExplosionsValue
 * @property {HTMLElement|null} specialAttacksRow
 * @property {HTMLElement|null} specialAttacksContainer
 * @property {(settings: DamageSettings) => void} onChange
 */

/**
 * Renderer del pannello impostazioni di Damage Overview.
 * Non calcola nulla: legge i controlli e notifica le impostazioni.
 */
export class DamageSettingsRenderer {
    /** @param {DamageSettingsRendererOptions} options */
    constructor(options) {
        this.button = options.button;
        this.panel = options.panel;
        this.slowAttack = options.slowAttack;
        this.slowAttackValue = options.slowAttackValue;
        this.useBurst = options.useBurst;
        this.crystalExplosionOverride = options.crystalExplosionOverride;
        this.specialAttacksRow = options.specialAttacksRow;
        this.specialAttacksContainer = options.specialAttacksContainer;
        this.onChange = options.onChange;

        /** @type {Set<string>} */
        this.disabledSpecialAttacks = new Set();
        /** @type {Map<string, number>} */
        this.abilityCooldownOverrides = new Map();
        this.specialAttackSignature = '';

        this.griefControl = /** @type {HTMLElement|null} */ (options.griefUptime?.closest('.damage-uptime') ?? null);
        this.lastSorrowControl = /** @type {HTMLElement|null} */ (options.lastSorrowUptime?.closest('.damage-uptime') ?? null);
        this.focusControl = /** @type {HTMLElement|null} */ (options.focusStacks?.closest('.damage-uptime') ?? null);
        this.potentialChargeControl = /** @type {HTMLElement|null} */ (options.potentialChargeKills?.closest('.damage-uptime') ?? null);
        this.crystalExplosionsControl = /** @type {HTMLElement|null} */ (options.crystalExplosions?.closest('.damage-uptime') ?? null);

        const emit = () => this.emit();

        this.griefSlider = new SliderControl({
            input: options.griefUptime,
            valueEl: options.griefUptimeValue,
            onChange: emit,
            format: value => `${value}%`
        });
        this.lastSorrowSlider = new SliderControl({
            input: options.lastSorrowUptime,
            valueEl: options.lastSorrowUptimeValue,
            onChange: emit,
            format: value => `${value}%`
        });
        this.focusSlider = new SliderControl({
            input: options.focusStacks,
            valueEl: options.focusStacksValue,
            onChange: emit
        });
        this.potentialChargeSlider = new SliderControl({
            input: options.potentialChargeKills,
            valueEl: options.potentialChargeKillsValue,
            onChange: emit
        });
        this.crystalExplosionSlider = new SliderControl({
            input: options.crystalExplosions,
            valueEl: options.crystalExplosionsValue,
            onChange: emit
        });

        this.sliders = [
            this.griefSlider,
            this.lastSorrowSlider,
            this.focusSlider,
            this.potentialChargeSlider,
            this.crystalExplosionSlider
        ];

        this.checkboxes = [
            new CheckboxControl({ input: options.useBurst, onChange: emit }),
            new CheckboxControl({ input: options.crystalExplosionOverride, onChange: emit })
        ];
    }

    /** Collega gli eventi dei controlli. */
    mount() {
        this.button?.addEventListener('click', () => this.togglePanel());

        this.slowAttack?.addEventListener('change', () => {
            this.updateSlowInput();
            this.emit();
        });

        this.slowAttackValue?.addEventListener('input', () => this.emit());

        this.sliders.forEach(slider => slider.mount());
        this.checkboxes.forEach(checkbox => checkbox.mount());

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
     * Imposta il massimo dello slider Focus in base a Focus Capacity.
     * @param {number} maxStacks
     */
    configureFocusSlider(maxStacks) {
        this.focusSlider.setMax(maxStacks);
    }

    /**
     * @param {number} maxExplosions
     */
    configureCrystalExplosionSlider(maxExplosions) {
        this.crystalExplosionSlider.setMax(maxExplosions);
    }

    /**
     * Sposta gli slider uptime dentro la sezione Damage Multiplier.
     * @param {HTMLElement|null} container
     * @param {{grief: boolean, lastSorrow: boolean, focus: boolean}} visible
     */
    placeUptimeControls(container, visible) {
        this.placeControl(this.focusControl, container, visible.focus);
        this.placeControl(this.lastSorrowControl, container, visible.lastSorrow);
        this.placeControl(this.griefControl, container, visible.grief);
    }

    /**
     * @param {HTMLElement|null} container
     * @param {boolean} visible
     */
    placePotentialChargeControl(container, visible) {
        this.placeControl(this.potentialChargeControl, container, visible);
    }

    /**
     * @param {HTMLElement|null} container
     * @param {boolean} visible
     */
    placeCrystalExplosionsControl(container, visible) {
        this.placeControl(this.crystalExplosionsControl, container, visible);
    }

    /**
     * @param {HTMLElement|null} control
     * @param {HTMLElement|null} container
     * @param {boolean} visible
     */
    placeControl(control, container, visible) {
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
    /**
     * Aggiorna le checkbox e gli slider cooldown delle special attack onClick.
     * @param {Array<{name: string, ability: string, key?: string|null, damagePercent: number, baseCooldown: number, cooldown: number}>} abilities
     */
    configureSpecialAttacks(abilities) {
        const row = this.specialAttacksRow;
        const container = this.specialAttacksContainer;
        if (!row || !container) return;

        const list = (abilities ?? []).filter(ability => ability.damagePercent > 0);
        const signature = list
            .map(ability => `${ability.name}:${ability.ability}:${ability.baseCooldown}`)
            .join('|');

        if (signature === this.specialAttackSignature) return;
        this.specialAttackSignature = signature;

        const validNames = new Set(list.map(ability => ability.name));
        this.disabledSpecialAttacks.forEach(name => {
            if (!validNames.has(name)) this.disabledSpecialAttacks.delete(name);
        });
        this.abilityCooldownOverrides.forEach((_, name) => {
            if (!validNames.has(name)) this.abilityCooldownOverrides.delete(name);
        });

        container.innerHTML = '';

        list.forEach(ability => {
            const duplicates = list.filter(entry => entry.ability === ability.ability).length > 1;
            const keyLabel = ability.key === 'rightClick'
                ? 'Right Click'
                : (ability.key === 'f' ? 'F' : '');
            const labelText = duplicates && keyLabel
                ? `${ability.ability} (${keyLabel})`
                : ability.ability;

            const wrapper = document.createElement('div');
            wrapper.className = 'setting-ability';

            const label = document.createElement('label');
            label.className = 'setting-check';

            const input = document.createElement('input');
            input.type = 'checkbox';
            input.checked = !this.disabledSpecialAttacks.has(ability.name);

            label.appendChild(input);
            label.appendChild(document.createTextNode(` ${labelText}`));
            wrapper.appendChild(label);

            const cooldownRow = document.createElement('div');
            cooldownRow.className = 'setting-ability-cooldown';
            cooldownRow.hidden = !input.checked;

            const cooldownLabel = document.createElement('span');
            cooldownLabel.textContent = 'Override ability cooldown';

            const cooldownInput = document.createElement('input');
            cooldownInput.type = 'range';
            cooldownInput.min = String(ability.baseCooldown);
            cooldownInput.max = String(ability.baseCooldown * 5);
            cooldownInput.step = '0.1';
            cooldownInput.value = String(
                this.abilityCooldownOverrides.get(ability.name) ?? ability.baseCooldown
            );

            const cooldownValue = document.createElement('span');
            cooldownValue.className = 'setting-ability-cooldown-value';

            const slider = new SliderControl({
                input: cooldownInput,
                valueEl: cooldownValue,
                onChange: () => {
                    this.abilityCooldownOverrides.set(ability.name, slider.value);
                    this.emit();
                },
                format: value => `${value.toFixed(2)}s`
            });

            slider.mount();

            input.addEventListener('change', () => {
                if (input.checked) {
                    this.disabledSpecialAttacks.delete(ability.name);
                } else {
                    this.disabledSpecialAttacks.add(ability.name);
                }
                cooldownRow.hidden = !input.checked;
                this.emit();
            });

            cooldownRow.appendChild(cooldownLabel);
            cooldownRow.appendChild(cooldownInput);
            cooldownRow.appendChild(cooldownValue);
            wrapper.appendChild(cooldownRow);
            container.appendChild(wrapper);
        });

        row.hidden = list.length === 0;
    }

    getSettings() {
        const slowAttack = this.slowAttack?.checked ?? false;
        const parsed = Number.parseFloat(this.slowAttackValue?.value ?? '');

        return {
            slowAttack,
            attackInterval: slowAttack && Number.isFinite(parsed) && parsed > 0 ? parsed : null,
            useBurst: this.useBurst?.checked ?? false,
            griefUptime: this.griefSlider.value,
            lastSorrowUptime: this.lastSorrowSlider.value,
            focusStacks: this.focusSlider.value,
            potentialChargeKills: this.potentialChargeSlider.value,
            crystalExplosionOverride: this.crystalExplosionOverride?.checked ?? false,
            crystalExplosionsPerSecond: this.crystalExplosionSlider.value,
            disabledSpecialAttacks: [...this.disabledSpecialAttacks],
            abilityCooldownOverrides: Object.fromEntries(this.abilityCooldownOverrides)
        };
    }

    emit() {
        this.onChange(this.getSettings());
    }
}
