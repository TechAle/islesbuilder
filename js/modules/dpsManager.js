import { createDamageContext, runDamagePipeline, DAMAGE_STEPS } from './damage/damagePipeline.js';
import { computeEnergyState, getSustainLabel } from './damage/energy.js';
import { SpecialAbilityManager } from './specialAbilityManager.js';

/** @typedef {import('../data/types.js').DamageResult} DamageResult */
/** @typedef {import('../data/types.js').DamageContext} DamageContext */

/**
 * Logica del calcolo danni/DPS. Non tocca il DOM: la visualizzazione sarà
 * responsabilità di un renderer dedicato.
 *
 * Il calcolo è una pipeline di step (vedi `damagePipeline.js`); questo manager
 * si limita a creare il contesto, eseguire gli step e conservare i risultati.
 */
export class DpsManager {
    /**
     * @param {Object} [options]
     * @param {SpecialAbilityManager} [options.specialAbilityManager]
     */
    constructor({ specialAbilityManager } = {}) {
        this.specialAbilityManager = specialAbilityManager ?? new SpecialAbilityManager();
        /** @type {DamageResult[]} */
        this.results = [];
        /** @type {DamageContext['results']} */
        this.steps = {};
    }

    /**
     * Ricalcola tutti i risultati di danno.
     * @param {Object} options
     * @param {DamageContext['statsValues']} options.statsValues
     * @param {DamageContext['skillValues']} options.skillValues
     * @param {DamageContext['build']} options.build
     * @param {DamageContext['skillTrees']} [options.skillTrees]
     * @param {DamageContext['settings']} [options.settings]
     * @returns {DamageContext['results']}
     */
    recalculate({ statsValues, skillValues, build, skillTrees, settings }) {
        const context = createDamageContext({
            statsValues,
            skillValues,
            build,
            skillTrees,
            settings,
            specialAbilityManager: this.specialAbilityManager
        });
        this.steps = runDamagePipeline(context);
        this.applyEnergySummary();
        this.results = this.buildResults();
        return this.steps;
    }

    /**
     * Aggiunge ad Attack Speed & Energy le righe energetiche aggregate.
     */
    applyEnergySummary() {
        const attack = this.steps.attackSpeed;
        if (!attack) return;

        const burst = this.steps.burst;
        const burstEnergyPerSecond = burst?.energyPerSecond ?? attack.energyPerSecond;
        const maxEnergy = attack.maxEnergy;

        /** @type {Array<{enabled: boolean, dps: number, energyPerSecond: number}>} */
        const specialAbilities = this.steps.specialAttacks?.abilities ?? [];
        const enabledAbilities = specialAbilities.filter(ability => ability.enabled);
        const specialDps = enabledAbilities.reduce((sum, ability) => sum + ability.dps, 0);
        const specialEnergyPerSecond = enabledAbilities
            .reduce((sum, ability) => sum + ability.energyPerSecond, 0);

        const burstDps = burst?.enabled ? burst.burstDps : 0;
        const combustion = this.steps.crystalCombustion;
        const combustionDps = combustion?.enabled ? combustion.combustionDps : 0;
        const orbs = this.steps.supportOrbs;
        const orbDps = orbs?.enabled ? orbs.orbDps : 0;

        attack.dpsAll = attack.dps + burstDps + combustionDps + orbDps + specialDps;

        if (burst?.enabled) {
            attack.energyPerSecondAttackBurst = burstEnergyPerSecond;

            const burstEnergyState = computeEnergyState(burstEnergyPerSecond, maxEnergy);
            attack.sustainAttackBurst = getSustainLabel(burstEnergyState);
            attack.secondsToEmptyAttackBurst = burstEnergyState.secondsToEmpty;
        }

        if (enabledAbilities.length > 0) {
            attack.energyPerSecondAttackBurstSpecial = burstEnergyPerSecond - specialEnergyPerSecond;

            const combinedEnergyState = computeEnergyState(
                attack.energyPerSecondAttackBurstSpecial,
                maxEnergy
            );
            attack.sustainAttackBurstSpecial = getSustainLabel(combinedEnergyState);
            attack.secondsToEmptyAttackBurstSpecial = combinedEnergyState.secondsToEmpty;
        }
    }

    /**
     * Raggruppa i risultati per step, per il render a tendina.
     * @returns {Array<{id: string, label: string, results: DamageResult[]}>}
     */
    getStepGroups() {
        return DAMAGE_STEPS
            .filter(step => !step.isVisible || step.isVisible(this.steps[step.id]))
            .map(step => {
                const result = this.steps[step.id];
                const rows = result && step.toResults ? step.toResults(result) : [];

                return { id: step.id, label: step.label, results: rows };
            });
    }

    /**
     * Converte gli step in voci visualizzabili.
     * @returns {DamageResult[]}
     */
    buildResults() {
        return this.getStepGroups().flatMap(group => group.results);
    }

    /** @returns {DamageResult[]} */
    getResults() {
        return this.results;
    }

    /** @returns {DamageContext['results']} */
    getSteps() {
        return this.steps;
    }

    /** @returns {number|null} */
    getDps() {
        return this.steps.attackSpeed?.dpsAll ?? null;
    }
}
