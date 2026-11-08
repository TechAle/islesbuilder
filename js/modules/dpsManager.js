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
        const specialEnergyPerSecond = enabledAbilities
            .reduce((sum, ability) => sum + ability.energyPerSecond, 0);

        attack.dpsAll = this.getDps() ?? 0;

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
        const augmentStep = DAMAGE_STEPS.find(step => step.id === 'augmentDamage');
        const augmentResult = this.steps.augmentDamage;
        const augmentRows = augmentResult && augmentStep?.toResults
            ? augmentStep.toResults(augmentResult)
            : [];

        const augmentFinalStep = DAMAGE_STEPS.find(step => step.id === 'augmentFinal');
        const augmentFinalResult = this.steps.augmentFinal;
        const augmentFinalRows = augmentFinalResult && augmentFinalStep?.toResults
            ? augmentFinalStep.toResults(augmentFinalResult)
            : [];

        return DAMAGE_STEPS
            .filter(step => step.id !== 'augmentDamage' && step.id !== 'augmentFinal')
            .filter(step => {
                const visible = !step.isVisible || step.isVisible(this.steps[step.id]);
                if (step.id === 'damageMultiplier') {
                    return visible || augmentRows.length > 0 || augmentFinalRows.length > 0;
                }
                return visible;
            })
            .map(step => {
                const result = this.steps[step.id];
                let rows = result && step.toResults ? step.toResults(result) : [];

                if (step.id === 'damageMultiplier') {
                    const finalLabels = new Set(['Damage Multiplier', 'Damage']);
                    const head = rows.filter(row => !finalLabels.has(row.label));
                    const tail = rows.filter(row => finalLabels.has(row.label));
                    rows = [...head, ...augmentFinalRows, ...augmentRows, ...tail];

                    if (augmentFinalResult && Number.isFinite(augmentFinalResult.damage)) {
                        rows = rows.map(row => row.label === 'Damage'
                            ? { ...row, value: augmentFinalResult.damage }
                            : row);
                    }
                }

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

    /**
     * @param {DamageContext['results']} steps
     * @returns {Array<{label: string, dps: number}>}
     */
    getDpsPartsFromSteps(steps) {
        return DAMAGE_STEPS.flatMap(step => {
            const result = steps[step.id];
            if (!result || !step.getDpsParts) return [];
            return step.getDpsParts(result);
        }).filter(part => Number.isFinite(part.dps) && part.dps > 0);
    }

    /**
     * Raccolta dei contributi DPS forniti dagli step.
     * @returns {Array<{label: string, dps: number}>}
     */
    getDpsParts() {
        return this.getDpsPartsFromSteps(this.steps);
    }

    /** @returns {number|null} */
    getDps() {
        const parts = this.getDpsParts();
        if (parts.length === 0) return null;
        return parts.reduce((sum, part) => sum + part.dps, 0);
    }

    /**
     * Ripartizione dell'Average DPS per componente.
     * @returns {{
     *   total: number,
     *   sources: Array<{label: string, dps: number, percent: number}>
     * }}
     */
    getDamageBreakdown() {
        const total = this.getDps() ?? 0;
        if (total <= 0) return { total: 0, sources: [] };

        const sources = this.getDpsParts()
            .map(part => ({
                label: part.label,
                dps: part.dps,
                percent: part.dps / total * 100
            }))
            .sort((a, b) => b.dps - a.dps);

        return { total, sources };
    }
}
