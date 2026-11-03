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
     * @returns {DamageContext['results']}
     */
    recalculate({ statsValues, skillValues, build }) {
        const context = createDamageContext({ statsValues, skillValues, build });
        this.steps = runDamagePipeline(context);
        this.results = this.buildResults();
        return this.steps;
    }

    /**
     * Converte gli step in voci visualizzabili.
     * @returns {DamageResult[]}
     */
    buildResults() {
        return DAMAGE_STEPS.flatMap(step => {
            const result = this.steps[step.id];
            if (!result || !step.toResults) return [];
            return step.toResults(result);
        });
    }

    /** @returns {DamageResult[]} */
    getResults() {
        return this.results;
    }

    /** @returns {DamageContext['results']} */
    getSteps() {
        return this.steps;
    }
}
