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
 * @property {HTMLInputElement|null} executionHp
 * @property {HTMLElement|null} executionHpValue
 * @property {HTMLInputElement|null} prosecutionHp
 * @property {HTMLElement|null} prosecutionHpValue
 * @property {HTMLInputElement|null} enragedHp
 * @property {HTMLElement|null} enragedHpValue
 * @property {HTMLInputElement|null} infectedHits
 * @property {HTMLElement|null} infectedHitsValue
 * @property {HTMLInputElement|null} deathburstKills
 * @property {HTMLElement|null} deathburstKillsValue
 * @property {HTMLInputElement|null} calculatedStrikeKills
 * @property {HTMLElement|null} calculatedStrikeKillsValue
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
        /** @type {Map<string, number>} */
        this.abilityHitCountOverrides = new Map();
        /** @type {Map<string, number>} */
        this.abilityDamageOverrides = new Map();
        this.specialAttackSignature = '';

        this.griefControl = /** @type {HTMLElement|null} */ (options.griefUptime?.closest('.damage-uptime') ?? null);
        this.lastSorrowControl = /** @type {HTMLElement|null} */ (options.lastSorrowUptime?.closest('.damage-uptime') ?? null);
        this.focusControl = /** @type {HTMLElement|null} */ (options.focusStacks?.closest('.damage-uptime') ?? null);
        this.potentialChargeControl = /** @type {HTMLElement|null} */ (options.potentialChargeKills?.closest('.damage-uptime') ?? null);
        this.crystalExplosionsControl = /** @type {HTMLElement|null} */ (options.crystalExplosions?.closest('.damage-uptime') ?? null);
        this.executionHpControl = /** @type {HTMLElement|null} */ (options.executionHp?.closest('.damage-uptime') ?? null);
        this.prosecutionHpControl = /** @type {HTMLElement|null} */ (options.prosecutionHp?.closest('.damage-uptime') ?? null);
        this.enragedHpControl = /** @type {HTMLElement|null} */ (options.enragedHp?.closest('.damage-uptime') ?? null);
        this.infectedHitsControl = /** @type {HTMLElement|null} */ (options.infectedHits?.closest('.damage-uptime') ?? null);
        this.deathburstKillsControl = /** @type {HTMLElement|null} */ (options.deathburstKills?.closest('.damage-uptime') ?? null);
        this.calculatedStrikeKillsControl = /** @type {HTMLElement|null} */ (options.calculatedStrikeKills?.closest('.damage-uptime') ?? null);
        this.slowAttackControl = /** @type {HTMLElement|null} */ (options.slowAttack?.closest('.setting-row') ?? null);
        this.burstControl = /** @type {HTMLElement|null} */ (options.useBurst?.closest('.setting-row') ?? null);

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
        this.executionHpSlider = new SliderControl({
            input: options.executionHp,
            valueEl: options.executionHpValue,
            onChange: emit,
            format: value => `${value}%`
        });
        this.prosecutionHpSlider = new SliderControl({
            input: options.prosecutionHp,
            valueEl: options.prosecutionHpValue,
            onChange: emit,
            format: value => `${value}%`
        });
        this.enragedHpSlider = new SliderControl({
            input: options.enragedHp,
            valueEl: options.enragedHpValue,
            onChange: emit,
            format: value => `${value}%`
        });
        this.infectedHitsSlider = new SliderControl({
            input: options.infectedHits,
            valueEl: options.infectedHitsValue,
            onChange: emit,
            format: value => value > 0 ? String(value) : 'Auto'
        });
        this.deathburstKillsSlider = new SliderControl({
            input: options.deathburstKills,
            valueEl: options.deathburstKillsValue,
            onChange: emit,
            format: value => String(value)
        });
        this.calculatedStrikeKillsSlider = new SliderControl({
            input: options.calculatedStrikeKills,
            valueEl: options.calculatedStrikeKillsValue,
            onChange: emit
        });

        this.sliders = [
            this.griefSlider,
            this.lastSorrowSlider,
            this.focusSlider,
            this.potentialChargeSlider,
            this.crystalExplosionSlider,
            this.executionHpSlider,
            this.prosecutionHpSlider,
            this.enragedHpSlider,
            this.infectedHitsSlider,
            this.deathburstKillsSlider,
            this.calculatedStrikeKillsSlider
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
     * @param {HTMLElement|null} container
     * @param {{executionHp: boolean, prosecutionHp: boolean, enragedHp: boolean, infected: boolean, deathburst: boolean}} visible
     */
    placeAugmentControls(container, visible) {
        // placeControl usa prepend: inseriamo in ordine inverso per ottenere
        // Execution HP%, Prosecution HP%, Enraged HP%, Infected, Deathburst.
        this.placeControl(this.deathburstKillsControl, container, visible.deathburst);
        this.placeControl(this.infectedHitsControl, container, visible.infected);
        this.placeControl(this.enragedHpControl, container, visible.enragedHp);
        this.placeControl(this.prosecutionHpControl, container, visible.prosecutionHp);
        this.placeControl(this.executionHpControl, container, visible.executionHp);
    }

    /**
     * @param {HTMLElement|null} container
     */
    placeSlowAttackControl(container) {
        this.placeControl(this.slowAttackControl, container, true);
    }

    /**
     * @param {HTMLElement|null} container
     * @param {boolean} visible
     */
    placeCalculatedStrikeControl(container, visible) {
        this.placeControl(this.calculatedStrikeKillsControl, container, visible);
    }

    /**
     * @param {HTMLElement|null} container
     */
    placeBurstControl(container) {
        this.placeControl(this.burstControl, container, true);
    }

    /**
     * @param {HTMLElement|null} container
     */
    placeSpecialAttacksControl(container) {
        const visible = !!this.specialAttacksRow && !this.specialAttacksRow.hidden;
        this.placeControl(this.specialAttacksRow, container, visible);
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

    /**
     * Aggiorna i controlli delle special attack onClick.
     * @param {Array<{
     *   name: string,
     *   ability: string,
     *   key?: string|null,
     *   damagePercent: number,
     *   times: number,
     *   baseCooldown: number,
     *   cooldown: number,
     *   extraHitsPerSecond?: number,
     *   damageTakenIncreasePercent?: number,
     *   minHits?: number|null,
     *   maxHits?: number|null,
     *   minDamage?: number|null,
     *   maxDamage?: number|null
     * }>} abilities
     */
    configureSpecialAttacks(abilities) {
        const row = this.specialAttacksRow;
        const container = this.specialAttacksContainer;
        if (!row || !container) return;

        const list = (abilities ?? []).filter(ability => (
            ability.damagePercent > 0
            || (ability.extraHitsPerSecond ?? 0) > 0
            || (ability.damageTakenIncreasePercent ?? 0) > 0
            || typeof ability.minDamage === 'number'
        ));
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
        this.abilityHitCountOverrides.forEach((_, name) => {
            if (!validNames.has(name)) this.abilityHitCountOverrides.delete(name);
        });
        this.abilityDamageOverrides.forEach((_, name) => {
            if (!validNames.has(name)) this.abilityDamageOverrides.delete(name);
        });

        container.innerHTML = '';

        list.forEach(ability => {
            const wrapper = document.createElement('div');
            wrapper.className = 'setting-ability';

            const label = document.createElement('label');
            label.className = 'setting-check';

            const input = document.createElement('input');
            input.type = 'checkbox';
            input.checked = !this.disabledSpecialAttacks.has(ability.name);

            label.appendChild(input);
            label.appendChild(document.createTextNode(` Slow special — ${ability.ability}`));
            wrapper.appendChild(label);

            /** @type {HTMLElement[]} */
            const parameterRows = [];

            /**
             * @param {Object} options
             * @param {string} options.labelText
             * @param {number} options.min
             * @param {number} options.max
             * @param {number} options.step
             * @param {number} options.value
             * @param {(value: number) => string} options.format
             * @param {(value: number) => void} options.onInput
             */
            const addSlider = ({ labelText, min, max, step, value, format, onInput }) => {
                const sliderRow = document.createElement('div');
                sliderRow.className = 'setting-ability-cooldown';
                sliderRow.hidden = !input.checked;

                const sliderLabel = document.createElement('span');
                sliderLabel.textContent = labelText;

                const sliderInput = document.createElement('input');
                sliderInput.type = 'range';
                sliderInput.min = String(min);
                sliderInput.max = String(max);
                sliderInput.step = String(step);
                sliderInput.value = String(value);

                const sliderValue = document.createElement('span');
                sliderValue.className = 'setting-ability-cooldown-value';

                const slider = new SliderControl({
                    input: sliderInput,
                    valueEl: sliderValue,
                    onChange: () => {
                        onInput(slider.value);
                        this.emit();
                    },
                    format
                });

                slider.mount();
                sliderRow.appendChild(sliderLabel);
                sliderRow.appendChild(sliderInput);
                sliderRow.appendChild(sliderValue);
                wrapper.appendChild(sliderRow);
                parameterRows.push(sliderRow);
            };

            addSlider({
                labelText: 'Override ability cooldown',
                min: ability.baseCooldown,
                max: ability.baseCooldown * 10,
                step: 0.1,
                value: this.abilityCooldownOverrides.get(ability.name) ?? ability.baseCooldown,
                format: value => `${value.toFixed(2)}s`,
                onInput: value => this.abilityCooldownOverrides.set(ability.name, value)
            });

            if (typeof ability.minHits === 'number' && typeof ability.maxHits === 'number') {
                addSlider({
                    labelText: 'Hits',
                    min: ability.minHits,
                    max: ability.maxHits,
                    step: 1,
                    value: this.abilityHitCountOverrides.get(ability.name) ?? ability.times,
                    format: value => String(Math.round(value)),
                    onInput: value => this.abilityHitCountOverrides.set(ability.name, value)
                });
            }

            if (typeof ability.minDamage === 'number' && typeof ability.maxDamage === 'number') {
                addSlider({
                    labelText: 'Damage %',
                    min: ability.minDamage,
                    max: ability.maxDamage,
                    step: 1,
                    value: this.abilityDamageOverrides.get(ability.name) ?? ability.damagePercent,
                    format: value => `${Math.round(value)}%`,
                    onInput: value => this.abilityDamageOverrides.set(ability.name, value)
                });
            }

            input.addEventListener('change', () => {
                if (input.checked) {
                    this.disabledSpecialAttacks.delete(ability.name);
                } else {
                    this.disabledSpecialAttacks.add(ability.name);
                }
                parameterRows.forEach(parameterRow => {
                    parameterRow.hidden = !input.checked;
                });
                this.emit();
            });

            container.appendChild(wrapper);
        });

        row.hidden = list.length === 0;
    }

    /** @returns {DamageSettings} */
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
            abilityCooldownOverrides: Object.fromEntries(this.abilityCooldownOverrides),
            abilityHitCountOverrides: Object.fromEntries(this.abilityHitCountOverrides),
            abilityDamageOverrides: Object.fromEntries(this.abilityDamageOverrides),
            executionHpPercent: this.executionHpSlider.value,
            prosecutionHpPercent: this.prosecutionHpSlider.value,
            enragedHpPercent: this.enragedHpSlider.value,
            infectedHitsOverride: this.infectedHitsSlider.value,
            deathburstKillsPerSecond: this.deathburstKillsSlider.value,
            calculatedStrikeKillsPerSecond: this.calculatedStrikeKillsSlider.value
        };
    }

    emit() {
        this.onChange(this.getSettings());
    }
}
