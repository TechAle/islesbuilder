/**
 * @typedef {import('../modules/enemySimulator.js').EnemySimulationAbility} EnemySimulationAbility
 * @typedef {import('../data/monsters.js').MonsterPreset} MonsterPreset
 */

import { getDefaultDamagePercent } from '../data/monsters.js';

/**
 * Renderer della schermata Enemy Simulator.
 */
export class EnemySimulatorRenderer {
    /**
     * @param {Object} options
     * @param {Document|HTMLElement} options.root
     * @param {MonsterPreset[]} [options.monsters]
     * @param {() => void} options.onSimulate
     */
    constructor({ root, monsters = [], onSimulate }) {
        this.root = root;
        this.onSimulate = onSimulate;
        this.monsters = monsters;
        this.healthInput = this.getElementById('enemy-hp');
        this.defenseInput = this.getElementById('enemy-defense');
        this.damageInput = this.getElementById('enemy-damage-percent');
        this.presetSelect = this.getElementById('enemy-preset');
        this.results = this.getElementById('enemy-results');
        this.overviewView = this.getElementById('damage-overview-view');
        this.enemyView = this.getElementById('damage-enemy-view');
        this.tabs = Array.from(this.root.querySelectorAll('[data-damage-view]'));
        /** @type {string} */
        this.selectedMonsterId = 'custom';
        /** @type {string|null} */
        this.lastElement = null;
    }

    /** Collega eventi di tab e input. */
    mount() {
        this.tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const view = /** @type {HTMLElement} */ (tab).dataset.damageView;
                this.setView(view === 'enemy' ? 'enemy' : 'overview');
            });
        });

        if (this.presetSelect) {
            this.presetSelect.innerHTML = [
                '<option value="custom">Custom</option>',
                ...this.monsters.map(monster => (
                    `<option value="${monster.id}">${monster.name}</option>`
                ))
            ].join('');

            this.presetSelect.addEventListener('change', () => {
                this.applyPreset(/** @type {HTMLSelectElement} */ (this.presetSelect).value);
            });
        }

        [this.healthInput, this.defenseInput, this.damageInput].forEach(input => {
            input?.addEventListener('input', () => this.onSimulate());
        });
    }

    /**
     * Applica un preset mostro.
     * @param {string} id
     */
    applyPreset(id) {
        this.selectedMonsterId = id;
        const monster = this.getSelectedMonster();

        if (!monster) {
            this.setDamagePercent(0);
            this.onSimulate();
            return;
        }

        if (this.healthInput) {
            /** @type {HTMLInputElement} */ (this.healthInput).value = String(monster.health);
        }
        if (this.defenseInput) {
            /** @type {HTMLInputElement} */ (this.defenseInput).value = String(monster.defense);
        }

        this.setDamagePercent(getDefaultDamagePercent(monster, this.lastElement));
        this.onSimulate();
    }

    /**
     * Aggiorna il Damage% di default quando cambia l'elemento dell'arma.
     * @param {string|null|undefined} element
     */
    syncElement(element) {
        const normalized = String(element ?? '').trim().toLowerCase() || null;
        if (normalized === this.lastElement) return;

        this.lastElement = normalized;
        const monster = this.getSelectedMonster();
        if (monster) {
            this.setDamagePercent(getDefaultDamagePercent(monster, normalized));
        }
    }

    /** @returns {MonsterPreset|null} */
    getSelectedMonster() {
        return this.monsters.find(monster => monster.id === this.selectedMonsterId) ?? null;
    }

    /** @param {number} value */
    setDamagePercent(value) {
        if (!this.damageInput) return;
        /** @type {HTMLInputElement} */ (this.damageInput).value = String(value);
    }

    /**
     * @param {'overview'|'enemy'} view
     */
    setView(view) {
        const isEnemy = view === 'enemy';
        if (this.overviewView) this.overviewView.hidden = isEnemy;
        if (this.enemyView) this.enemyView.hidden = !isEnemy;

        this.tabs.forEach(tab => {
            const active = /** @type {HTMLElement} */ (tab).dataset.damageView === view;
            tab.classList.toggle('active', active);
        });

        if (isEnemy) this.onSimulate();
    }

    /**
     * @returns {{health: number, defense: number, damagePercent: number}}
     */
    getInputs() {
        const read = (/** @type {HTMLElement|null} */ input) => {
            const value = Number.parseFloat(String(
                /** @type {HTMLInputElement|null} */ (input)?.value ?? ''
            ).replace(',', '.'));
            return Number.isFinite(value) ? value : 0;
        };

        return {
            health: Math.max(0, read(this.healthInput)),
            defense: Math.max(0, read(this.defenseInput)),
            damagePercent: read(this.damageInput)
        };
    }

    /**
     * @param {import('../modules/enemySimulator.js').EnemySimulationResult} result
     */
    render(result) {
        const root = this.results;
        if (!root) return;

        if (result.health <= 0) {
            root.innerHTML = '<div class="damage-empty">Inserisci la vita del nemico.</div>';
            return;
        }

        const format = (/** @type {number} */ value) => Number.isFinite(value)
            ? value.toLocaleString('it-IT', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            })
            : '∞';

        const formatInteger = (/** @type {number} */ value) => Number.isFinite(value)
            ? Math.round(value).toLocaleString('it-IT')
            : '∞';

        const formatSignedPercent = (/** @type {number} */ value) => (
            `${value > 0 ? '+' : ''}${format(value)}%`
        );

        const formatTime = (/** @type {number} */ value) => {
            if (!Number.isFinite(value)) return '∞';
            if (value >= 60) {
                const minutes = Math.floor(value / 60);
                const seconds = value - minutes * 60;
                return `${minutes}m ${format(seconds)}s`;
            }
            return `${format(value)} s`;
        };

        /** @type {Array<{label: string, value: string, help?: string}>} */
        const rows = [];

        if (result.oneshot) {
            rows.push({ label: 'Real Damage', value: format(result.realFirstHitDamage) });
            rows.push({ label: 'Enemy HP', value: format(result.health) });
            rows.push({ label: 'Enemy Defense', value: format(result.defense) });
            rows.push({ label: 'Raw Damage', value: format(result.firstHitDamage) });
        } else {
            rows.push({ label: 'Time to Kill', value: formatTime(result.timeToKill) });
            rows.push({ label: 'Real DPS', value: format(result.realDps) });
            rows.push({
                label: 'Real Damage / Hit',
                value: format(result.realFirstHitDamage),
                help: 'Danno del primo colpo, senza gli effetti che richiedono un hit precedente.'
            });
            rows.push({ label: 'Raw DPS', value: format(result.dps) });
            rows.push({
                label: 'Potions Needed',
                value: formatInteger(result.potionsNeeded),
                help: 'Pozioni da 25 energia necessarie per sostenere il combattimento.'
            });
            rows.push({
                label: 'Right-click Casts',
                value: result.abilities.length > 0
                    ? result.abilities
                        .map((/** @type {{name: string, casts: number}} */ ability) => `${ability.name} × ${formatInteger(ability.casts)}`)
                        .join(', ')
                    : '—'
            });
        }

        if (result.defenseReductionPercent > 0) {
            rows.push({
                label: 'Defense Reduction',
                value: `-${format(result.defenseReductionPercent)}%`,
                help: 'Riduzione della difesa nemica da Poisoned Potatoes, Deteriorate e Toxic Gas.'
            });
            rows.push({
                label: 'Effective Defense',
                value: format(result.effectiveDefense)
            });
            if (result.defenseReductionRampHits > 0) {
                rows.push({
                    label: 'Ramp Hits',
                    value: formatInteger(result.defenseReductionRampHits),
                    help: 'Prime hit senza riduzione della difesa (Deteriorate).'
                });
            }
        }

        if (result.damagePercent !== 0) {
            rows.push({
                label: 'Damage%',
                value: formatSignedPercent(result.damagePercent),
                help: 'Danno extra applicato prima della difesa del nemico.'
            });
        }

        const banner = result.oneshot
            ? '<div class="enemy-result-banner enemy-result-banner--oneshot">ONESHOT</div>'
            : `<div class="enemy-result-banner">Kill in ${formatTime(result.timeToKill)}</div>`;

        const cooldownNote = result.potionCooldownEnough
            ? ''
            : '<div class="enemy-warning">Pozioni insufficienti: il cooldown non permette di sostenere il combattimento.</div>';

        root.innerHTML = `
            ${banner}
            ${rows.map(row => `
                <div class="stat-row">
                    <span class="stat-label${row.help ? ' stat-label--help' : ''}">${row.label}:${row.help
                        ? `<span class="setting-help stat-help" tabindex="0" data-tooltip="${row.help}">?</span>`
                        : ''}</span>
                    <span class="stat-val">${row.value}</span>
                </div>
            `).join('')}
            ${cooldownNote}
        `;
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
