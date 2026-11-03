import { createDamageContext, runDamagePipeline, DAMAGE_STEPS } from './damage/damagePipeline.js';

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
    constructor() {
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
     * @param {DamageContext['settings']} [options.settings]
     * @returns {DamageContext['results']}
     */
    recalculate({ statsValues, skillValues, build, settings }) {
        const context = createDamageContext({ statsValues, skillValues, build, settings });
        this.steps = runDamagePipeline(context);
        this.results = this.buildResults();
        return this.steps;
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
        if (this.steps.burst?.enabled) return this.steps.burst.totalDps;
        return this.steps.attackSpeed?.dps ?? null;
    }
}
